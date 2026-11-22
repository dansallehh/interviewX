import { describe, expect, it } from 'vitest';
import { parseHash } from '../../services/routerService';

describe('Hash router parser', () => {
  it('routes empty hash and root to home', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
  });

  it('parses valid role and brief routes', () => {
    expect(parseHash('#/role/fresh')).toEqual({ name: 'role', roleId: 'fresh' });
    expect(parseHash('#/brief/dba')).toEqual({ name: 'brief', roleId: 'dba', levelId: undefined });
    expect(parseHash('#/brief/dba/senior')).toEqual({
      name: 'brief',
      roleId: 'dba',
      levelId: 'senior',
    });
    expect(parseHash('#/brief/dev?level=mid')).toEqual({
      name: 'brief',
      roleId: 'dev',
      levelId: 'mid',
    });
  });

  it('parses assess, report, and interviewer routes', () => {
    expect(parseHash('#/assess/sess-123')).toEqual({ name: 'assess', sessionId: 'sess-123' });
    expect(parseHash('#/report/sess-123')).toEqual({ name: 'report', sessionId: 'sess-123' });
    expect(parseHash('#/interviewer')).toEqual({ name: 'interviewer' });
  });

  it('routes invalid roles, levels, and unknown paths to not-found', () => {
    expect(parseHash('#/role/nonexistent')).toEqual({ name: 'not-found', path: '/role/nonexistent' });
    expect(parseHash('#/brief/fresh/invalid-level')).toEqual({
      name: 'not-found',
      path: '/brief/fresh/invalid-level',
    });
    expect(parseHash('#/something/random')).toEqual({
      name: 'not-found',
      path: '/something/random',
    });
  });
});
