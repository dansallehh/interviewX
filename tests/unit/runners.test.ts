import { describe, expect, it } from 'vitest';
import { runSandboxedCode } from '../../services/codeRunnerService';
import { executeSqlQuery, verifySqlQuery } from '../../services/sqlRunnerService';

describe('sqlRunnerService & codeRunnerService', () => {
  it('executes valid SQL and detects column/row/syntax mismatches', async () => {
    const empty = await executeSqlQuery('employees', '   ');
    expect(empty.error).toContain('empty');

    const bad = await executeSqlQuery('employees', 'SELECT * FROM nonexistent_table;');
    expect(bad.error).toBeDefined();

    const verified = await verifySqlQuery(
      'employees',
      "SELECT COUNT(*) AS total_employees FROM employees WHERE city = 'Ipoh';",
      { columns: ['total_employees'], rows: [[4]], orderMatters: false },
    );
    expect(verified.passed).toBe(true);

    const wrongCols = await verifySqlQuery(
      'employees',
      "SELECT COUNT(*) AS wrong_col FROM employees WHERE city = 'Ipoh';",
      { columns: ['total_employees'], rows: [[4]], orderMatters: false },
    );
    expect(wrongCols.passed).toBe(false);
    expect(wrongCols.note).toContain('Column mismatch');
  });

  it('executes JavaScript test cases safely and handles missing functions or syntax errors', async () => {
    const empty = await runSandboxedCode('', 'add', [{ args: [1, 2], expected: 3 }]);
    expect(empty.error).toContain('empty');

    const ok = await runSandboxedCode(
      'function add(a, b) { return a + b; }',
      'add',
      [
        { args: [1, 2], expected: 3 },
        { args: [-5, 5], expected: 0 },
      ],
    );
    expect(ok.passedCount).toBe(2);
    expect(ok.error).toBeUndefined();

    const missingFn = await runSandboxedCode('function other() {}', 'add', [{ args: [1, 2], expected: 3 }]);
    expect(missingFn.error).toContain('was not found');

    const syntaxErr = await runSandboxedCode('function add( {', 'add', [{ args: [1, 2], expected: 3 }]);
    expect(syntaxErr.error).toBeDefined();
  });
});
