import { describe, expect, it } from 'vitest';
import { getRoleById, getRoleLevel, ROLES } from '../../models/role';

describe('Role model', () => {
  it('defines exactly 8 distinct roles matching the required IDs', () => {
    const ids = ROLES.map((r) => r.id);
    expect(ids).toEqual(['fresh', 'senior', 'pm', 'dev', 'sa', 'qa', 'dba', 'ba']);
    expect(new Set(ids).size).toBe(8);
  });

  it('has section weights summing to 1.0 for every role', () => {
    for (const role of ROLES) {
      const sum = role.sections.reduce((acc, s) => acc + s.weight, 0);
      expect(sum).toBeCloseTo(1.0, 6);
    }
  });

  it('resolves roles and falls back to the first level when levelId is omitted', () => {
    const dba = getRoleById('dba');
    expect(dba).toBeDefined();
    expect(dba?.name).toContain('Oracle 12c');
    expect(getRoleLevel(dba!).id).toBe('standard');
    expect(getRoleLevel(dba!, 'senior').id).toBe('senior');
    expect(getRoleById('unknown')).toBeUndefined();
  });
});
