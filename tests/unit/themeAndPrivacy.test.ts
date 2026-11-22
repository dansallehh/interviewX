import { afterEach, describe, expect, it } from 'vitest';
import { clearAllLocalData } from '../../services/privacyService';
import { ThemeService } from '../../services/themeService';

describe('ThemeService & privacyService', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('defaults to dark theme, toggles cleanly, notifies subscribers, and persists', () => {
    const theme = new ThemeService();
    const seen: string[] = [];
    const unsub = theme.subscribe((m) => seen.push(m));

    expect(theme.init()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    expect(theme.toggle()).toBe('light');
    expect(theme.getTheme()).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(seen).toEqual(['light']);

    const reloaded = new ThemeService();
    expect(reloaded.init()).toBe('light');
    unsub();
  });

  it('clears all local and session storage via clearAllLocalData', async () => {
    window.localStorage.setItem('interviewx:test', '1');
    window.sessionStorage.setItem('interviewx:tmp', '1');

    const result = await clearAllLocalData();
    expect(result.clearedLocalStorage).toBe(true);
    expect(result.clearedSessionStorage).toBe(true);
    expect(window.localStorage.getItem('interviewx:test')).toBeNull();
    expect(window.sessionStorage.getItem('interviewx:tmp')).toBeNull();
  });
});
