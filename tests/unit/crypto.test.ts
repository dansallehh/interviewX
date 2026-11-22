import { describe, expect, it } from 'vitest';
import {
  canonicalizeAnswer,
  deobfuscateText,
  hashAnswerKey,
  obfuscateText,
  sha256Hex,
  verifyAnswerHash,
} from '../../models/crypto';

describe('crypto helpers', () => {
  it('computes standard FIPS 180-4 SHA-256 digests', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('canonicalizes and verifies single and multi-select answer keys order-independently', () => {
    expect(canonicalizeAnswer('q1', ' B ')).toBe('q1::b');
    expect(canonicalizeAnswer('q2', ['d', 'a', 'b'])).toBe('q2::a,b,d');

    const singleHash = hashAnswerKey('fresh-sql-05', 'b');
    expect(verifyAnswerHash('fresh-sql-05', 'B', singleHash)).toBe(true);
    expect(verifyAnswerHash('fresh-sql-05', 'a', singleHash)).toBe(false);

    const multiHash = hashAnswerKey('fresh-net-05', ['a', 'b', 'd']);
    expect(verifyAnswerHash('fresh-net-05', ['d', 'a', 'b'], multiHash)).toBe(true);
    expect(verifyAnswerHash('fresh-net-05', ['a', 'b'], multiHash)).toBe(false);
  });

  it('round-trips obfuscated text without mutating content', () => {
    const sql = "SELECT name, salary FROM employees WHERE department = 'Finance';";
    const encoded = obfuscateText(sql);
    expect(encoded).not.toContain('SELECT');
    expect(deobfuscateText(encoded)).toBe(sql);
  });
});
