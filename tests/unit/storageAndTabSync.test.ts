import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AssessmentSession } from '../../models/question';
import { StorageService } from '../../services/storageService';
import { TabSyncService } from '../../services/tabSyncService';

function sampleSession(id = 'sess-1'): AssessmentSession {
  return {
    sessionId: id,
    roleId: 'fresh',
    levelId: 'entry',
    candidateName: 'Daniel',
    questionIds: ['fresh-sql-01', 'fresh-logic-01'],
    responses: {},
    currentIndex: 0,
    startedAt: 1000,
    durationMs: 600_000,
    accommodationMultiplier: 1,
    deadlineAt: 601_000,
    status: 'in_progress',
    tabId: 'tab-a',
    version: '0.2.0',
  };
}

describe('StorageService & TabSyncService', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves, loads, and removes sessions and attempt history cleanly', async () => {
    const store = new StorageService(false);
    const session = sampleSession();
    await store.saveSession(session);

    expect(await store.getActiveSessionId()).toBe('sess-1');
    const loaded = await store.loadSession('sess-1');
    expect(loaded.corrupted).toBe(false);
    expect(loaded.session?.candidateName).toBe('Daniel');

    await store.saveAttemptHistory({
      roleId: 'fresh',
      seenQuestionIds: ['fresh-sql-01'],
      completedSessionIds: ['sess-1'],
      updatedAt: new Date().toISOString(),
    });
    const hist = await store.loadAttemptHistory('fresh');
    expect(hist.seenQuestionIds).toEqual(['fresh-sql-01']);

    await store.removeRaw('session:sess-1');
    expect((await store.loadSession('sess-1')).session).toBeNull();
  });

  it('handles corrupted session JSON gracefully with warning status', async () => {
    const store = new StorageService(false);
    await store.setRaw('session:bad-json', '{corrupted');
    const res = await store.loadSession('bad-json');
    expect(res.session).toBeNull();
    expect(res.corrupted).toBe(true);
    expect(store.getStatus().degraded).toBe(true);
    expect(store.getStatus().warning).toContain('corrupted');
  });

  it('falls back to in-memory storage when localStorage throws QuotaExceededError', async () => {
    const store = new StorageService(false);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    const session = sampleSession('quota-sess');
    await store.saveSession(session);
    expect(store.getStatus().backend).toBe('memory');
    expect(store.getStatus().degraded).toBe(true);
    expect((await store.loadSession('quota-sess')).session?.sessionId).toBe('quota-sess');
  });

  it('detects multi-tab conflicts via storage events without corrupting state', () => {
    const tab1 = new TabSyncService('tab-1');
    const conflicts: string[] = [];
    const unsubscribe = tab1.onConflict((ev) => conflicts.push(ev.otherTabId));

    tab1.claimSession('sess-multi');

    // Simulate another tab writing a claim ping to localStorage
    const storageEvent = new StorageEvent('storage', {
      key: 'interviewx:tab-ping',
      newValue: JSON.stringify({
        type: 'claim',
        sessionId: 'sess-multi',
        tabId: 'tab-2',
        ts: Date.now(),
      }),
    });
    window.dispatchEvent(storageEvent);

    expect(conflicts).toEqual(['tab-2']);
    unsubscribe();
    tab1.release();
  });

  it('recovers from corrupted attempt history and fully disabled localStorage', async () => {
    const store = new StorageService(false);
    await store.setRaw('history:pm', 'not-valid-json');
    const hist = await store.loadAttemptHistory('pm');
    expect(hist.roleId).toBe('pm');
    expect(hist.seenQuestionIds).toEqual([]);
    expect(store.getStatus().degraded).toBe(true);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    const memoryOnly = new StorageService(false);
    expect(memoryOnly.getStatus().backend).toBe('memory');
    expect(memoryOnly.getStatus().degraded).toBe(true);
  });
});
