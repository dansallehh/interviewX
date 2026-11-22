export interface DiagnosticEntry {
  timestamp: string;
  kind: 'error' | 'unhandledrejection';
  message: string;
  route: string;
  version: string;
  commit: string;
}

const LOG_KEY = 'interviewx:diagnostics';
const MAX_ENTRIES = 20;
const REPO_ISSUES_URL = 'https://github.com/dansallehh/interviewX/issues/new';

export type ErrorRenderer = (entry: DiagnosticEntry, allEntries: DiagnosticEntry[]) => void;

export class ErrorBoundaryService {
  private entries: DiagnosticEntry[] = [];
  private onRender: ErrorRenderer | null = null;
  private boundOnError: (event: ErrorEvent) => void;
  private boundOnRejection: (event: PromiseRejectionEvent) => void;

  constructor() {
    this.boundOnError = (event: ErrorEvent) => {
      const message = event.error instanceof Error
        ? event.error.message
        : String(event.message || 'Unexpected runtime error');
      this.record('error', message);
    };
    this.boundOnRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error
        ? reason.message
        : String(reason || 'Unhandled promise rejection');
      this.record('unhandledrejection', message);
    };
  }

  install(renderer: ErrorRenderer): void {
    this.onRender = renderer;
    this.loadStored();
    window.addEventListener('error', this.boundOnError);
    window.addEventListener('unhandledrejection', this.boundOnRejection);
  }

  uninstall(): void {
    window.removeEventListener('error', this.boundOnError);
    window.removeEventListener('unhandledrejection', this.boundOnRejection);
  }

  record(kind: DiagnosticEntry['kind'], message: string): DiagnosticEntry {
    const entry: DiagnosticEntry = {
      timestamp: new Date().toISOString(),
      kind,
      message: message.slice(0, 400),
      route: window.location.hash || '#/',
      version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
      commit: typeof __COMMIT_SHA__ === 'string' ? __COMMIT_SHA__ : 'local',
    };
    this.entries = [entry, ...this.entries].slice(0, MAX_ENTRIES);
    this.persist();
    if (this.onRender) {
      this.onRender(entry, this.entries);
    }
    return entry;
  }

  getEntries(): DiagnosticEntry[] {
    return [...this.entries];
  }

  formatDiagnostics(entry?: DiagnosticEntry): string {
    const payload = {
      app: 'interviewX',
      version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
      commit: typeof __COMMIT_SHA__ === 'string' ? __COMMIT_SHA__ : 'local',
      route: window.location.hash || '#/',
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      latestError: entry ?? this.entries[0] ?? null,
      recentCount: this.entries.length,
    };
    return JSON.stringify(payload, null, 2);
  }

  buildIssueUrl(entry?: DiagnosticEntry): string {
    const title = encodeURIComponent(
      `[Bug] ${(entry?.message ?? 'Runtime error').slice(0, 80)}`,
    );
    const body = encodeURIComponent(
      `## Summary\nEncountered an unexpected error in InterviewX.\n\n## Diagnostics (no PII)\n\`\`\`json\n${this.formatDiagnostics(entry)}\n\`\`\`\n`,
    );
    return `${REPO_ISSUES_URL}?title=${title}&body=${body}`;
  }

  private loadStored(): void {
    try {
      const raw = window.localStorage.getItem(LOG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.entries = parsed.slice(0, MAX_ENTRIES);
        }
      }
    } catch {
      this.entries = [];
    }
  }

  private persist(): void {
    try {
      window.localStorage.setItem(LOG_KEY, JSON.stringify(this.entries));
    } catch {
      // Ignore quota errors while logging diagnostics.
    }
  }
}
