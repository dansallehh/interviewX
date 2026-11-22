import { clear, h } from './dom';

export function renderNotFoundView(
  container: HTMLElement,
  invalidPath: string,
  onGoHome: () => void,
): void {
  clear(container);

  const panel = h(
    'section',
    { className: 'panel stack page-enter', ariaLabelledBy: 'not-found-heading' },
    h('span', { className: 'eyebrow' }, '404 · Route Not Found'),
    h('h1', { className: 'hero-title', id: 'not-found-heading' }, 'That assessment route does not exist.'),
    h(
      'p',
      { className: 'hero-lead' },
      `No view matched "${invalidPath}". Return to the role selector to choose an assessment track.`,
    ),
    h(
      'div',
      { className: 'action-group' },
      h(
        'button',
        {
          type: 'button',
          className: 'btn btn-primary',
          id: 'btn-404-home',
          onClick: () => onGoHome(),
        },
        'Back to Role Selector',
      ),
    ),
  );

  container.appendChild(panel);
}

export function renderPlaceholderView(
  container: HTMLElement,
  eyebrow: string,
  title: string,
  description: string,
  onGoHome: () => void,
): void {
  clear(container);

  const panel = h(
    'section',
    { className: 'panel stack page-enter', ariaLabelledBy: 'placeholder-heading' },
    h('span', { className: 'eyebrow' }, eyebrow),
    h('h1', { className: 'hero-title', id: 'placeholder-heading' }, title),
    h('p', { className: 'hero-lead' }, description),
    h(
      'div',
      { className: 'action-group' },
      h(
        'button',
        {
          type: 'button',
          className: 'btn btn-primary',
          onClick: () => onGoHome(),
        },
        'Return to Role Selector',
      ),
    ),
  );

  container.appendChild(panel);
}
