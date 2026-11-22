import type { AssessmentSession, Question, QuestionResponse } from '../models/question';
import { getRoleLevel, type RoleDefinition } from '../models/role';
import { runSandboxedCode } from '../services/codeRunnerService';
import { verifySqlQuery } from '../services/sqlRunnerService';
import type { TimerSnapshot } from '../services/timerService';
import { clear, h } from './dom';

export interface AssessmentViewCallbacks {
  onSelectIndex: (index: number) => void;
  onUpdateResponse: (questionId: string, response: QuestionResponse) => void;
  onSubmit: () => void;
}

export interface AssessmentViewHandle {
  updateTimer: (snapshot: TimerSnapshot) => void;
  announceWarning: (message: string) => void;
  showTabConflict: (otherTabId: string) => void;
  showStorageWarning: (warning: string) => void;
}

function isAnswered(q: Question, res?: QuestionResponse): boolean {
  if (!res) return false;
  if (q.type === 'mcq') return Boolean(res.selectedOptionId);
  if (q.type === 'multi') return Boolean(res.selectedOptionIds && res.selectedOptionIds.length > 0);
  if (q.type === 'sql') return Boolean(res.sqlQuery && res.sqlQuery.trim().length > 0);
  if (q.type === 'code') return Boolean(res.codeResponse && res.codeResponse.trim().length > 0);
  return Boolean(res.textResponse && res.textResponse.trim().length > 0);
}

const DATASET_SCHEMAS: Record<'employees' | 'orders_ops', string> = {
  employees: 'Tables: employees(id, name, department, salary, city) · departments(dept_id, dept_name, cost_center)',
  orders_ops: 'Tables: customers(customer_id, full_name, tier, region) · orders(order_id, customer_id, status, total_amount, order_date)',
};

