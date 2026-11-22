import { deobfuscateText } from '../models/crypto';
import type { Question } from '../models/question';
import { ROLES, type RoleId } from '../models/role';
import { triggerDownload } from '../services/exportService';
import { loadQuestionBank } from '../services/questionBankService';
import { clear, h } from './dom';

const DEFAULT_PIN = '2026';

export interface InterviewerState {
  unlocked: boolean;
  selectedRoleId: RoleId;
  rubricChecks: Record<string, boolean>;
  notes: Record<string, string>;
}

export function renderInterviewerView(
  container: HTMLElement,
  state: InterviewerState,
  onStateChange: (next: InterviewerState) => void,
): void {
  clear(container);

  if (!state.unlocked) {
    const pinInput = h('input', {
      id: 'interviewer-pin-input',
      type: 'password',
      className: 'text-input',
      ariaLabel: 'Interviewer access PIN',
    }) as HTMLInputElement;
    pinInput.placeholder = 'Enter PIN (default: 2026)';

    const errorBox = h('div', {
      className: 'notice notice-danger is-hidden',
      id: 'interviewer-pin-error',
      role: 'alert',
    });

    const unlock = () => {
      if (pinInput.value.trim() === DEFAULT_PIN) {
        onStateChange({ ...state, unlocked: true });
      } else {
        errorBox.textContent = 'Incorrect PIN. Demo default PIN is 2026.';
        errorBox.classList.remove('is-hidden');
      }
    };

    pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') unlock();
    });

    const gate = h(
      'section',
      { className: 'panel stack page-enter', ariaLabelledBy: 'interviewer-gate-heading' },
      h('span', { className: 'eyebrow' }, 'Interviewer & Supervisor Mode'),
      h('h1', { className: 'hero-title', id: 'interviewer-gate-heading' }, 'Unlock Reference Keys & Live Rubric'),
      h(
        'p',
        { className: 'hero-lead' },
        'Inspect role-specific rubrics, de-obfuscated reference answers/SQL/code, record structured observation notes, and export evaluation summaries.',
      ),
      h(
        'div',
        { className: 'notice notice-warn' },
        'Static-Site Security Note: Because InterviewX has no backend server, this PIN deters casual peeking during shared-screen sessions but cannot stop determined DevTools inspection.',
      ),
      h(
        'div',
        { className: 'action-group' },
        h('label', { htmlFor: 'interviewer-pin-input', className: 'sr-only' }, 'Interviewer PIN'),
        pinInput,
        h(
          'button',
          {
            type: 'button',
            className: 'btn btn-primary',
            id: 'btn-unlock-interviewer',
            onClick: unlock,
          },
          'Unlock Panel',
        ),
      ),
      errorBox,
    );

    container.appendChild(gate);
    return;
  }

  const roleSelect = h(
    'select',
    {
      id: 'interviewer-role-select',
      className: 'select-input',
      ariaLabel: 'Select role bank to supervise',
      onChange: (e) => {
        const val = (e.target as HTMLSelectElement).value as RoleId;
        onStateChange({ ...state, selectedRoleId: val });
      },
    },
    ...ROLES.map((r) => {
      const opt = h('option', { value: r.id }, `${r.code} · ${r.name}`) as HTMLOptionElement;
      opt.selected = r.id === state.selectedRoleId;
      return opt;
    }),
  );

  const bankContainer = h('div', { className: 'stack', id: 'interviewer-bank-list' }, h('p', null, 'Loading question bank...'));

  const exportBtn = h(
    'button',
    {
      type: 'button',
      className: 'btn btn-primary',
      id: 'btn-export-interviewer-notes',
      onClick: () => {
        const payload = {
          exportedAt: new Date().toISOString(),
          roleId: state.selectedRoleId,
          rubricChecks: state.rubricChecks,
          notes: state.notes,
        };
        triggerDownload(
          `interviewx-supervision-${state.selectedRoleId}-${new Date().toISOString().slice(0, 10)}.json`,
          JSON.stringify(payload, null, 2),
          'application/json',
        );
      },
    },
    'Export Supervision Notes (.json)',
  );

  const lockBtn = h(
    'button',
    {
      type: 'button',
      className: 'btn btn-ghost',
      id: 'btn-lock-interviewer',
      onClick: () => onStateChange({ ...state, unlocked: false }),
    },
    'Lock Panel',
  );

  const page = h(
    'div',
    { className: 'stack page-enter', dataset: { role: state.selectedRoleId } },
    h(
      'section',
      { className: 'panel panel-accent stack', ariaLabelledBy: 'interviewer-heading' },
      h(
        'div',
        { className: 'action-bar' },
        h('span', { className: 'eyebrow' }, 'Interviewer Mode · Unlocked'),
        h('div', { className: 'action-group' }, exportBtn, lockBtn),
      ),
      h('h1', { className: 'hero-title', id: 'interviewer-heading' }, 'Reference Solutions & Rubric Workbench'),
      h(
        'div',
        { className: 'field-row' },
        h('label', { htmlFor: 'interviewer-role-select' }, 'Role Question Bank'),
        roleSelect,
      ),
    ),
    bankContainer,
  );

  container.appendChild(page);

  void loadQuestionBank(state.selectedRoleId).then((bank) => {
    clear(bankContainer);
    bank.questions.forEach((q, idx) => {
      bankContainer.appendChild(buildInterviewerQuestionCard(q, idx, state, onStateChange));
    });
  });
}

