import { describe, expect, it } from 'vitest';
import { deobfuscateText } from '../../models/crypto';
import { getRoleById } from '../../models/role';
import { createAssessmentSession } from '../../services/assessmentEngineService';
import {
  buildShareCode,
  exportReportPdf,
  parseAndVerifyReportJson,
  serializeReportJson,
  triggerDownload,
  verifyShareCode,
} from '../../services/exportService';
import { loadQuestionBank } from '../../services/questionBankService';
import { determineVerdict, scoreAssessmentSession, scoreQuestion } from '../../services/scoringService';

describe('scoringService & exportService', () => {
  it('determines Ready, Borderline, and Needs Preparation verdicts cleanly', () => {
    expect(determineVerdict(80, 75)).toBe('Ready');
    expect(determineVerdict(70, 75)).toBe('Borderline');
    expect(determineVerdict(50, 75)).toBe('Needs Preparation');
  });

  it('scores MCQ, multi-select, SQL, code, and scenario questions accurately', async () => {
    const dev = getRoleById('dev')!;
    const bank = await loadQuestionBank('dev');

    const mcqQ = bank.questions.find((q) => q.type === 'mcq')!;
    const correctOpt = deobfuscateText(mcqQ.answerObfuscated!);
    const mcqPass = await scoreQuestion(mcqQ, {
      questionId: mcqQ.id,
      selectedOptionId: correctOpt,
      hintUsed: false,
      updatedAt: new Date().toISOString(),
    });
    expect(mcqPass.passed).toBe(true);
    expect(mcqPass.score).toBe(1);

    const codeQ = bank.questions.find((q) => q.type === 'code')!;
    const refCode = deobfuscateText(codeQ.referenceCodeObfuscated!);
    const codePass = await scoreQuestion(codeQ, {
      questionId: codeQ.id,
      codeResponse: refCode,
      hintUsed: false,
      updatedAt: new Date().toISOString(),
    });
    expect(codePass.passed).toBe(true);
    expect(codePass.score).toBe(1);

    const sqlQ = bank.questions.find((q) => q.type === 'sql')!;
    const refSql = deobfuscateText(sqlQ.referenceSqlObfuscated!);
    const sqlPass = await scoreQuestion(sqlQ, {
      questionId: sqlQ.id,
      sqlQuery: refSql,
      hintUsed: false,
      updatedAt: new Date().toISOString(),
    });
    expect(sqlPass.passed).toBe(true);

    const scenarioQ = bank.questions.find((q) => q.type === 'scenario')!;
    const scenarioPass = await scoreQuestion(scenarioQ, {
      questionId: scenarioQ.id,
      textResponse: `We should extract domain logic into a model, persistence into a service, safe DOM into a view, and sanitize user input properly to keep strict MVC separation clean and testable.`,
      hintUsed: false,
      updatedAt: new Date().toISOString(),
    });
    expect(scenarioPass.passed).toBe(true);
    expect(scenarioPass.needsManualReview).toBe(true);

    // Score full session & verify JSON round-trip + share code tamper detection
    const { session, questions } = createAssessmentSession({
      role: dev,
      levelId: 'junior',
      questionPool: bank.questions,
      candidateName: 'Nurul',
    });
    session.submittedAt = session.startedAt + 120_000;
    const report = await scoreAssessmentSession(dev, session, questions);
    expect(report.topicScores.length).toBe(4);
    expect(report.shareCode.startsWith('IX1.')).toBe(true);

    // Valid share code passes
    const validShare = verifyShareCode(report.shareCode);
    expect(validShare.valid).toBe(true);

    // Tampered share code fails
    const tampered = `${report.shareCode.slice(0, -1)}${report.shareCode.endsWith('a') ? 'b' : 'a'}`;
    const tamperedRes = verifyShareCode(tampered);
    expect(tamperedRes.valid).toBe(false);
    expect(verifyShareCode('BAD-FORMAT').valid).toBe(false);

    // JSON export -> re-import round-trip passes
    const exportedJson = serializeReportJson(report);
    const roundTrip = parseAndVerifyReportJson(exportedJson);
    expect(roundTrip.valid).toBe(true);
    if (roundTrip.valid) {
      expect(roundTrip.report.sessionId).toBe(report.sessionId);
    }

    // Tampered JSON fails checksum verification
    const mutatedJson = exportedJson.replace(`"overallScore": ${report.overallScore}`, '"overallScore": 99');
    const badJson = parseAndVerifyReportJson(mutatedJson);
    expect(badJson.valid).toBe(false);
    expect(parseAndVerifyReportJson('{broken').valid).toBe(false);

    // Direct buildShareCode helper check
    expect(buildShareCode(report)).toBe(report.shareCode);

    // Test multi-select and empty response scoring branches
    const multiQ = bank.questions.find((q) => q.type === 'multi')!;
    const multiKeys = deobfuscateText(multiQ.answerObfuscated!).split(',');
    expect(
      (
        await scoreQuestion(multiQ, {
          questionId: multiQ.id,
          selectedOptionIds: multiKeys,
          hintUsed: false,
          updatedAt: new Date().toISOString(),
        })
      ).passed,
    ).toBe(true);
    expect((await scoreQuestion(sqlQ, undefined)).passed).toBe(false);
    expect((await scoreQuestion(codeQ, undefined)).passed).toBe(false);
    expect((await scoreQuestion(scenarioQ, undefined)).passed).toBe(false);

    // Test PDF export & download trigger
    const pdfFilename = await exportReportPdf(report);
    expect(pdfFilename).toMatch(/^interviewx-dev-.*\.pdf$/);

    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => 'blob:mock';
    URL.revokeObjectURL = () => {};
    triggerDownload('test.json', '{}', 'application/json');
    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;
  });
});
