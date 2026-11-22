export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'interviewx:theme';

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable or full; theme still applies in-memory for the session.
  }
}

export class ThemeService {
  private current: ThemeMode = 'dark';
  private listeners = new Set<(mode: ThemeMode) => void>();

  init(): ThemeMode {
    const stored = safeGetItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      this.current = stored;
    } else {
      this.current = 'dark';
    }
    this.apply(this.current);
    return this.current;
  }

  getTheme(): ThemeMode {
    return this.current;
  }

  toggle(): ThemeMode {
    const next: ThemeMode = this.current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    return next;
  }

  setTheme(mode: ThemeMode): void {
    this.current = mode;
    safeSetItem(THEME_STORAGE_KEY, mode);
    this.apply(mode);
    this.listeners.forEach((fn) => fn(mode));
  }

  subscribe(listener: (mode: ThemeMode) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private apply(mode: ThemeMode): void {
    document.documentElement.dataset.theme = mode;
  }
}
