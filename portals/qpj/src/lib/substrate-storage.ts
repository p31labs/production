import { getSubstrateConfig, isEdgeMode, type SubstrateConfig } from './substrate';
import { createJSONStorage } from 'zustand/middleware';

export const substrateStorage = createJSONStorage(() => ({
  async getItem(name: string): Promise<string | null> {
    if (!isEdgeMode()) {
      return localStorage.getItem(name);
    }
    try {
      const config = getConfig();
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
    return localStorage.getItem(name);
  },

  async setItem(name: string, value: string): Promise<void> {
    localStorage.setItem(name, value);
    if (!isEdgeMode()) return;
    try {
      const config = getConfig();
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
    localStorage.removeItem(name);
    if (!isEdgeMode()) return;
    try {
      const config = getConfig();
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
