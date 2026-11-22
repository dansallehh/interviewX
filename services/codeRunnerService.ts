import type { CodeTestCase } from '../models/question';

export interface CodeTestCaseResult {
  index: number;
  passed: boolean;
  expected: unknown;
  actual?: unknown;
  error?: string;
}

export interface CodeRunResult {
  passedCount: number;
  totalCount: number;
  results: CodeTestCaseResult[];
  elapsedMs: number;
  timedOut: boolean;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 1500;
const MAX_SERIALIZED_RESULT_BYTES = 64 * 1024;

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildSandboxWorkerSource(): string {
  return `
    'use strict';
    // Lock down network and dynamic import APIs inside isolated worker
    try { self.fetch = undefined; } catch {}
    try { self.XMLHttpRequest = undefined; } catch {}
    try { self.WebSocket = undefined; } catch {}
    try { self.EventSource = undefined; } catch {}
    try { self.importScripts = undefined; } catch {}

    self.onmessage = function (ev) {
      const { code, functionName, testCases, maxBytes } = ev.data;
      const start = performance.now();
      try {
        const factory = new Function('"use strict";\\n' + code + '\\nreturn typeof ' + functionName + ' === "function" ? ' + functionName + ' : null;');
        const fn = factory();
        if (typeof fn !== 'function') {
          self.postMessage({
            error: 'Function "' + functionName + '" was not found. Make sure it is declared with that exact name.',
            elapsedMs: performance.now() - start,
            results: [],
          });
          return;
        }

        const results = [];
        for (let i = 0; i < testCases.length; i++) {
          const tc = testCases[i];
          try {
            const clonedArgs = JSON.parse(JSON.stringify(tc.args));
            const actual = fn.apply(null, clonedArgs);
            const serialized = JSON.stringify(actual);
            if (serialized && serialized.length > maxBytes) {
              results.push({ index: i, passed: false, expected: tc.expected, error: 'Output exceeded memory guard limit.' });
              continue;
            }
            const passed = serialized === JSON.stringify(tc.expected);
            results.push({ index: i, passed, expected: tc.expected, actual });
          } catch (err) {
            results.push({ index: i, passed: false, expected: tc.expected, error: err && err.message ? err.message : String(err) });
          }
        }
        self.postMessage({
          elapsedMs: Math.max(0.1, Math.round((performance.now() - start) * 10) / 10),
          results,
        });
      } catch (err) {
        self.postMessage({
          error: err && err.message ? err.message : String(err),
          elapsedMs: Math.max(0.1, Math.round((performance.now() - start) * 10) / 10),
          results: [],
        });
      }
    };
  `;
}

function runInMemoryFallback(
  code: string,
  functionName: string,
  testCases: readonly CodeTestCase[],
): CodeRunResult {
  const start = performance.now();
  try {
    const factory = new Function(
      `"use strict";\n${code}\nreturn typeof ${functionName} === 'function' ? ${functionName} : null;`,
    );
    const fn = factory() as ((...args: unknown[]) => unknown) | null;
    if (typeof fn !== 'function') {
      return {
        passedCount: 0,
        totalCount: testCases.length,
        results: [],
        elapsedMs: Math.max(0.1, Math.round((performance.now() - start) * 10) / 10),
        timedOut: false,
        error: `Function "${functionName}" was not found.`,
      };
    }

    const results: CodeTestCaseResult[] = testCases.map((tc, index) => {
      try {
        const clonedArgs = JSON.parse(JSON.stringify(tc.args)) as unknown[];
        const actual = fn(...clonedArgs);
        return {
          index,
          passed: deepEqual(actual, tc.expected),
          expected: tc.expected,
          actual,
        };
      } catch (err) {
        return {
          index,
          passed: false,
          expected: tc.expected,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });

    return {
      passedCount: results.filter((r) => r.passed).length,
      totalCount: testCases.length,
      results,
      elapsedMs: Math.max(0.1, Math.round((performance.now() - start) * 10) / 10),
      timedOut: false,
    };
  } catch (err) {
    return {
      passedCount: 0,
      totalCount: testCases.length,
      results: [],
      elapsedMs: Math.max(0.1, Math.round((performance.now() - start) * 10) / 10),
      timedOut: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runSandboxedCode(
  code: string,
  functionName: string,
  testCases: readonly CodeTestCase[],
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<CodeRunResult> {
  if (!code.trim()) {
    return {
      passedCount: 0,
      totalCount: testCases.length,
      results: [],
      elapsedMs: 0,
      timedOut: false,
      error: 'Code editor is empty.',
    };
  }

  // In non-Worker environments (e.g., jsdom unit tests), fall back cleanly.
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return runInMemoryFallback(code, functionName, testCases);
  }

  return new Promise<CodeRunResult>((resolve) => {
    const blob = new Blob([buildSandboxWorkerSource()], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    const cleanup = () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };

    const timer = window.setTimeout(() => {
      cleanup();
      resolve({
        passedCount: 0,
        totalCount: testCases.length,
        results: [],
        elapsedMs: timeoutMs,
        timedOut: true,
        error: `Execution timed out after ${timeoutMs} ms (possible infinite loop).`,
      });
    }, timeoutMs);

    worker.onmessage = (ev: MessageEvent<{ results?: CodeTestCaseResult[]; elapsedMs?: number; error?: string }>) => {
      window.clearTimeout(timer);
      cleanup();
      const results = ev.data.results ?? [];
      resolve({
        passedCount: results.filter((r) => r.passed).length,
        totalCount: testCases.length,
        results,
        elapsedMs: ev.data.elapsedMs ?? 0,
        timedOut: false,
        error: ev.data.error,
      });
    };

    worker.onerror = (err) => {
      window.clearTimeout(timer);
      cleanup();
      resolve({
        passedCount: 0,
        totalCount: testCases.length,
        results: [],
        elapsedMs: 0,
        timedOut: false,
        error: err.message || 'Sandbox execution error.',
      });
    };

    worker.postMessage({
      code,
      functionName,
      testCases,
      maxBytes: MAX_SERIALIZED_RESULT_BYTES,
    });
  });
}
