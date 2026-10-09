/**
 * shell/adapters.ts — the adapter registry (the host-supplied services).
 *
 * Faces declare the capabilities they need (bus, identity, navigation,
 * notification, clock) in their manifest; the shell injects the concrete
 * adapters via React context. A face never imports a service directly — it
 * receives it. This is the config/adapter split: config is generated, adapters
 * are wired, so a wrong query never reads as a wrong layout.
 */
import { createContext, useContext } from 'react';
import type { BusEvent } from '../bus/events';
import type { BusSubscription } from '../bus/client';

export interface ClockAdapter {
  now(): Date;
  /** Formatted current time (locale-friendly). */
  time(): string;
}

export interface NotificationAdapter {
  notify(kind: 'success' | 'error' | 'info', title: string, body?: string): void;
}

export interface IdentityAdapter {
  did: string | null;
  role: 'viewer' | 'operator' | 'admin' | null;
  /** Sign-in state is hydrated async; `ready` flips once known. */
  ready: boolean;
}

export interface NavigationAdapter {
  /** Route within the active face (or to another face via `face`). */
  navigate(path: string, opts?: { face?: string }): void;
  /** The current path within the active face. */
  path: string;
}

export interface BusAdapter {
  /** Subscribe to the normalized event stream. */
  subscribe(since?: string): BusSubscription;
  /** Publish an event into the ledger. */
  publish(ev: BusEvent): Promise<BusEvent | null>;
}

export interface ShellAdapters {
  bus: BusAdapter;
  identity: IdentityAdapter;
  navigation: NavigationAdapter;
  notification: NotificationAdapter;
  clock: ClockAdapter;
}

export const ShellAdapterContext = createContext<ShellAdapters | null>(null);

/** Hook for faces to receive their adapters. Throws outside the shell. */
export function useAdapters(): ShellAdapters {
  const ctx = useContext(ShellAdapterContext);
  if (!ctx) throw new Error('useAdapters must be used inside <ShellAdapterContext.Provider>');
  return ctx;
}

/** A default no-op adapter set (for isolated rendering / tests). */
export function defaultAdapters(): ShellAdapters {
  return {
    bus: {
      subscribe: () => ({
        on: () => {}, onType: () => {}, close: () => {},
      }),
      publish: async () => null,
    },
    identity: { did: null, role: null, ready: false },
    navigation: { navigate: () => {}, path: '/' },
    notification: { notify: () => {} },
    clock: { now: () => new Date(), time: () => new Date().toLocaleTimeString() },
  };
}