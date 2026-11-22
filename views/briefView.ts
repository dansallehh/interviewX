import { getRoleLevel, type RoleDefinition, type RoleLevel } from '../models/role';
import { clear, h } from './dom';
import { renderRoleMotifSvg } from './roleMotifs';

export interface LevelPickerCallbacks {
  onBack: () => void;
  onSelectLevel: (levelId: string) => void;
}

export function renderLevelPickerView(
  container: HTMLElement,
  role: RoleDefinition,
  callbacks: LevelPickerCallbacks,
): void {
  clear(container);

  const stepper = h(
    'ol',
    { className: 'flow-stepper', ariaLabel: 'Assessment flow' },
    h('li', { className: 'flow-step' }, '1. Pick Role'),
    h('li', { className: 'flow-step is-active', ariaCurrent: 'step' }, '2. Pick Level'),
    h('li', { className: 'flow-step' }, '3. Review Brief'),
    h('li', { className: 'flow-step' }, '4. Start'),
  );

  const levelCards = role.levels.map((level) =>
    h(
      'button',
      {
        type: 'button',
        className: 'level-card',
        id: `level-card-${level.id}`,
        onClick: () => callbacks.onSelectLevel(level.id),
      },
      h('h2', { className: 'role-title' }, level.label),
      h('p', { className: 'role-tagline' }, level.summary),
      h(
        'div',
        { className: 'level-meta' },
        h('span', null, `${level.durationMinutes} min`),
        h('span', null, '·'),
        h('span', null, `${level.questionCount} questions`),
        h('span', null, '·'),
        h('span', null, `Pass ≥ ${level.passMark}%`),
      ),
    ),
  );

  const panel = h(
    'section',
    {
      className: 'panel panel-accent stack page-enter',
      dataset: { role: role.id },
      ariaLabelledBy: 'level-heading',
    },
    h(
      'div',
      { className: 'action-bar' },
      h('span', { className: 'role-code' }, `${role.code} · ${role.name}`),
      h(
        'button',
        {
          type: 'button',
          className: 'btn btn-ghost',
          onClick: () => callbacks.onBack(),
        },
        '← All Roles',
      ),
    ),
    stepper,
    h(
      'div',
      { className: 'stack-sm' },
      h('h1', { className: 'hero-title', id: 'level-heading' }, 'Select assessment level'),
      h('p', { className: 'hero-lead' }, role.tagline),
    ),
    h('div', { className: 'level-grid' }, ...levelCards),
  );

  container.appendChild(panel);
}

export interface BriefViewCallbacks {
  onBackToLevels: () => void;
  onStartAssessment: (level: RoleLevel, extraTimeMultiplier: number, candidateName: string) => void;
}

function weightWidthClass(weight: number): string {
  const pct = Math.round(weight * 100);
  if (pct >= 35) return 'w-35';
  if (pct >= 30) return 'w-30';
  if (pct >= 25) return 'w-25';
  return 'w-20';
}

