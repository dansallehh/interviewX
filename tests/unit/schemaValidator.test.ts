import { describe, expect, it } from 'vitest';
import freshProfile from '../../data/roles/fresh.json';
import freshBank from '../../data/questions/fresh.json';
import {
  validateQuestion,
  validateQuestionBank,
  validateRoleProfile,
} from '../../services/schemaValidatorService';

describe('schemaValidatorService', () => {
  it('accepts valid role profiles and rejects broken weight sums', () => {
    expect(validateRoleProfile(freshProfile).valid).toBe(true);
    expect(validateRoleProfile(null).valid).toBe(false);

    const badWeights = {
      ...freshProfile,
      sections: [
        { topic: 'A', weight: 0.5 },
        { topic: 'B', weight: 0.3 },
      ],
    };
    const res = validateRoleProfile(badWeights);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('sum to 1.0'))).toBe(true);
  });

  it('accepts valid question banks and catches malformed questions and duplicate IDs', () => {
    expect(validateQuestionBank(freshBank).valid).toBe(true);
    expect(validateQuestionBank(null).valid).toBe(false);
    expect(validateQuestionBank({ roleId: 'unknown', questions: [] }).valid).toBe(false);

    const duplicated = {
      ...freshBank,
      questions: [freshBank.questions[0], freshBank.questions[0]],
    };
    const dupRes = validateQuestionBank(duplicated);
    expect(dupRes.valid).toBe(false);
    expect(dupRes.errors.some((e) => e.includes('Duplicate question id'))).toBe(true);
  });

  it('validates type-specific requirements for mcq, sql, code, and scenario', () => {
    expect(validateQuestion(null).valid).toBe(false);
    const badMcq = validateQuestion({ id: 'x-1', role: 'fresh', levels: ['entry'], topic: 'T', difficulty: 'easy', type: 'mcq', prompt: 'Short?', explanation: 'Too', rubric: [] });
    expect(badMcq.valid).toBe(false);

    const badSql = validateQuestion({
      id: 'x-sql',
      role: 'fresh',
      levels: ['entry'],
      topic: 'Basic SQL',
      difficulty: 'easy',
      type: 'sql',
      prompt: 'Write a query selecting all columns.',
      explanation: 'Valid SQL explanation here.',
      rubric: [{ id: 'r1', label: 'Criteria 1', weight: 0.5 }, { id: 'r2', label: 'Criteria 2', weight: 0.5 }],
    });
    expect(badSql.valid).toBe(false);
    expect(badSql.errors.some((e) => e.includes('datasetId'))).toBe(true);

    const badCode = validateQuestion({
      id: 'x-code',
      role: 'dev',
      levels: ['junior'],
      topic: 'JS',
      difficulty: 'easy',
      type: 'code',
      prompt: 'Implement a helper function.',
      explanation: 'Valid code explanation here.',
      rubric: [{ id: 'r1', label: 'Criteria 1', weight: 0.5 }, { id: 'r2', label: 'Criteria 2', weight: 0.5 }],
    });
    expect(badCode.valid).toBe(false);

    const badScenario = validateQuestion({
      id: 'x-sc',
      role: 'pm',
      levels: ['mid'],
      topic: 'Risk',
      difficulty: 'easy',
      type: 'scenario',
      prompt: 'Explain your risk escalation approach.',
      explanation: 'Valid scenario explanation here.',
      rubric: [{ id: 'r1', label: 'Criteria 1', weight: 0.5 }, { id: 'r2', label: 'Criteria 2', weight: 0.5 }],
    });
    expect(badScenario.valid).toBe(false);
  });
});
