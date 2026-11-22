import { verifyAnswerHash } from '../models/crypto';
import type { AssessmentSession, Question, QuestionResponse } from '../models/question';
import type { AssessmentReport, QuestionScore, ReadinessVerdict, TopicScore } from '../models/report';
import { getRoleLevel, type RoleDefinition } from '../models/role';
import { runSandboxedCode } from './codeRunnerService';
import { buildShareCode } from './exportService';
import { verifySqlQuery } from './sqlRunnerService';

export function determineVerdict(overallScore: number, passMark: number): ReadinessVerdict {
  if (overallScore >= passMark) return 'Ready';
  if (overallScore >= passMark - 12) return 'Borderline';
  return 'Needs Preparation';
}

export async function scoreQuestion(
  question: Question,
  response?: QuestionResponse,
): Promise<QuestionScore> {
  const hintUsed = Boolean(response?.hintUsed);

  if (question.type === 'mcq') {
    const selected = response?.selectedOptionId ?? '';
    const passed = Boolean(selected && question.answerHash && verifyAnswerHash(question.id, selected, question.answerHash));
    return {
      questionId: question.id,
      topic: question.topic,
      type: question.type,
      prompt: question.prompt,
      score: passed ? 1 : 0,
      maxScore: 1,
      passed,
      feedback: selected
        ? passed
          ? 'Correct option selected.'
          : 'Selected option does not match the expected answer.'
        : 'No option selected.',
      explanation: question.explanation,
      hintUsed,
    };
  }

  if (question.type === 'multi') {
    const selected = response?.selectedOptionIds ?? [];
    const passed = Boolean(
      selected.length > 0 && question.answerHash && verifyAnswerHash(question.id, selected, question.answerHash),
    );
    return {
      questionId: question.id,
      topic: question.topic,
      type: question.type,
      prompt: question.prompt,
      score: passed ? 1 : 0,
      maxScore: 1,
      passed,
      feedback: selected.length
        ? passed
          ? 'All required options accurately selected.'
          : 'Selection set is incomplete or includes an incorrect option.'
        : 'No options selected.',
      explanation: question.explanation,
      hintUsed,
    };
  }

  if (question.type === 'sql') {
    const sql = response?.sqlQuery?.trim() ?? '';
    if (!sql || !question.datasetId || !question.expectedResult) {
      return {
        questionId: question.id,
        topic: question.topic,
        type: question.type,
        prompt: question.prompt,
        score: 0,
        maxScore: 1,
        passed: false,
        feedback: 'No SQL query submitted.',
        explanation: question.explanation,
        hintUsed,
      };
    }
    const res = await verifySqlQuery(question.datasetId, sql, question.expectedResult);
    return {
      questionId: question.id,
      topic: question.topic,
      type: question.type,
      prompt: question.prompt,
      score: res.passed ? 1 : 0,
      maxScore: 1,
      passed: res.passed,
      feedback: res.note,
      explanation: question.explanation,
      hintUsed,
    };
  }

  if (question.type === 'code') {
    const code = response?.codeResponse?.trim() ?? '';
    if (!code || !question.functionName || !question.testCases) {
      return {
        questionId: question.id,
        topic: question.topic,
        type: question.type,
        prompt: question.prompt,
        score: 0,
        maxScore: 1,
        passed: false,
        feedback: 'No code submitted.',
        explanation: question.explanation,
        hintUsed,
      };
    }
    const run = await runSandboxedCode(code, question.functionName, question.testCases);
    const ratio = run.totalCount > 0 ? run.passedCount / run.totalCount : 0;
    const passed = run.passedCount === run.totalCount && !run.error;
    return {
      questionId: question.id,
      topic: question.topic,
      type: question.type,
      prompt: question.prompt,
      score: Math.round(ratio * 100) / 100,
      maxScore: 1,
      passed,
      feedback: run.error
        ? run.error
        : `Passed ${run.passedCount} / ${run.totalCount} test cases.`,
      explanation: question.explanation,
      hintUsed,
    };
  }

  // Scenario: automated key-point & word-count estimate (flagged for Interviewer rubric review)
  const text = response?.textResponse?.trim() ?? '';
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const minWords = question.minWords ?? 20;
  const keyPoints = question.keyPoints ?? [];
  const lower = text.toLowerCase();
  const matched = keyPoints.filter((kp) => lower.includes(kp.toLowerCase()));
  const kpRatio = keyPoints.length > 0 ? matched.length / keyPoints.length : 0;
  const lengthFactor = Math.min(1, words / minWords);
  const score = words === 0 ? 0 : Math.round((kpRatio * 0.7 + lengthFactor * 0.3) * 100) / 100;
  const passed = score >= 0.6;

  return {
    questionId: question.id,
    topic: question.topic,
    type: question.type,
    prompt: question.prompt,
    score,
    maxScore: 1,
    passed,
    feedback:
      words === 0
        ? 'No scenario response written.'
        : `Matched ${matched.length}/${keyPoints.length} key concepts (${words} words). Recommended for Interviewer rubric review.`,
    explanation: question.explanation,
    hintUsed,
    needsManualReview: true,
  };
}

export async function scoreAssessmentSession(
  role: RoleDefinition,
  session: AssessmentSession,
  questions: readonly Question[],
): Promise<AssessmentReport> {
  const level = getRoleLevel(role, session.levelId);
  const questionScores: QuestionScore[] = [];

  for (const q of questions) {
    const qScore = await scoreQuestion(q, session.responses[q.id]);
    questionScores.push(qScore);
  }

  const topicScores: TopicScore[] = role.sections.map((section) => {
    const items = questionScores.filter((qs) => qs.topic === section.topic);
    const earned = items.reduce((sum, item) => sum + item.score, 0);
    const possible = items.length;
    const percentage = possible > 0 ? Math.round((earned / possible) * 100) : 0;
    return {
      topic: section.topic,
      weight: section.weight,
      earned: Math.round(earned * 100) / 100,
      possible,
      percentage,
    };
  });

  const weightedSum = topicScores.reduce((acc, t) => acc + t.percentage * t.weight, 0);
  const overallScore = Math.round(weightedSum);
  const verdict = determineVerdict(overallScore, level.passMark);
  const completedAt = new Date(session.submittedAt ?? Date.now()).toISOString();
  const elapsedMs = Math.max(0, (session.submittedAt ?? Date.now()) - session.startedAt);

  const reportBase: Omit<AssessmentReport, 'shareCode'> = {
    sessionId: session.sessionId,
    roleId: role.id,
    roleName: role.name,
    levelId: level.id,
    levelLabel: level.label,
    candidateName: session.candidateName || 'Candidate',
    completedAt,
    elapsedMs,
    durationMs: session.durationMs,
    passMark: level.passMark,
    overallScore,
    verdict,
    topicScores,
    questionScores,
    version: session.version,
  };

  const shareCode = buildShareCode(reportBase);
  return { ...reportBase, shareCode };
}
