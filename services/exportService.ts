import { sha256Hex } from '../models/crypto';
import type {
  AssessmentReport,
  ReportExportEnvelope,
  ShareCodePayload,
} from '../models/report';

const SHARE_SIGNING_SECRET = 'IX-SHARE-HMAC-V1-2026';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (encoded.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function buildShareCode(report: Omit<AssessmentReport, 'shareCode'>): string {
  const topicMap: Record<string, number> = {};
  for (const t of report.topicScores) {
    topicMap[t.topic] = t.percentage;
  }

  const payload: ShareCodePayload = {
    v: 1,
    r: report.roleId,
    l: report.levelId,
    s: report.overallScore,
    p: report.verdict,
    d: report.completedAt.slice(0, 10),
    t: topicMap,
  };

  const encoded = toBase64Url(JSON.stringify(payload));
  const sig = sha256Hex(`${SHARE_SIGNING_SECRET}:${encoded}`).slice(0, 16);
  return `IX1.${encoded}.${sig}`;
}

export function verifyShareCode(
  code: string,
): { valid: true; payload: ShareCodePayload } | { valid: false; error: string } {
  const trimmed = code.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 3 || parts[0] !== 'IX1') {
    return { valid: false, error: 'Invalid share code format. Expected IX1.<payload>.<signature>.' };
  }

  const [, encoded, providedSig] = parts;
  const expectedSig = sha256Hex(`${SHARE_SIGNING_SECRET}:${encoded}`).slice(0, 16);
  if (providedSig !== expectedSig) {
    return { valid: false, error: 'Tamper detected: share code signature does not match payload.' };
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as Partial<ShareCodePayload>;
    if (parsed.v !== 1 || !parsed.r || typeof parsed.s !== 'number' || !parsed.p) {
      return { valid: false, error: 'Share code payload is incomplete.' };
    }
    return { valid: true, payload: parsed as ShareCodePayload };
  } catch {
    return { valid: false, error: 'Share code payload is corrupted.' };
  }
}

export function serializeReportJson(report: AssessmentReport): string {
  const canonicalReport = JSON.stringify(report);
  const checksum = sha256Hex(canonicalReport);
  const envelope: ReportExportEnvelope = {
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    report,
    checksum,
  };
  return JSON.stringify(envelope, null, 2);
}

export function parseAndVerifyReportJson(
  rawJson: string,
): { valid: true; report: AssessmentReport } | { valid: false; error: string } {
  let parsed: Partial<ReportExportEnvelope>;
  try {
    parsed = JSON.parse(rawJson) as Partial<ReportExportEnvelope>;
  } catch {
    return { valid: false, error: 'Invalid JSON syntax.' };
  }

  if (parsed.schemaVersion !== '1.0.0' || !parsed.report || typeof parsed.checksum !== 'string') {
    return { valid: false, error: 'Missing required export envelope fields (schemaVersion, report, checksum).' };
  }

  const expectedChecksum = sha256Hex(JSON.stringify(parsed.report));
  if (expectedChecksum !== parsed.checksum) {
    return {
      valid: false,
      error: 'Checksum mismatch: exported JSON report has been modified or corrupted.',
    };
  }

  return { valid: true, report: parsed.report };
}

export function triggerDownload(filename: string, content: BlobPart, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Lazy-loaded PDF generator (jspdf is code-split and never included in initial bundle).
 */
export async function exportReportPdf(report: AssessmentReport): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  let y = 48;
  const left = 44;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('InterviewX Assessment Readiness Report', left, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Candidate: ${report.candidateName}   |   Role: ${report.roleName} (${report.levelLabel})   |   Date: ${report.completedAt.slice(0, 10)}`,
    left,
    y,
  );
  y += 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(
    `Overall Score: ${report.overallScore}%   |   Pass Mark: ${report.passMark}%   |   Verdict: ${report.verdict}`,
    left,
    y,
  );
  y += 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Topic Breakdown', left, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const t of report.topicScores) {
    doc.text(
      `- ${t.topic} (weight ${Math.round(t.weight * 100)}%): ${t.percentage}% (${t.earned}/${t.possible})`,
      left + 8,
      y,
    );
    y += 15;
  }

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Shareable Verification Code', left, y);
  y += 14;
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  const codeLines = doc.splitTextToSize(report.shareCode, pageWidth - left * 2) as string[];
  doc.text(codeLines, left, y);
  y += codeLines.length * 11 + 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Question Summary', left, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (let i = 0; i < report.questionScores.length; i += 1) {
    const q = report.questionScores[i];
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
    const line = `Q${i + 1} [${q.topic}] (${q.passed ? 'PASS' : 'REVIEW'}): ${q.feedback}`;
    const wrapped = doc.splitTextToSize(line, pageWidth - left * 2) as string[];
    doc.text(wrapped, left, y);
    y += wrapped.length * 12 + 4;
  }

  const safeRole = report.roleId.replace(/[^a-z0-9]/gi, '');
  const filename = `interviewx-${safeRole}-${report.completedAt.slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}