export function renderAssessmentView(
  container: HTMLElement,
  role: RoleDefinition,
  session: AssessmentSession,
  questions: readonly Question[],
  callbacks: AssessmentViewCallbacks,
): AssessmentViewHandle {
  clear(container);
  const level = getRoleLevel(role, session.levelId);
  const currentIdx = Math.min(Math.max(0, session.currentIndex), questions.length - 1);
  const question = questions[currentIdx];
  const existingResponse: QuestionResponse = session.responses[question.id] ?? {
    questionId: question.id,
    hintUsed: false,
    updatedAt: new Date().toISOString(),
  };

  const timerPill = h('div', {
    className: 'timer-pill',
    id: 'assessment-timer',
    ariaLabel: 'Time remaining',
  }, '--:--');

  const timerAlert = h('div', {
    className: 'notice notice-warn is-hidden',
    id: 'timer-live-alert',
    role: 'status',
    ariaLive: 'assertive',
  });

  const conflictBanner = h('div', {
    className: 'notice notice-danger is-hidden',
    id: 'tab-conflict-banner',
    role: 'alert',
  });

  const storageBanner = h('div', {
    className: 'notice notice-warn is-hidden',
    id: 'storage-warning-banner',
    role: 'status',
  });

  const answeredCount = questions.filter((q) => isAnswered(q, session.responses[q.id])).length;

  const topBar = h(
    'section',
    { className: 'assess-bar', dataset: { role: role.id }, ariaLabel: 'Assessment controls' },
    h(
      'div',
      { className: 'action-group' },
      h('span', { className: 'role-code' }, `${role.code} · ${level.label}`),
      h('span', { className: 'tag', id: 'assess-progress-tag' }, `${answeredCount} / ${questions.length} answered`),
    ),
    h(
      'div',
      { className: 'action-group' },
      timerPill,
      h(
        'button',
        {
          type: 'button',
          className: 'btn btn-role',
          id: 'btn-submit-assessment',
          onClick: () => callbacks.onSubmit(),
        },
        'Submit Assessment',
      ),
    ),
  );

  // Left question rail
  const railButtons = questions.map((q, idx) => {
    const answered = isAnswered(q, session.responses[q.id]);
    const active = idx === currentIdx;
    return h(
      'button',
      {
        type: 'button',
        className: `q-pill${answered ? ' is-answered' : ''}${active ? ' is-active' : ''}`,
        id: `q-nav-${idx + 1}`,
        ariaLabel: `Question ${idx + 1} (${q.topic})${answered ? ', answered' : ''}`,
        ariaCurrent: active ? 'step' : undefined,
        onClick: () => callbacks.onSelectIndex(idx),
      },
      `Q${idx + 1}`,
    );
  });

  const rail = h(
    'aside',
    { className: 'q-rail', ariaLabel: 'Question navigator' },
    h('span', { className: 'meta-label' }, 'Questions'),
    h('div', { className: 'q-rail-list' }, ...railButtons),
  );

  // Question card
  const responseArea = buildResponseArea(question, existingResponse, (updated) => {
    callbacks.onUpdateResponse(question.id, updated);
  });

  const hintDrawer = h(
    'div',
    { className: `notice${existingResponse.hintUsed ? '' : ' is-hidden'}`, id: 'question-hint-drawer' },
    question.hint ? `Hint: ${question.hint}` : '',
  );

  const hintBtn = question.hint
    ? h(
        'button',
        {
          type: 'button',
          className: 'btn btn-ghost',
          id: 'btn-show-hint',
          onClick: () => {
            hintDrawer.classList.remove('is-hidden');
            callbacks.onUpdateResponse(question.id, {
              ...existingResponse,
              hintUsed: true,
              updatedAt: new Date().toISOString(),
            });
          },
        },
        existingResponse.hintUsed ? 'Hint Shown' : 'Show Hint',
      )
    : null;

  const questionCard = h(
    'section',
    {
      className: 'panel panel-accent stack',
      dataset: { role: role.id },
      ariaLabelledBy: 'active-question-heading',
    },
    h(
      'div',
      { className: 'action-bar' },
      h(
        'div',
        { className: 'action-group' },
        h('span', { className: 'role-code' }, `Q${currentIdx + 1} of ${questions.length}`),
        h('span', { className: 'tag' }, question.topic),
        h('span', { className: 'tag' }, question.type.toUpperCase()),
        h('span', { className: 'tag' }, question.difficulty),
      ),
      hintBtn,
    ),
    h('h1', { className: 'role-title', id: 'active-question-heading' }, question.prompt),
    question.hint ? hintDrawer : null,
    responseArea,
    h(
      'div',
      { className: 'action-bar' },
      h(
        'button',
        {
          type: 'button',
          className: 'btn',
          id: 'btn-prev-question',
          disabled: currentIdx === 0,
          onClick: () => callbacks.onSelectIndex(currentIdx - 1),
        },
        '← Previous',
      ),
      currentIdx < questions.length - 1
        ? h(
            'button',
            {
              type: 'button',
              className: 'btn btn-primary',
              id: 'btn-next-question',
              onClick: () => callbacks.onSelectIndex(currentIdx + 1),
            },
            'Next Question →',
          )
        : h(
            'button',
            {
              type: 'button',
              className: 'btn btn-role',
              id: 'btn-finish-assessment',
              onClick: () => callbacks.onSubmit(),
            },
            'Finish & Score →',
          ),
    ),
  );

  const page = h(
    'div',
    { className: 'stack page-enter', dataset: { role: role.id } },
    topBar,
    conflictBanner,
    storageBanner,
    timerAlert,
    h('div', { className: 'assess-grid' }, rail, questionCard),
  );

  container.appendChild(page);

  return {
    updateTimer(snapshot: TimerSnapshot) {
      timerPill.textContent = snapshot.formatted;
      timerPill.classList.toggle('is-warning', snapshot.remainingMs <= 5 * 60 * 1000 && snapshot.remainingMs > 60 * 1000);
      timerPill.classList.toggle('is-urgent', snapshot.remainingMs <= 60 * 1000);
    },
    announceWarning(message: string) {
      timerAlert.textContent = message;
      timerAlert.classList.remove('is-hidden');
    },
    showTabConflict(otherTabId: string) {
      conflictBanner.textContent = `Warning: This assessment is also open in another browser tab (${otherTabId}). Close the duplicate tab to avoid overwriting answers.`;
      conflictBanner.classList.remove('is-hidden');
    },
    showStorageWarning(warning: string) {
      storageBanner.textContent = warning;
      storageBanner.classList.remove('is-hidden');
    },
  };
}

