import { afterEach, describe, expect, it, vi } from 'vitest';

describe('storage fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('falls back to memory and reports non-persistent when browser storage throws', async () => {
    const broken = {
      setItem: () => {
        throw new Error('blocked');
      },
      getItem: () => null,
      removeItem: () => undefined,
    };
    vi.stubGlobal('localStorage', broken);
    vi.stubGlobal('sessionStorage', broken);
    const { getStorage, getSessionStorage, isStoragePersistent } = await import('@/core/storage');
    const s = getStorage();
    s.setItem('k', 'v');
    expect(s.getItem('k')).toBe('v');
    expect(isStoragePersistent()).toBe(false);
    const ss = getSessionStorage();
    ss.setItem('k', 'v');
    expect(ss.getItem('k')).toBe('v');
  });

  it('falls back to memory when even reading localStorage throws (cookies blocked, sandboxed frame)', async () => {
    const denied = () => {
      throw new DOMException('Access is denied for this document.', 'SecurityError');
    };
    const original = Object.getOwnPropertyDescriptors(globalThis);
    Object.defineProperty(globalThis, 'localStorage', { get: denied, configurable: true });
    Object.defineProperty(globalThis, 'sessionStorage', { get: denied, configurable: true });
    try {
      const { getStorage, getSessionStorage, isStoragePersistent } = await import('@/core/storage');
      const s = getStorage();
      s.setItem('k', 'v');
      expect(s.getItem('k')).toBe('v');
      expect(isStoragePersistent()).toBe(false);
      expect(getSessionStorage().getItem('k')).toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', original.localStorage);
      Object.defineProperty(globalThis, 'sessionStorage', original.sessionStorage);
    }
  });

  it('reports persistent when browser storage works', async () => {
    const { isStoragePersistent } = await import('@/core/storage');
    expect(isStoragePersistent()).toBe(true);
  });

  it('readJson returns the fallback for corrupt data', async () => {
    const { createMemoryStorage, readJson } = await import('@/core/storage');
    const s = createMemoryStorage();
    s.setItem('x', '{nope');
    expect(readJson(s, 'x', 7)).toBe(7);
  });
});
