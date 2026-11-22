import { describe, expect, it } from 'vitest';
import { ErrorBoundaryService } from '../../services/errorBoundaryService';

describe('ErrorBoundaryService', () => {
  it('records error entries and builds privacy-safe diagnostics JSON', () => {
    const boundary = new ErrorBoundaryService();
    const entry = boundary.record('error', 'Simulated failure');
    expect(entry.kind).toBe('error');
    expect(entry.message).toBe('Simulated failure');
    expect(boundary.getEntries().length).toBeGreaterThanOrEqual(1);

    const formatted = boundary.formatDiagnostics(entry);
    const parsed = JSON.parse(formatted);
    expect(parsed.app).toBe('interviewX');
    expect(parsed.latestError.message).toBe('Simulated failure');

    const issueUrl = boundary.buildIssueUrl(entry);
    expect(issueUrl).toContain('https://github.com/dansallehh/interviewX/issues/new');
  });
});
