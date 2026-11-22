import { describe, expect, it } from 'vitest';
import { ROLES } from '../../models/role';
import { clearQuestionBankCache, loadQuestionBank } from '../../services/questionBankService';

describe('questionBankService', () => {
  it('lazy-loads and validates all 7 role question banks and caches results', async () => {
    clearQuestionBankCache();
    for (const role of ROLES) {
      const bank = await loadQuestionBank(role.id);
      expect(bank.roleId).toBe(role.id);
      expect(bank.questions.length).toBeGreaterThanOrEqual(24);
      // Cached second call returns same reference
      const cached = await loadQuestionBank(role.id);
      expect(cached).toBe(bank);
    }
  });
});
