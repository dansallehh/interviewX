import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundaryService } from '../../services/errorBoundaryService';

describe('ErrorBoundaryService', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('records error entries, installs global listeners, reloads stored logs, and builds issue URL', () => {
    const boundary = new ErrorBoundaryService();
    const rendered = vi.fn();
    boundary.install(rendered);

    const entry = boundary.record('error', 'Simulated failure');
    expect(entry.kind).toBe('error');
    expect(entry.message).toBe('Simulated failure');
    expect(rendered).toHaveBeenCalledTimes(1);

    // Trigger window error event
    window.dispatchEvent(new ErrorEvent('error', { message: 'Window crash', error: new Error('Boom') }));
    expect(rendered).toHaveBeenCalledTimes(2);

    // Trigger unhandledrejection event
    const rejEvent = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(rejEvent, 'reason', { value: new Error('Rejected promise') });
    window.dispatchEvent(rejEvent);
    expect(rendered).toHaveBeenCalledTimes(3);

    const formatted = boundary.formatDiagnostics(entry);
    const parsed = JSON.parse(formatted);
    expect(parsed.app).toBe('interviewX');
    expect(parsed.latestError.message).toBe('Simulated failure');

    const issueUrl = boundary.buildIssueUrl(entry);
    expect(issueUrl).toContain('https://github.com/dansallehh/interviewX/issues/new');

    boundary.uninstall();

    // New instance reloads stored diagnostics from localStorage
    const reloaded = new ErrorBoundaryService();
    reloaded.install(() => {});
    expect(reloaded.getEntries().length).toBeGreaterThanOrEqual(3);
    reloaded.uninstall();
  });
});
