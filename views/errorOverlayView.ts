import type { DiagnosticEntry, ErrorBoundaryService } from '../services/errorBoundaryService';
import { h } from './dom';

const OVERLAY_ID = 'ix-error-overlay';

export function showErrorOverlay(
  entry: DiagnosticEntry,
  boundary: ErrorBoundaryService,
): void {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) existing.remove();

  const diagnosticsText = boundary.formatDiagnostics(entry);
  const copyBtn = h(
    'button',
    {
      type: 'button',
      className: 'btn btn-primary',
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(diagnosticsText);
          copyBtn.textContent = 'Diagnostics Copied';
        } catch {
          copyBtn.textContent = 'Copy Failed (Select Text Above)';
        }
      },
    },
    'Copy Diagnostics',
  );

  const dismissBtn = h(
    'button',
    {
      type: 'button',
      className: 'btn btn-ghost',
      onClick: () => overlay.remove(),
    },
    'Dismiss',
  );

  const reportLink = h(
    'a',
    {
      className: 'btn',
      href: boundary.buildIssueUrl(entry),
      target: '_blank',
      rel: 'noopener noreferrer',
    },
    'Report Issue',
  );

  const overlay = h(
    'div',
    {
      id: OVERLAY_ID,
      className: 'error-overlay',
      role: 'alertdialog',
      ariaLabel: 'Application error recovery',
    },
    h(
      'div',
      { className: 'error-dialog' },
      h('span', { className: 'eyebrow' }, 'Unexpected Application Error'),
      h('h2', null, 'Something went wrong, but your local data is safe.'),
      h(
        'p',
        { className: 'role-tagline' },
        'Copy the anonymized diagnostics below (no personal data included) or dismiss to continue.',
      ),
      h('pre', { className: 'error-pre' }, diagnosticsText),
      h('div', { className: 'action-group' }, copyBtn, reportLink, dismissBtn),
    ),
  );

  document.body.appendChild(overlay);
}
