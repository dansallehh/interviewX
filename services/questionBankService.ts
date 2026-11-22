import type { QuestionBank } from '../models/question';
import type { RoleId } from '../models/role';
import { validateQuestionBank } from './schemaValidatorService';

const bankCache = new Map<RoleId, QuestionBank>();

async function importRoleBank(roleId: RoleId): Promise<QuestionBank> {
  switch (roleId) {
    case 'fresh':
      return (await import('../data/questions/fresh.json')).default as unknown as QuestionBank;
    case 'senior':
      return (await import('../data/questions/senior.json')).default as unknown as QuestionBank;
    case 'pm':
      return (await import('../data/questions/pm.json')).default as unknown as QuestionBank;
    case 'dev':
      return (await import('../data/questions/dev.json')).default as unknown as QuestionBank;
    case 'sa':
      return (await import('../data/questions/sa.json')).default as unknown as QuestionBank;
    case 'qa':
      return (await import('../data/questions/qa.json')).default as unknown as QuestionBank;
    case 'dba':
      return (await import('../data/questions/dba.json')).default as unknown as QuestionBank;
  }
}

export async function loadQuestionBank(roleId: RoleId): Promise<QuestionBank> {
  const cached = bankCache.get(roleId);
  if (cached) return cached;

  const bank = await importRoleBank(roleId);
  const check = validateQuestionBank(bank);
  if (!check.valid) {
    throw new Error(`Invalid question bank for "${roleId}": ${check.errors.join('; ')}`);
  }

  bankCache.set(roleId, bank);
  return bank;
}

export function clearQuestionBankCache(): void {
  bankCache.clear();
}
