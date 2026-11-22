import type { ThemeMode } from '../services/themeService';
import { clear, h } from './dom';

export interface ShellCallbacks {
  onNavigate: (hash: string) => void;
  onToggleTheme: () => void;
  onClearAllData: () => Promise<void>;
}

export interface ShellRefs {
  root: HTMLElement;
  mainOutlet: HTMLElement;
  liveRegion: HTMLElement;
  themeButton: HTMLButtonElement;
  statusBanner: HTMLElement;
}

export function renderShell(
  container: HTMLElement,
  initialTheme: ThemeMode,
  callbacks: ShellCallbacks,
): ShellRefs {
  clear(container);

  const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.1.0';
  const commit = typeof __COMMIT_SHA__ === 'string' ? __COMMIT_SHA__ : 'dev';

  let clearArmed = false;
  let clearTimer: number | undefined;

  const statusBanner = h('div', {
    className: 'sr-only',
    ariaLive: 'polite',
  });

  const themeButton = h(
    'button',
    {
      type: 'button',
      className: 'btn btn-ghost',
      id: 'btn-theme-toggle',
      ariaLabel: `Switch to ${initialTheme === 'dark' ? 'light' : 'dark'} theme`,
      onClick: () => callbacks.onToggleTheme(),
    },
    initialTheme === 'dark' ? 'Light Theme' : 'Dark Theme',
  );

  const clearDataBtn = h(
    'button',
    {
      type: 'button',
      className: 'btn btn-danger',
      id: 'btn-clear-data',
      onClick: async () => {
        if (!clearArmed) {
          clearArmed = true;
          clearDataBtn.textContent = 'Confirm Clear Data';
          clearTimer = window.setTimeout(() => {
            clearArmed = false;
            clearDataBtn.textContent = 'Clear All My Data';
          }, 4000);
          return;
        }
        if (clearTimer) window.clearTimeout(clearTimer);
        clearArmed = false;
        clearDataBtn.textContent = 'Clearing...';
        await callbacks.onClearAllData();
        clearDataBtn.textContent = 'Data Cleared';
        statusBanner.textContent = 'All local assessment data has been cleared.';
        window.setTimeout(() => {
          clearDataBtn.textContent = 'Clear All My Data';
        }, 2500);
      },
    },
    'Clear All My Data',
  );

  const header = h(
    'header',
    { className: 'site-header' },
    h(
      'div',
      { className: 'container header-inner' },
      h(
        'a',
        {
          className: 'brand-link',
          href: '#/',
          ariaLabel: 'InterviewX Home',
          onClick: (e) => {
            e.preventDefault();
            callbacks.onNavigate('#/');
          },
        },
        h('span', { className: 'brand-mark' }, 'IX'),
        h(
          'span',
          { className: 'brand-text' },
          h('span', { className: 'brand-name' }, 'InterviewX'),
          h('span', { className: 'brand-sub' }, 'Role-Based Assessment'),
        ),
      ),
      h(
        'nav',
        { className: 'header-actions', ariaLabel: 'Primary' },
        h(
          'a',
          {
            className: 'btn btn-ghost',
            href: '#/',
            onClick: (e) => {
              e.preventDefault();
              callbacks.onNavigate('#/');
            },
          },
          'Roles',
        ),
        h(
          'a',
          {
            className: 'btn btn-ghost',
            href: '#/interviewer',
            onClick: (e) => {
              e.preventDefault();
              callbacks.onNavigate('#/interviewer');
            },
          },
          'Interviewer Mode',
        ),
        themeButton,
      ),
    ),
  );

  const mainOutlet = h('main', {
    className: 'main-content container',
    id: 'main-content',
    tabIndex: -1,
  });

  const footer = h(
    'footer',
    { className: 'site-footer' },
    h(
      'div',
      { className: 'container footer-inner' },
      h(
        'div',
        { className: 'footer-meta' },
        h('span', null, `InterviewX v${version} (${commit})`),
        h('span', null, '·'),
        h('span', null, '100% local in browser — no tracking or backend uploads.'),
      ),
      h('div', { className: 'action-group' }, clearDataBtn),
    ),
  );

  const skipLink = h(
    'a',
    {
      className: 'skip-link',
      href: '#main-content',
      onClick: (e) => {
        e.preventDefault();
        mainOutlet.focus();
      },
    },
    'Skip to main content',
  );

  const root = h('div', { className: 'app-layout' }, skipLink, header, mainOutlet, footer, statusBanner);
  container.appendChild(root);

  return {
    root,
    mainOutlet,
    liveRegion: statusBanner,
    themeButton,
    statusBanner,
  };
}

export function updateThemeButton(button: HTMLButtonElement, mode: ThemeMode): void {
  button.textContent = mode === 'dark' ? 'Light Theme' : 'Dark Theme';
  button.setAttribute('aria-label', `Switch to ${mode === 'dark' ? 'light' : 'dark'} theme`);
}
