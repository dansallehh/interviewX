import type { SqlExpectedResult } from '../models/question';

export interface SqlExecutionOutput {
  columns: string[];
  rows: (string | number | null)[][];
  elapsedMs: number;
  error?: string;
}

export interface SqlVerificationResult {
  passed: boolean;
  note: string;
  output: SqlExecutionOutput;
}

type SqlJsModule = {
  Database: new () => {
    run: (sql: string) => void;
    exec: (sql: string) => Array<{ columns: string[]; values: (string | number | null)[][] }>;
    close: () => void;
  };
};

let sqlModulePromise: Promise<SqlJsModule> | null = null;

async function getSqlModule(): Promise<SqlJsModule> {
  if (!sqlModulePromise) {
    sqlModulePromise = (async () => {
      const mod = await import('sql.js');
      const initSqlJs = mod.default ?? mod;
      const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
      return (await initSqlJs(
        isNode
          ? undefined
          : {
              locateFile: () => './sql-wasm.wasm',
            },
      )) as unknown as SqlJsModule;
    })();
  }
  return sqlModulePromise;
}

export async function loadDatasetSql(datasetId: 'employees' | 'orders_ops'): Promise<string> {
  if (datasetId === 'employees') {
    return (await import('../data/datasets/employees.sql?raw')).default;
  }
  return (await import('../data/datasets/orders_ops.sql?raw')).default;
}

export function normalizeSqlResult(
  columns: string[],
  rows: (string | number | null)[][],
  orderMatters: boolean,
): { columns: string[]; rows: (string | number | null)[][] } {
  const normCols = columns.map((c) => String(c).toLowerCase());
  const normRows = rows.map((row) =>
    row.map((cell) => (typeof cell === 'number' ? Math.round(cell * 100) / 100 : cell)),
  );
  if (!orderMatters) {
    normRows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return { columns: normCols, rows: normRows };
}

export async function executeSqlQuery(
  datasetId: 'employees' | 'orders_ops',
  candidateSql: string,
): Promise<SqlExecutionOutput> {
  const start = performance.now();
  const trimmed = candidateSql.trim();
  if (!trimmed) {
    return {
      columns: [],
      rows: [],
      elapsedMs: 0,
      error: 'SQL editor is empty. Enter a SELECT query to run.',
    };
  }

  const SQL = await getSqlModule();
  const seedSql = await loadDatasetSql(datasetId);
  const db = new SQL.Database();

  try {
    db.run(seedSql);
    const results = db.exec(trimmed);
    const elapsedMs = Math.max(0.1, Math.round((performance.now() - start) * 10) / 10);
    if (!results || results.length === 0) {
      return { columns: [], rows: [], elapsedMs };
    }
    const last = results[results.length - 1];
    return {
      columns: last.columns,
      rows: last.values,
      elapsedMs,
    };
  } catch (err) {
    const elapsedMs = Math.max(0.1, Math.round((performance.now() - start) * 10) / 10);
    return {
      columns: [],
      rows: [],
      elapsedMs,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    db.close();
  }
}

export async function verifySqlQuery(
  datasetId: 'employees' | 'orders_ops',
  candidateSql: string,
  expected: SqlExpectedResult,
): Promise<SqlVerificationResult> {
  const output = await executeSqlQuery(datasetId, candidateSql);
  if (output.error) {
    return { passed: false, note: `SQL error: ${output.error}`, output };
  }
  if (output.columns.length === 0) {
    return { passed: false, note: 'Query returned no result set.', output };
  }

  const actualNorm = normalizeSqlResult(output.columns, output.rows, expected.orderMatters);
  const expectedNorm = normalizeSqlResult(expected.columns, expected.rows, expected.orderMatters);

  if (JSON.stringify(actualNorm.columns) !== JSON.stringify(expectedNorm.columns)) {
    return {
      passed: false,
      note: `Column mismatch: expected [${expected.columns.join(', ')}], got [${output.columns.join(', ')}].`,
      output,
    };
  }
  if (JSON.stringify(actualNorm.rows) !== JSON.stringify(expectedNorm.rows)) {
    return {
      passed: false,
      note: `Result mismatch: expected ${expected.rows.length} row(s) matching specification, got ${output.rows.length}.`,
      output,
    };
  }

  return {
    passed: true,
    note: `Exact result match (${output.rows.length} row${output.rows.length === 1 ? '' : 's'}).`,
    output,
  };
}
