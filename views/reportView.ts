import type { AssessmentReport, ReadinessVerdict } from '../models/report';
import {
  exportReportPdf,
  parseAndVerifyReportJson,
  serializeReportJson,
  triggerDownload,
  verifyShareCode,
} from '../services/exportService';
import { formatRemainingTime } from '../services/timerService';
import { clear, h } from './dom';
import { renderRadarChart } from './radarChartView';

export interface ReportViewCallbacks {
  onRetake: () => void;
  onGoHome: () => void;
  onImportValidReport: (report: AssessmentReport) => void;
}

function verdictClass(verdict: ReadinessVerdict): string {
  if (verdict === 'Ready') return 'verdict-badge verdict-ready';
  if (verdict === 'Borderline') return 'verdict-badge verdict-borderline';
  return 'verdict-badge verdict-needs';
}

export function renderReportView(
  container: HTMLElement,
  report: AssessmentReport,
  callbacks: ReportViewCallbacks,
): void {
  clear(container);

  const exportStatus = h('div', {
    className: 'notice is-hidden',
    id: 'report-export-status',
    ariaLive: 'polite',
  });

  const pdfBtn = h(
    'button',
    {
      type: 'button',
      className: 'btn btn-role',
      id: 'btn-export-pdf',
      onClick: async () => {
        pdfBtn.textContent = 'Generating PDF...';
        pdfBtn.setAttribute('disabled', '');
        try {
          const filename = await exportReportPdf(report);
          exportStatus.className = 'notice notice-success';
          exportStatus.textContent = `Downloaded PDF report: ${filename}`;
        } catch (err) {
          exportStatus.className = 'notice notice-danger';
          exportStatus.textContent = `PDF export failed: ${err instanceof Error ? err.message : String(err)}`;
        } finally {
          pdfBtn.textContent = 'Export PDF';
          pdfBtn.removeAttribute('disabled');
        }
      },
    },
    'Export PDF',
  );

  const jsonExportBtn = h(
    'button',
    {
      type: 'button',
      className: 'btn',
      id: 'btn-export-json',
      onClick: () => {
        const json = serializeReportJson(report);
        const filename = `interviewx-${report.roleId}-${report.completedAt.slice(0, 10)}.json`;
        triggerDownload(filename, json, 'application/json');
        exportStatus.className = 'notice notice-success';
        exportStatus.textContent = `Exported checksummed JSON: ${filename}`;
      },
    },
    'Export JSON (Checksummed)',
  );

  // Share Code Verification Panel
  const copyShareBtn = h(
    'button',
    {
      type: 'button',
      className: 'btn',
      id: 'btn-copy-share-code',
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(report.shareCode);
          copyShareBtn.textContent = 'Copied!';
          window.setTimeout(() => {
            copyShareBtn.textContent = 'Copy Share Code';
          }, 2000);
        } catch {
          copyShareBtn.textContent = 'Select Code Above';
        }
      },
    },
    'Copy Share Code',
  );

  const verifyInput = h('input', {
    type: 'text',
    id: 'share-code-verify-input',
    className: 'text-input',
    ariaLabel: 'Paste share code to verify integrity',
  }) as HTMLInputElement;
  verifyInput.placeholder = 'Paste IX1... share code to verify';

  const verifyResult = h('div', {
    className: 'notice is-hidden',
    id: 'share-code-verify-result',
    ariaLive: 'polite',
  });

  const verifyBtn = h(
    'button',
    {
      type: 'button',
      className: 'btn',
      id: 'btn-verify-share-code',
      onClick: () => {
        const check = verifyShareCode(verifyInput.value);
        if (check.valid) {
          verifyResult.className = 'notice notice-success';
          verifyResult.textContent = `Verified authentic code: ${check.payload.r.toUpperCase()} (${check.payload.l}) · ${check.payload.s}% · ${check.payload.p} (${check.payload.d}).`;
        } else {
          verifyResult.className = 'notice notice-danger';
          verifyResult.textContent = check.error;
        }
      },
    },
    'Verify Code',
  );

  // JSON Round-Trip Re-import Verifier
  const importTextarea = h('textarea', {
    id: 'json-import-input',
    className: 'code-editor',
    ariaLabel: 'Paste exported JSON report to verify checksum and import',
  }) as HTMLTextAreaElement;
  importTextarea.placeholder = 'Paste an exported InterviewX JSON envelope here to verify its SHA-256 checksum...';

  const importStatus = h('div', {
    className: 'notice is-hidden',
    id: 'json-import-status',
    ariaLive: 'polite',
  });

  const importBtn = h(
    'button',
    {
      type: 'button',
      className: 'btn',
      id: 'btn-import-json',
      onClick: () => {
        const res = parseAndVerifyReportJson(importTextarea.value);
        if (res.valid) {
          importStatus.className = 'notice notice-success';
          importStatus.textContent = `Checksum verified for ${res.report.roleName} (${res.report.overallScore}%).`;
          callbacks.onImportValidReport(res.report);
        } else {
          importStatus.className = 'notice notice-danger';
          importStatus.textContent = res.error;
        }
      },
    },
    'Verify & Import JSON',
  );

  // Topic breakdown table
  const topicRows = report.topicScores.map((t) =>
    h(
      'tr',
      null,
      h('td', null, t.topic),
      h('td', null, `${Math.round(t.weight * 100)}%`),
      h('td', null, `${t.earned} / ${t.possible}`),
      h('td', null, `${t.percentage}%`),
    ),
  );

  const topicTable = h(
    'div',
    { className: 'result-table-wrap' },
    h(
      'table',
      { className: 'data-table' },
      h(
        'thead',
        null,
        h('tr', null, h('th', null, 'Topic'), h('th', null, 'Weight'), h('th', null, 'Score'), h('th', null, 'Pct')),
      ),
      h('tbody', null, ...topicRows),
    ),
  );

  // Question review list
  const reviewItems = report.questionScores.map((q, idx) =>
    h(
      'article',
      { className: 'review-card' },
      h(
        'div',
        { className: 'action-bar' },
        h(
          'div',
          { className: 'action-group' },
          h('span', { className: 'role-code' }, `Q${idx + 1}`),
          h('span', { className: 'tag' }, q.topic),
          h('span', { className: 'tag' }, q.type.toUpperCase()),
        ),
        h(
          'span',
          { className: q.passed ? 'verdict-badge verdict-ready' : 'verdict-badge verdict-needs' },
          q.passed ? 'Pass' : 'Review',
        ),
      ),
      h('strong', null, q.prompt),
      h('p', { className: 'role-tagline' }, `Result: ${q.feedback}`),
      h('p', { className: 'role-tagline' }, `Explanation: ${q.explanation}`),
    ),
  );

  const page = h(
    'div',
    { className: 'stack page-enter', dataset: { role: report.roleId } },
    h(
      'section',
      { className: 'panel panel-accent stack', ariaLabelledBy: 'report-heading' },
      h(
        'div',
        { className: 'action-bar' },
        h('span', { className: 'role-code' }, `${report.roleName} · ${report.levelLabel}`),
        h('span', { className: verdictClass(report.verdict), id: 'report-verdict' }, report.verdict),
      ),
      h(
        'div',
        { className: 'stack-sm' },
        h('h1', { className: 'hero-title', id: 'report-heading' }, `${report.overallScore}% Overall Readiness`),
        h(
          'p',
          { className: 'hero-lead' },
          `Candidate: ${report.candidateName} · Pass mark: ${report.passMark}% · Time taken: ${formatRemainingTime(report.elapsedMs)}`,
        ),
      ),
      h(
        'div',
        { className: 'action-group' },
        pdfBtn,
        jsonExportBtn,
        h(
          'button',
          { type: 'button', className: 'btn', id: 'btn-retake', onClick: () => callbacks.onRetake() },
          'Retake (Fresh Questions)',
        ),
        h(
          'button',
          { type: 'button', className: 'btn btn-ghost', onClick: () => callbacks.onGoHome() },
          'All Roles',
        ),
      ),
      exportStatus,
    ),
    h(
      'div',
      { className: 'split-grid' },
      h(
        'section',
        { className: 'panel stack-sm' },
        h('h2', { className: 'role-title' }, 'Competency Radar'),
        h('div', { className: 'radar-wrap' }, renderRadarChart(report.topicScores, report.passMark)),
      ),
      h(
        'section',
        { className: 'panel stack-sm' },
        h('h2', { className: 'role-title' }, 'Weighted Topic Breakdown'),
        topicTable,
        h(
          'div',
          { className: 'share-box' },
          h('span', { className: 'meta-label' }, 'Signed Shareable Result Code'),
          h('pre', { className: 'share-code-pre', id: 'report-share-code' }, report.shareCode),
          h('div', { className: 'action-group' }, copyShareBtn),
          h('div', { className: 'action-group' }, verifyInput, verifyBtn),
          verifyResult,
        ),
      ),
    ),
    h(
      'section',
      { className: 'panel stack-sm' },
      h('h2', { className: 'role-title' }, 'Verify & Re-Import Checksummed JSON'),
      importTextarea,
      h('div', { className: 'action-group' }, importBtn),
      importStatus,
    ),
    h(
      'section',
      { className: 'panel stack' },
      h('h2', { className: 'role-title' }, 'Question-by-Question Review'),
      ...reviewItems,
    ),
  );

  container.appendChild(page);
}
