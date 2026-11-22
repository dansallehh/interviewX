import { ROLES, type RoleDefinition, type RoleId } from '../models/role';
import { clear, h } from './dom';
import { renderRoleMotifSvg } from './roleMotifs';

export interface RoleSelectorOptions {
  selectedRoleId?: RoleId;
  onSelectRole: (roleId: RoleId) => void;
}

export function renderRoleSelectorSkeleton(container: HTMLElement): void {
  clear(container);
  const grid = h('div', { className: 'role-grid', ariaLabel: 'Loading role tracks' });
  for (let i = 0; i < 7; i += 1) {
    grid.appendChild(
      h('div', { className: 'panel skeleton', ariaLabel: 'Loading track' }, h('div', null, ' ')),
    );
  }
  container.appendChild(h('section', { className: 'stack' }, grid));
}

export function renderRoleSelectorView(
  container: HTMLElement,
  options: RoleSelectorOptions,
): void {
  clear(container);

  const stepper = h(
    'ol',
    { className: 'flow-stepper', ariaLabel: 'Assessment flow' },
    h('li', { className: 'flow-step is-active', ariaCurrent: 'step' }, '1. Pick Role'),
    h('li', { className: 'flow-step' }, '2. Pick Level'),
    h('li', { className: 'flow-step' }, '3. Review Brief'),
    h('li', { className: 'flow-step' }, '4. Start'),
  );

  const hero = h(
    'section',
    { className: 'hero', ariaLabelledBy: 'hero-heading' },
    h('span', { className: 'eyebrow' }, 'Technical Interview Assessment Platform'),
    h('h1', { className: 'hero-title', id: 'hero-heading' }, 'Choose your assessment track.'),
    h(
      'p',
      { className: 'hero-lead' },
      'Structured, weighted evaluations across 7 engineering, product, QA, and Oracle 12c DBA roles. Every attempt runs locally in your browser with full privacy.',
    ),
    stepper,
  );

  const cards: HTMLButtonElement[] = [];

  const grid = h(
    'section',
    {
      className: 'role-grid',
      ariaLabel: 'Available assessment roles',
    },
    ...ROLES.map((role, index) => {
      const card = buildRoleCard(role, options.selectedRoleId === role.id, (roleId) => {
        options.onSelectRole(roleId);
      });
      card.addEventListener('keydown', (e) => {
        handleGridArrowKeys(e, cards, index);
      });
      cards.push(card);
      return card;
    }),
  );

  const page = h('div', { className: 'page-enter' }, hero, grid);
  container.appendChild(page);
}

function buildRoleCard(
  role: RoleDefinition,
  isSelected: boolean,
  onSelect: (roleId: RoleId) => void,
): HTMLButtonElement {
  const minDuration = Math.min(...role.levels.map((l) => l.durationMinutes));
  const maxDuration = Math.max(...role.levels.map((l) => l.durationMinutes));
  const durationLabel = minDuration === maxDuration ? `${minDuration} min` : `${minDuration}–${maxDuration} min`;

  const focusList = h(
    'ul',
    { className: 'tag-list', ariaLabel: `${role.name} focus areas` },
    ...role.focus.map((topic) => h('li', { className: 'tag' }, topic)),
  );

  return h(
    'button',
    {
      type: 'button',
      className: `role-card${isSelected ? ' is-selected' : ''}`,
      id: `role-card-${role.id}`,
      dataset: { role: role.id },
      ariaLabel: `${role.name}: ${role.tagline}`,
      onClick: () => onSelect(role.id),
    },
    h(
      'div',
      { className: 'stack-sm' },
      h(
        'div',
        { className: 'role-card-head' },
        h('span', { className: 'role-code' }, role.code),
        h('span', { className: 'role-motif-badge' }, renderRoleMotifSvg(role.id, 22)),
      ),
      h('h2', { className: 'role-title' }, role.name),
      h('p', { className: 'role-tagline' }, role.tagline),
    ),
    h(
      'div',
      { className: 'stack-sm' },
      focusList,
      h(
        'div',
        { className: 'role-card-footer' },
        h('span', null, `${role.levels.length} levels · ${durationLabel}`),
        h('span', { className: 'role-card-cta' }, 'Select →'),
      ),
    ),
  );
}

function handleGridArrowKeys(
  event: KeyboardEvent,
  cards: HTMLButtonElement[],
  currentIndex: number,
): void {
  const key = event.key;
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
    return;
  }

  let nextIndex = currentIndex;
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    nextIndex = (currentIndex + 1) % cards.length;
  } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + cards.length) % cards.length;
  } else if (key === 'Home') {
    nextIndex = 0;
  } else if (key === 'End') {
    nextIndex = cards.length - 1;
  }

  if (nextIndex !== currentIndex) {
    event.preventDefault();
    cards[nextIndex]?.focus();
  }
}