export function renderBriefView(
  container: HTMLElement,
  role: RoleDefinition,
  levelId: string | undefined,
  callbacks: BriefViewCallbacks,
): void {
  clear(container);
  const level = getRoleLevel(role, levelId);
  let multiplier = 1;

  const stepper = h(
    'ol',
    { className: 'flow-stepper', ariaLabel: 'Assessment flow' },
    h('li', { className: 'flow-step' }, '1. Pick Role'),
    h('li', { className: 'flow-step' }, '2. Pick Level'),
    h('li', { className: 'flow-step is-active', ariaCurrent: 'step' }, '3. Review Brief'),
    h('li', { className: 'flow-step' }, '4. Start'),
  );

  const durationValueEl = h('span', { className: 'meta-value', id: 'brief-duration-val' }, `${level.durationMinutes} min`);

  const candidateNameInput = h('input', {
    id: 'candidate-name-input',
    type: 'text',
    className: 'text-input',
    ariaLabel: 'Candidate name (optional)',
  }) as HTMLInputElement;
  candidateNameInput.placeholder = 'Optional — e.g. Aisyah Rahman';

  const extraTimeSelect = h(
    'select',
    {
      id: 'extra-time-select',
      className: 'select-input',
      ariaLabel: 'Timer accommodation multiplier',
      onChange: (e) => {
        const target = e.target as HTMLSelectElement;
        multiplier = Number(target.value) || 1;
        durationValueEl.textContent = `${Math.round(level.durationMinutes * multiplier)} min`;
      },
    },
    h('option', { value: '1' }, 'Standard (1.0×)'),
    h('option', { value: '1.25' }, '+25% Extra Time (1.25×)'),
    h('option', { value: '1.5' }, '+50% Extra Time (1.5×)'),
    h('option', { value: '2' }, 'Double Time (2.0×)'),
  );

  const weightsList = h(
    'ul',
    { className: 'weight-list' },
    ...role.sections.map((section) => {
      const pct = Math.round(section.weight * 100);
      return h(
        'li',
        { className: 'weight-row' },
        h(
          'div',
          { className: 'weight-head' },
          h('span', null, section.topic),
          h('span', { className: 'weight-pct' }, `${pct}%`),
        ),
        h(
          'div',
          { className: 'weight-bar-track', role: 'presentation' },
          h('div', { className: `weight-bar-fill ${weightWidthClass(section.weight)}` }),
        ),
      );
    }),
  );

  const page = h(
    'section',
    {
      className: 'panel panel-accent stack page-enter',
      dataset: { role: role.id },
      ariaLabelledBy: 'brief-heading',
    },
    h(
      'div',
      { className: 'action-bar' },
      h(
        'div',
        { className: 'action-group' },
        h('span', { className: 'role-motif-badge' }, renderRoleMotifSvg(role.id, 20)),
        h('span', { className: 'role-code' }, `${role.code} · ${level.label}`),
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'btn btn-ghost',
          onClick: () => callbacks.onBackToLevels(),
        },
        '← Change Level',
      ),
    ),
    stepper,
    h(
      'div',
      { className: 'stack-sm' },
      h('h1', { className: 'hero-title', id: 'brief-heading' }, `${role.name} Brief`),
      h('p', { className: 'hero-lead' }, level.summary),
    ),
    h(
      'div',
      { className: 'split-grid' },
      h(
        'div',
        { className: 'stack' },
        h(
          'div',
          { className: 'meta-grid' },
          h('div', { className: 'meta-tile' }, h('span', { className: 'meta-label' }, 'Duration'), durationValueEl),
          h('div', { className: 'meta-tile' }, h('span', { className: 'meta-label' }, 'Questions'), h('span', { className: 'meta-value' }, String(level.questionCount))),
          h('div', { className: 'meta-tile' }, h('span', { className: 'meta-label' }, 'Pass Mark'), h('span', { className: 'meta-value' }, `${level.passMark}%`)),
        ),
        h(
          'div',
          { className: 'field-row' },
          h('label', { htmlFor: 'candidate-name-input' }, 'Candidate Name'),
          candidateNameInput,
        ),
        h(
          'div',
          { className: 'field-row' },
          h('label', { htmlFor: 'extra-time-select' }, 'Accessibility · Timer Accommodation'),
          extraTimeSelect,
        ),
        h(
          'div',
          { className: 'notice' },
          'Privacy: Progress and results are stored locally on this device only. Refreshing mid-test resumes your timer automatically.',
        ),
      ),
      h(
        'div',
        { className: 'stack-sm' },
        h('h2', { className: 'role-title' }, 'Weighted Sections'),
        weightsList,
      ),
    ),
    h(
      'div',
      { className: 'action-bar' },
      h(
        'button',
        {
          type: 'button',
          className: 'btn btn-ghost',
          onClick: () => callbacks.onBackToLevels(),
        },
        'Back',
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'btn btn-role',
          id: 'btn-start-assessment',
          onClick: () => callbacks.onStartAssessment(level, multiplier, candidateNameInput.value),
        },
        'Start Assessment →',
      ),
    ),
  );

  container.appendChild(page);
}
