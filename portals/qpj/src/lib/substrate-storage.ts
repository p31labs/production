import { getSubstrateConfig, isEdgeMode } from './substrate';
import { createJSONStorage } from 'zustand/middleware';

/**
 * A localStorage accessor that never throws. When the browser blocks storage
 * (sandboxed iframe, third-party cookie blocking, private mode), it falls back
 * to an in-memory Map — the state still persists for the session, it just
 * doesn't survive a reload. zustand's persist used to throw "storage is
 * currently unavailable" on every write in those contexts.
 */
const memory = new Map<string, string>();

function getLocalStorage(): Storage | null {
  try {
    const s = window.localStorage;
    // Accessing window.localStorage can throw in some sandboxed contexts.
    return s;
  } catch {
    return null;
  }
}

const safeLocal: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem(name: string): string | null {
    const s = getLocalStorage();
    if (s) {
      try { return s.getItem(name); } catch { /* fall through */ }
    }
    return memory.get(name) ?? null;
  },
  setItem(name: string, value: string): void {
    const s = getLocalStorage();
    if (s) {
      try { s.setItem(name, value); return; } catch { /* fall through */ }
    }
    memory.set(name, value);
  },
  removeItem(name: string): void {
    const s = getLocalStorage();
    if (s) {
      try { s.removeItem(name); } catch { /* fall through */ }
    }
    memory.delete(name);
  },
};

export const safeLocalStorage = safeLocal;

export const substrateStorage = createJSONStorage(() => ({
  async getItem(name: string): Promise<string | null> {
    if (!isEdgeMode()) {
      return safeLocal.getItem(name);
    }
    try {
      const config = getSubstrateConfig();
      const response = await fetch(`${config.dispatchUrl}/api/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: name }),
      });
      if (response.ok) {
        const data = (await response.json()) as { value: string };
        return data.value ?? null;
      }
    } catch {
      /* fall through to localStorage */
    }
    return safeLocal.getItem(name);
  },

  async setItem(name: string, value: string): Promise<void> {
    safeLocal.setItem(name, value);
    if (!isEdgeMode()) return;
    try {
      const config = getSubstrateConfig();
      await fetch(`${config.dispatchUrl}/api/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: name, value, source: 'local-write' }),
      });
    } catch {
      /* localStorage already updated */
    }
  },

  async removeItem(name: string): Promise<void> {
    safeLocal.removeItem(name);
    if (!isEdgeMode()) return;
    try {
      const config = getSubstrateConfig();
      await fetch(`${config.dispatchUrl}/api/store`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: name }),
      });
    } catch {
      /* ignore edge failure */
    }
  },
}));
