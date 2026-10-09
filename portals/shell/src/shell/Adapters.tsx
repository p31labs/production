/**
 * shell/Adapters.tsx — the concrete adapter provider.
 *
 * Wraps the real implementations (bus client, identity, navigation,
 * notification, clock) in the ShellAdapters contract, so faces receive
 * working services through context without importing them directly.
 */
import { useEffect, useMemo, useState } from 'react';
import { ShellAdapterContext, type ShellAdapters } from './adapters';
import { subscribe as clientSubscribe, publish as clientPublish } from '../bus/client';
import type { BusEvent } from '../bus/events';
import { useShellStore } from './store';
import { useNotifStore } from '../store/useNotifStore';
import { getOrCreatePassport, type ShellPassport } from './passport';

export interface AdapterProviderProps {
  children: React.ReactNode;
}

export function AdapterProvider({ children }: AdapterProviderProps) {
  const active = useShellStore((s) => s.active);
  const [path, setPath] = useState(() => window.location.hash.replace(/^#\/[^/]*/, '') || '/');
  const [passport, setPassport] = useState<ShellPassport | null>(null);
  const [identityReady, setIdentityReady] = useState(false);

  // Hydrate the sovereign identity async (Web Crypto keygen). `ready` flips
  // once the passport is known; until then faces must not fail-closed on a
  // not-yet-resolved role.
  useEffect(() => {
    let cancelled = false;
    getOrCreatePassport().then((p) => {
      if (cancelled) return;
      setPassport(p);
      setIdentityReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const adapters = useMemo<ShellAdapters>(() => ({
    bus: {
      subscribe: (since?: string) => clientSubscribe(since),
      publish: (ev: BusEvent) => clientPublish(ev),
    },
    identity: {
      did: passport?.did ?? null,
      role: passport?.role ?? null,
      ready: identityReady,
    },
    navigation: {
      navigate: (to: string, opts?: { face?: string }) => {
        const face = opts?.face ?? active;
        window.location.hash = `#/${face}${to}`;
        setPath(to);
      },
      path,
    },
    notification: {
      notify: (kind, title, body) => {
        useNotifStore.getState().notify({ kind, title, body });
      },
    },
    clock: {
      now: () => new Date(),
      time: () => new Date().toLocaleTimeString(),
    },
  }), [active, path, passport, identityReady]);

  return <ShellAdapterContext.Provider value={adapters}>{children}</ShellAdapterContext.Provider>;
}