export interface ClearDataResult {
  clearedLocalStorage: boolean;
  clearedSessionStorage: boolean;
  clearedIndexedDb: boolean;
  clearedCaches: boolean;
}

export async function clearAllLocalData(): Promise<ClearDataResult> {
  const result: ClearDataResult = {
    clearedLocalStorage: false,
    clearedSessionStorage: false,
    clearedIndexedDb: false,
    clearedCaches: false,
  };

  try {
    window.localStorage.clear();
    result.clearedLocalStorage = true;
  } catch {
    // Ignore storage access errors in restricted browsing contexts.
  }

  try {
    window.sessionStorage.clear();
    result.clearedSessionStorage = true;
  } catch {
    // Ignore sessionStorage errors.
  }

  try {
    if ('indexedDB' in window && typeof window.indexedDB.databases === 'function') {
      const dbs = await window.indexedDB.databases();
      await Promise.all(
        dbs
          .map((db) => db.name)
          .filter((name): name is string => Boolean(name))
          .map(
            (name) =>
              new Promise<void>((resolve) => {
                const req = window.indexedDB.deleteDatabase(name);
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();
                req.onblocked = () => resolve();
              }),
          ),
      );
      result.clearedIndexedDb = true;
    } else if ('indexedDB' in window) {
      await new Promise<void>((resolve) => {
        const req = window.indexedDB.deleteDatabase('interviewx-db');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
      result.clearedIndexedDb = true;
    }
  } catch {
    // Ignore IndexedDB deletion errors.
  }

  try {
    if ('caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
      result.clearedCaches = true;
    }
  } catch {
    // Ignore CacheStorage errors.
  }

  return result;
}
