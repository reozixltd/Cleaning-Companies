/**
 * Safe key-value storage. Browser storage can be missing or throw (private
 * mode, blocked cookies, previews), so callers get an in-memory fallback
 * instead of an exception and the page keeps working.
 *
 * This is the only module allowed to touch browser storage (tools/boundaries.mjs).
 */

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

/** Reading `localStorage` itself throws when cookies are blocked or in a sandboxed frame. */
function browserStore(name: 'localStorage' | 'sessionStorage'): Storage | undefined {
  try {
    return globalThis[name];
  } catch {
    return undefined;
  }
}

function probe(store: Storage | undefined): KeyValueStorage | null {
  try {
    if (!store) return null;
    const key = '__clearday_probe__';
    store.setItem(key, '1');
    store.removeItem(key);
    return store;
  } catch {
    return null;
  }
}

let local: KeyValueStorage | null = null;
let session: KeyValueStorage | null = null;
let persistent = false;

/** Browser localStorage when usable, otherwise a per-page memory store. */
export function getStorage(): KeyValueStorage {
  if (local) return local;
  const usable = probe(browserStore('localStorage'));
  persistent = usable !== null;
  local = usable ?? createMemoryStorage();
  return local;
}

/** Browser sessionStorage when usable, otherwise a per-page memory store. */
export function getSessionStorage(): KeyValueStorage {
  session ??= probe(browserStore('sessionStorage')) ?? createMemoryStorage();
  return session;
}

/** False when only the in-memory fallback is available (data is lost when the page closes). */
export function isStoragePersistent(): boolean {
  getStorage();
  return persistent;
}

export function readJson<T>(storage: KeyValueStorage, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Returns false when the write failed (e.g. quota exceeded). */
export function writeJson(storage: KeyValueStorage, key: string, value: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
