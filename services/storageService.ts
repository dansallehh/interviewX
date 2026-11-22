import type { AssessmentSession, AttemptHistoryRecord } from '../models/question';
import type { RoleId } from '../models/role';

export type StorageBackend = 'indexeddb' | 'localstorage' | 'memory';

export interface StorageStatus {
  backend: StorageBackend;
  degraded: boolean;
  warning: string | null;
}

const DB_NAME = 'interviewx-db';
const DB_VERSION = 1;
const STORE_KV = 'kv';
const LS_PREFIX = 'interviewx:kv:';

function isValidSession(val: unknown): val is AssessmentSession {
  if (!val || typeof val !== 'object') return false;
  const s = val as Partial<AssessmentSession>;
  return (
    typeof s.sessionId === 'string' &&
    typeof s.roleId === 'string' &&
    typeof s.levelId === 'string' &&
    Array.isArray(s.questionIds) &&
    typeof s.deadlineAt === 'number' &&
    typeof s.startedAt === 'number'
  );
}

export class StorageService {
  private backend: StorageBackend = 'localstorage';
  private degraded = false;
  private warning: string | null = null;
  private memoryStore = new Map<string, string>();
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor(private preferIndexedDb = true) {
    this.detectBackend();
  }

  getStatus(): StorageStatus {
    return {
      backend: this.backend,
      degraded: this.degraded,
      warning: this.warning,
    };
  }

  private detectBackend(): void {
    if (this.preferIndexedDb && typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB) {
      this.backend = 'indexeddb';
      return;
    }
    if (this.canUseLocalStorage()) {
      this.backend = 'localstorage';
      return;
    }
    this.fallbackToMemory('Browser storage is unavailable or restricted. Progress is kept in memory for this tab only.');
  }

  private canUseLocalStorage(): boolean {
    try {
      const probe = `${LS_PREFIX}__probe__`;
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  private fallbackToMemory(reason: string): void {
    this.backend = 'memory';
    this.degraded = true;
    this.warning = reason;
  }

  private openDb(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_KV)) {
            db.createObjectStore(STORE_KV);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return this.dbPromise;
  }

  async setRaw(key: string, serialized: string): Promise<void> {
    if (this.backend === 'indexeddb') {
      const db = await this.openDb();
      if (db) {
        const ok = await new Promise<boolean>((resolve) => {
          try {
            const tx = db.transaction(STORE_KV, 'readwrite');
            tx.objectStore(STORE_KV).put(serialized, key);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          } catch {
            resolve(false);
          }
        });
        if (ok) return;
      }
      // Fall back to localStorage if IndexedDB write fails
      if (this.canUseLocalStorage()) {
        this.backend = 'localstorage';
      } else {
        this.fallbackToMemory('IndexedDB write failed and localStorage is unavailable. Using in-memory fallback.');
      }
    }

    if (this.backend === 'localstorage') {
      try {
        window.localStorage.setItem(`${LS_PREFIX}${key}`, serialized);
        return;
      } catch {
        this.fallbackToMemory('Browser storage quota is full or blocked. Progress is kept in memory only.');
      }
    }

    this.memoryStore.set(key, serialized);
  }

  async getRaw(key: string): Promise<string | null> {
    if (this.backend === 'indexeddb') {
      const db = await this.openDb();
      if (db) {
        const val = await new Promise<string | null>((resolve) => {
          try {
            const tx = db.transaction(STORE_KV, 'readonly');
            const req = tx.objectStore(STORE_KV).get(key);
            req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null);
            req.onerror = () => resolve(null);
          } catch {
            resolve(null);
          }
        });
        if (val !== null) return val;
      }
    }

    if (this.backend === 'localstorage' || this.backend === 'indexeddb') {
      try {
        const val = window.localStorage.getItem(`${LS_PREFIX}${key}`);
        if (val !== null) return val;
      } catch {
        // Ignore and check memoryStore
      }
    }

    return this.memoryStore.get(key) ?? null;
  }

  async removeRaw(key: string): Promise<void> {
    if (this.backend === 'indexeddb') {
      const db = await this.openDb();
      if (db) {
        await new Promise<void>((resolve) => {
          try {
            const tx = db.transaction(STORE_KV, 'readwrite');
            tx.objectStore(STORE_KV).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          } catch {
            resolve();
          }
        });
      }
    }
    try {
      window.localStorage.removeItem(`${LS_PREFIX}${key}`);
    } catch {
      // Ignore
    }
    this.memoryStore.delete(key);
  }

  async saveSession(session: AssessmentSession): Promise<void> {
    await this.setRaw(`session:${session.sessionId}`, JSON.stringify(session));
    await this.setRaw('activeSessionId', session.sessionId);
  }

  async loadSession(sessionId: string): Promise<{ session: AssessmentSession | null; corrupted: boolean }> {
    const raw = await this.getRaw(`session:${sessionId}`);
    if (!raw) return { session: null, corrupted: false };
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isValidSession(parsed)) {
        return { session: parsed, corrupted: false };
      }
      this.degraded = true;
      this.warning = 'Saved session data was corrupted and could not be restored.';
      return { session: null, corrupted: true };
    } catch {
      this.degraded = true;
      this.warning = 'Saved session data was corrupted and could not be restored.';
      return { session: null, corrupted: true };
    }
  }

  async getActiveSessionId(): Promise<string | null> {
    return this.getRaw('activeSessionId');
  }

  async saveAttemptHistory(record: AttemptHistoryRecord): Promise<void> {
    await this.setRaw(`history:${record.roleId}`, JSON.stringify(record));
  }

  async loadAttemptHistory(roleId: RoleId): Promise<AttemptHistoryRecord> {
    const raw = await this.getRaw(`history:${roleId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<AttemptHistoryRecord>;
        if (parsed.roleId === roleId && Array.isArray(parsed.seenQuestionIds)) {
          return {
            roleId,
            seenQuestionIds: parsed.seenQuestionIds,
            completedSessionIds: Array.isArray(parsed.completedSessionIds)
              ? parsed.completedSessionIds
              : [],
            updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
          };
        }
      } catch {
        // Corrupted history resets safely to empty
        this.degraded = true;
        this.warning = 'Attempt history was corrupted and has been reset.';
      }
    }
    return {
      roleId,
      seenQuestionIds: [],
      completedSessionIds: [],
      updatedAt: new Date().toISOString(),
    };
  }
}
