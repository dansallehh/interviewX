import type { Question, QuestionBank, RoleProfile } from '../models/question';
import { getRoleById } from '../models/role';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const VALID_TYPES = new Set(['mcq', 'multi', 'scenario', 'sql', 'code']);

export function validateRoleProfile(profile: unknown): ValidationResult {
  const errors: string[] = [];
  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Role profile must be an object.'] };
  }
  const p = profile as Partial<RoleProfile>;
  if (!p.id || typeof p.id !== 'string') errors.push('Missing role id.');
  if (!p.name || typeof p.name !== 'string') errors.push('Missing role name.');
  if (!p.rubricId || typeof p.rubricId !== 'string') errors.push('Missing rubricId.');
  if (!Array.isArray(p.levels) || p.levels.length === 0) {
    errors.push('Role profile must include at least one level.');
  }
  if (!Array.isArray(p.sections) || p.sections.length === 0) {
    errors.push('Role profile must include weighted sections.');
  } else {
    const sum = p.sections.reduce((acc, s) => acc + (typeof s.weight === 'number' ? s.weight : 0), 0);
    if (Math.abs(sum - 1.0) > 1e-6) {
      errors.push(`Section weights must sum to 1.0, got ${sum.toFixed(4)}.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateQuestion(q: unknown, expectedRole?: string): ValidationResult {
  const errors: string[] = [];
  if (!q || typeof q !== 'object') {
    return { valid: false, errors: ['Question must be an object.'] };
  }
  const item = q as Partial<Question>;
  if (!item.id || typeof item.id !== 'string') errors.push('Question missing id.');
  if (!item.role || (expectedRole && item.role !== expectedRole)) {
    errors.push(`Question ${item.id ?? '?'} has invalid or mismatched role.`);
  }
  if (!Array.isArray(item.levels) || item.levels.length === 0) {
    errors.push(`Question ${item.id ?? '?'} must target at least one level.`);
  }
  if (!item.topic || typeof item.topic !== 'string') {
    errors.push(`Question ${item.id ?? '?'} missing topic.`);
  }
  if (!item.difficulty || !VALID_DIFFICULTIES.has(item.difficulty)) {
    errors.push(`Question ${item.id ?? '?'} has invalid difficulty.`);
  }
  if (!item.type || !VALID_TYPES.has(item.type)) {
    errors.push(`Question ${item.id ?? '?'} has invalid type.`);
  }
  if (!item.prompt || item.prompt.trim().length < 12) {
    errors.push(`Question ${item.id ?? '?'} prompt is too short.`);
  }
  if (!item.explanation || item.explanation.trim().length < 10) {
    errors.push(`Question ${item.id ?? '?'} missing explanation.`);
  }
  if (!Array.isArray(item.rubric) || item.rubric.length < 2) {
    errors.push(`Question ${item.id ?? '?'} must include at least 2 rubric criteria.`);
  }

  if (item.type === 'mcq' || item.type === 'multi') {
    if (!Array.isArray(item.options) || item.options.length < 4) {
      errors.push(`Question ${item.id ?? '?'} (${item.type}) must have at least 4 options.`);
    }
    if (!item.answerHash || !/^[0-9a-f]{64}$/.test(item.answerHash)) {
      errors.push(`Question ${item.id ?? '?'} missing valid SHA-256 answerHash.`);
    }
  }

  if (item.type === 'sql') {
    if (!item.datasetId) errors.push(`SQL question ${item.id ?? '?'} missing datasetId.`);
    if (!item.expectedResult) errors.push(`SQL question ${item.id ?? '?'} missing expectedResult.`);
    if (!item.referenceSqlObfuscated) {
      errors.push(`SQL question ${item.id ?? '?'} missing referenceSqlObfuscated.`);
    }
  }

  if (item.type === 'code') {
    if (!item.functionName) errors.push(`Code question ${item.id ?? '?'} missing functionName.`);
    if (!Array.isArray(item.testCases) || item.testCases.length < 2) {
      errors.push(`Code question ${item.id ?? '?'} must have at least 2 testCases.`);
    }
  }

  if (item.type === 'scenario') {
    if (!Array.isArray(item.keyPoints) || item.keyPoints.length < 2) {
      errors.push(`Scenario question ${item.id ?? '?'} must define at least 2 keyPoints.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateQuestionBank(bank: unknown): ValidationResult {
  const errors: string[] = [];
  if (!bank || typeof bank !== 'object') {
    return { valid: false, errors: ['Question bank must be an object.'] };
  }
  const b = bank as Partial<QuestionBank>;
  if (!b.roleId || !getRoleById(b.roleId)) {
    errors.push(`Unknown roleId: ${String(b.roleId)}`);
  }
  if (!Array.isArray(b.questions) || b.questions.length === 0) {
    errors.push('Question bank must contain questions.');
    return { valid: false, errors };
  }

  const seenIds = new Set<string>();
  for (const q of b.questions) {
    const res = validateQuestion(q, b.roleId);
    errors.push(...res.errors);
    if (q?.id) {
      if (seenIds.has(q.id)) {
        errors.push(`Duplicate question id: ${q.id}`);
      }
      seenIds.add(q.id);
    }
  }

  return { valid: errors.length === 0, errors };
}