function buildResponseArea(
  question: Question,
  current: QuestionResponse,
  onSave: (next: QuestionResponse) => void,
): HTMLElement {
  if (question.type === 'mcq' && question.options) {
    const list = h('div', { className: 'option-list', role: 'radiogroup', ariaLabel: 'Answer choices' });
    for (const opt of question.options) {
      const checked = current.selectedOptionId === opt.id;
      const input = h('input', {
        type: 'radio',
        id: `opt-${question.id}-${opt.id}`,
        value: opt.id,
      }) as HTMLInputElement;
      input.name = `q-${question.id}`;
      input.checked = checked;

      const label = h(
        'label',
        {
          className: `option-card${checked ? ' is-selected' : ''}`,
          htmlFor: input.id,
        },
        input,
        h('span', null, `${opt.id.toUpperCase()}. ${opt.text}`),
      );

      input.addEventListener('change', () => {
        onSave({
          ...current,
          selectedOptionId: opt.id,
          updatedAt: new Date().toISOString(),
        });
      });

      list.appendChild(label);
    }
    return list;
  }

  if (question.type === 'multi' && question.options) {
    const selectedSet = new Set(current.selectedOptionIds ?? []);
    const list = h(
      'div',
      { className: 'stack-sm' },
      h('span', { className: 'meta-label' }, `Select all that apply (${question.minSelections ?? 2}+ expected)`),
    );
    const group = h('div', { className: 'option-list', role: 'group', ariaLabel: 'Multiple choice options' });

    for (const opt of question.options) {
      const checked = selectedSet.has(opt.id);
      const input = h('input', {
        type: 'checkbox',
        id: `opt-${question.id}-${opt.id}`,
        value: opt.id,
      }) as HTMLInputElement;
      input.checked = checked;

      const label = h(
        'label',
        {
          className: `option-card${checked ? ' is-selected' : ''}`,
          htmlFor: input.id,
        },
        input,
        h('span', null, `${opt.id.toUpperCase()}. ${opt.text}`),
      );

      input.addEventListener('change', () => {
        if (input.checked) selectedSet.add(opt.id);
        else selectedSet.delete(opt.id);
        onSave({
          ...current,
          selectedOptionIds: Array.from(selectedSet).sort(),
          updatedAt: new Date().toISOString(),
        });
      });

      group.appendChild(label);
    }
    list.appendChild(group);
    return list;
  }

  if (question.type === 'sql' && question.datasetId && question.expectedResult) {
    const datasetId = question.datasetId;
    const expected = question.expectedResult;
    const textarea = h('textarea', {
      id: 'sql-code-editor',
      className: 'code-editor',
      ariaLabel: 'SQL query editor',
    }) as HTMLTextAreaElement;
    textarea.spellcheck = false;
    textarea.value = current.sqlQuery ?? question.starterCode ?? '';

    const statusBox = h('div', { className: 'notice', id: 'sql-run-status', ariaLive: 'polite' },
      'Click "Run SQL" to execute your query against the in-browser SQLite dataset.',
    );
    const outputWrap = h('div', { className: 'result-table-wrap is-hidden', id: 'sql-output-wrap' });

    textarea.addEventListener('input', () => {
      onSave({
        ...current,
        sqlQuery: textarea.value,
        updatedAt: new Date().toISOString(),
      });
    });

    const runBtn = h(
      'button',
      {
        type: 'button',
        className: 'btn btn-primary',
        id: 'btn-run-sql',
        onClick: async () => {
          runBtn.textContent = 'Running...';
          runBtn.setAttribute('disabled', '');
          const res = await verifySqlQuery(datasetId, textarea.value, expected);
          runBtn.textContent = 'Run SQL';
          runBtn.removeAttribute('disabled');

          statusBox.className = `notice ${res.passed ? 'notice-success' : res.output.error ? 'notice-danger' : 'notice-warn'}`;
          statusBox.textContent = `${res.note} (${res.output.elapsedMs} ms)`;

          clear(outputWrap);
          if (res.output.columns.length > 0) {
            outputWrap.appendChild(buildOutputTable(res.output.columns, res.output.rows));
            outputWrap.classList.remove('is-hidden');
          } else {
            outputWrap.classList.add('is-hidden');
          }
        },
      },
      'Run SQL',
    );

    return h(
      'div',
      { className: 'stack-sm' },
      h('div', { className: 'notice' }, DATASET_SCHEMAS[datasetId]),
      textarea,
      h('div', { className: 'action-group' }, runBtn),
      statusBox,
      outputWrap,
    );
  }

  if (question.type === 'code' && question.functionName && question.testCases) {
    const fnName = question.functionName;
    const testCases = question.testCases;
    const textarea = h('textarea', {
      id: 'js-code-editor',
      className: 'code-editor',
      ariaLabel: 'JavaScript code editor',
    }) as HTMLTextAreaElement;
    textarea.spellcheck = false;
    textarea.value = current.codeResponse ?? question.starterCode ?? '';

    const statusBox = h('div', { className: 'notice', id: 'code-run-status', ariaLive: 'polite' },
      `Runs in an isolated Web Worker sandbox (1.5s timeout, no DOM/network access). Target function: ${fnName}.`,
    );
    const resultsWrap = h('div', { className: 'result-table-wrap is-hidden', id: 'code-output-wrap' });

    textarea.addEventListener('input', () => {
      onSave({
        ...current,
        codeResponse: textarea.value,
        updatedAt: new Date().toISOString(),
      });
    });

    const runBtn = h(
      'button',
      {
        type: 'button',
        className: 'btn btn-primary',
        id: 'btn-run-code',
        onClick: async () => {
          runBtn.textContent = 'Running Tests...';
          runBtn.setAttribute('disabled', '');
          const run = await runSandboxedCode(textarea.value, fnName, testCases);
          runBtn.textContent = 'Run Sandboxed Tests';
          runBtn.removeAttribute('disabled');

          const allPassed = run.passedCount === run.totalCount && !run.error;
          statusBox.className = `notice ${allPassed ? 'notice-success' : run.error ? 'notice-danger' : 'notice-warn'}`;
          statusBox.textContent = run.error
            ? run.error
            : `Passed ${run.passedCount} / ${run.totalCount} test cases (${run.elapsedMs} ms).`;

          clear(resultsWrap);
          if (run.results.length > 0) {
            const rows = run.results.map((r) => [
              `Case ${r.index + 1}`,
              r.passed ? 'PASS' : 'FAIL',
              JSON.stringify(r.expected),
              r.error ?? JSON.stringify(r.actual),
            ]);
            resultsWrap.appendChild(buildOutputTable(['Case', 'Status', 'Expected', 'Actual'], rows));
            resultsWrap.classList.remove('is-hidden');
          } else {
            resultsWrap.classList.add('is-hidden');
          }
        },
      },
      'Run Sandboxed Tests',
    );

    return h(
      'div',
      { className: 'stack-sm' },
      textarea,
      h('div', { className: 'action-group' }, runBtn),
      statusBox,
      resultsWrap,
    );
  }

  // Scenario free-text response (sanitised by textContent everywhere)
  const textarea = h('textarea', {
    id: 'scenario-editor',
    className: 'scenario-textarea',
    ariaLabel: 'Scenario written response',
  }) as HTMLTextAreaElement;
  textarea.placeholder = 'Write a structured, concise technical response...';
  textarea.value = current.textResponse ?? '';

  const wordCounter = h(
    'span',
    { className: 'meta-label', id: 'scenario-word-count' },
    `${countWords(textarea.value)} words (target ≥ ${question.minWords ?? 20})`,
  );

  textarea.addEventListener('input', () => {
    wordCounter.textContent = `${countWords(textarea.value)} words (target ≥ ${question.minWords ?? 20})`;
    onSave({
      ...current,
      textResponse: textarea.value,
      updatedAt: new Date().toISOString(),
    });
  });

  return h('div', { className: 'stack-sm' }, textarea, wordCounter);
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function buildOutputTable(
  columns: string[],
  rows: (string | number | null)[][],
): HTMLTableElement {
  const thead = h(
    'thead',
    null,
    h('tr', null, ...columns.map((c) => h('th', null, c))),
  );
  const tbody = h(
    'tbody',
    null,
    ...(rows.length === 0
      ? [h('tr', null, h('td', null, '0 rows returned.'))]
      : rows.map((r) =>
          h(
            'tr',
            null,
            ...r.map((cell) => h('td', null, cell === null ? 'NULL' : String(cell))),
          ),
        )),
  );
  return h('table', { className: 'data-table' }, thead, tbody);
}
