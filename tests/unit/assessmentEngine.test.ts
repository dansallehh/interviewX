import { describe, expect, it } from 'vitest';
import { getRoleById } from '../../models/role';
import {
  computeTopicQuotas,
  createAssessmentSession,
  selectWeightedQuestions,
  shuffleArray,
} from '../../services/assessmentEngineService';
import { loadQuestionBank } from '../../services/questionBankService';

function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('assessmentEngineService', () => {
  it('computes exact weighted quotas summing to totalQuestions', () => {
    const quotas = computeTopicQuotas(
      [
        { topic: 'A', weight: 0.35 },
        { topic: 'B', weight: 0.25 },
        { topic: 'C', weight: 0.2 },
        { topic: 'D', weight: 0.2 },
      ],
      10,
    );
    expect(quotas.reduce((sum, q) => sum + q.count, 0)).toBe(10);
    expect(quotas.find((q) => q.topic === 'A')?.count).toBe(4);
  });

  it('shuffles deterministically without mutating original array', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out1 = shuffleArray(input, seededRng(42));
    const out2 = shuffleArray(input, seededRng(42));
    expect(out1).toEqual(out2);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out1].sort()).toEqual(input);
  });

  it('builds weighted tests and avoids repeated questions across attempts when 2x pool allows', async () => {
    const dba = getRoleById('dba')!;
    const bank = await loadQuestionBank('dba');

    const attempt1 = selectWeightedQuestions(dba, 'standard', bank.questions, [], seededRng(10));
    expect(attempt1.length).toBe(8);

    const seenIds = attempt1.map((q) => q.id);
    const attempt2 = selectWeightedQuestions(dba, 'standard', bank.questions, seenIds, seededRng(99));
    expect(attempt2.length).toBe(8);

    const overlap = attempt2.filter((q) => seenIds.includes(q.id));
    expect(overlap.length).toBe(0);
  });

  it('falls back gracefully when all pool questions have been seen', async () => {
    const fresh = getRoleById('fresh')!;
    const bank = await loadQuestionBank('fresh');
    const allIds = bank.questions.map((q) => q.id);

    const retake = selectWeightedQuestions(fresh, 'entry', bank.questions, allIds, seededRng(7));
    expect(retake.length).toBe(8);
  });

  it('throws when pool cannot satisfy topic quota', () => {
    const pm = getRoleById('pm')!;
    expect(() => selectWeightedQuestions(pm, 'mid', [], [], seededRng(1))).toThrow(
      /Insufficient questions/,
    );
  });

  it('creates an AssessmentSession with accommodation multiplier applied to duration & deadline', async () => {
    const dev = getRoleById('dev')!;
    const bank = await loadQuestionBank('dev');
    const now = 1_700_000_000_000;

    const { session, questions } = createAssessmentSession({
      role: dev,
      levelId: 'junior',
      questionPool: bank.questions,
      candidateName: '  Aisyah  ',
      accommodationMultiplier: 1.5,
      nowMs: now,
      rng: seededRng(5),
    });

    expect(questions.length).toBe(8);
    expect(session.candidateName).toBe('Aisyah');
    expect(session.accommodationMultiplier).toBe(1.5);
    expect(session.durationMs).toBe(Math.round(35 * 60 * 1000 * 1.5));
    expect(session.deadlineAt).toBe(now + session.durationMs);
    expect(session.status).toBe('in_progress');
  });
});
