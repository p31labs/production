import { useEffect, useRef } from 'react';
import { useSandboxStore } from './sandboxStore';
import {
  loadThreads,
  loadMessages,
  loadArtifacts,
  persistSnapshot,
} from './artifactPersistence';
import type { Thread, Message, Artifact } from './types';

const MAX_MESSAGES_PER_THREAD = 50;
const MAX_VERSIONS_PER_ARTIFACT = 10;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const DEBOUNCE_MS = 500;

async function hydrateFromDB() {
  const threads = await loadThreads();
  if (threads.length === 0) return null;

  threads.sort((a, b) => b.updatedAt - a.updatedAt);

  const messages: Record<string, Message[]> = {};
  const artifacts: Record<string, Artifact[]> = {};
  const cutoff = Date.now() - MAX_AGE_MS;
  const activeIds = new Set(threads.map((t) => t.id));

  for (const thread of threads) {
    let msgs = await loadMessages(thread.id);
    msgs.sort((a, b) => a.timestamp - b.timestamp);
    if (msgs.length > MAX_MESSAGES_PER_THREAD) msgs = msgs.slice(-MAX_MESSAGES_PER_THREAD);
    messages[thread.id] = msgs;

    let arts = await loadArtifacts(thread.id);
    arts = arts.filter((a) => activeIds.has(thread.id) || a.createdAt > cutoff);
    arts.forEach((a) => {
      if (a.versions.length > MAX_VERSIONS_PER_ARTIFACT) a.versions = a.versions.slice(-MAX_VERSIONS_PER_ARTIFACT);
    });
    artifacts[thread.id] = arts;
  }

  return { threads, messages, artifacts };
}

export function useSandboxPersistence() {
  const hydrate = useSandboxStore((s) => s.hydrate);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (typeof indexedDB === 'undefined') return;
    let cancelled = false;
    (async () => {
      try {
        const data = await hydrateFromDB();
        if (!cancelled && data) hydrate(data.threads, data.messages, data.artifacts);
      } catch (err) {
        console.error('[sandbox] Failed to rehydrate from IndexedDB:', err);
      } finally {
        if (!cancelled) hydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  useEffect(() => {
    if (typeof indexedDB === 'undefined') return;
    const flush = async () => {
      const s = useSandboxStore.getState();
      try {
        await persistSnapshot({ threads: s.threads, messages: s.messages, artifacts: s.artifacts });
      } catch (err) {
        console.error('[sandbox] Failed to persist to IndexedDB:', err);
      }
    };

    const flushNow = () => {
      if (!hydratedRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, 0);
    };

    const schedule = () => {
      if (!hydratedRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushNow();
    };

    const unsubscribe = useSandboxStore.subscribe(schedule);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', flushNow);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flushNow);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