function getReferenceSummary(q: Question): string {
  if ((q.type === 'mcq' || q.type === 'multi') && q.answerObfuscated) {
    return `Answer key: ${deobfuscateText(q.answerObfuscated).toUpperCase()}`;
  }
  if (q.type === 'sql' && q.referenceSqlObfuscated) {
    return deobfuscateText(q.referenceSqlObfuscated);
  }
  if (q.type === 'code' && q.referenceCodeObfuscated) {
    return deobfuscateText(q.referenceCodeObfuscated);
  }
  if (q.type === 'scenario' && q.keyPoints) {
    return `Key concepts: ${q.keyPoints.join(', ')}`;
  }
  return 'Rubric-evaluated';
}

function buildInterviewerQuestionCard(
  q: Question,
  index: number,
  state: InterviewerState,
  onStateChange: (next: InterviewerState) => void,
): HTMLElement {
  const rubricList = q.rubric.map((r) => {
    const key = `${q.id}:${r.id}`;
    const input = h('input', { type: 'checkbox', id: `rub-${key}` }) as HTMLInputElement;
    input.checked = Boolean(state.rubricChecks[key]);
    input.addEventListener('change', () => {
      state.rubricChecks[key] = input.checked;
      onStateChange({ ...state, rubricChecks: { ...state.rubricChecks } });
    });
    return h(
      'label',
      { className: 'option-card', htmlFor: input.id },
      input,
      h('span', null, `${r.label} (${Math.round(r.weight * 100)}%)`),
    );
  });

  const notesInput = h('textarea', {
    className: 'scenario-textarea',
    ariaLabel: `Observation notes for ${q.id}`,
  }) as HTMLTextAreaElement;
  notesInput.placeholder = 'Interviewer observation notes...';
  notesInput.value = state.notes[q.id] ?? '';
  notesInput.addEventListener('input', () => {
    state.notes[q.id] = notesInput.value;
  });

  return h(
    'article',
    { className: 'panel stack-sm' },
    h(
      'div',
      { className: 'action-group' },
      h('span', { className: 'role-code' }, `Q${index + 1} · ${q.id}`),
      h('span', { className: 'tag' }, q.topic),
      h('span', { className: 'tag' }, q.type.toUpperCase()),
      h('span', { className: 'tag' }, q.difficulty),
    ),
    h('strong', null, q.prompt),
    h('pre', { className: 'share-code-pre' }, getReferenceSummary(q)),
    h('p', { className: 'role-tagline' }, `Explanation: ${q.explanation}`),
    h('div', { className: 'option-list' }, ...rubricList),
    notesInput,
  );
}
