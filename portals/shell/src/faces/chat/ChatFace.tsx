/**
 * faces/chat/ChatFace.tsx — the Convergence chat face.
 *
 * Binds the P31 backend into a chat surface: the composer sends a user turn to
 * the bus ledger (optimistically, reconciled on the ledger id), then POSTs to
 * /api/chat/stream (env.AI) which emits the assistant turn back through the bus.
 * The thread renders through the virtualized, end-anchored Thread primitive;
 * assistant text through stream-md; the send button gates on can(role,'create').
 *
 * The frame is canon: Workbench on desktop (≥900px), ChatShell on mobile.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FaceManifest } from '../../shell/face';
import { useAdapters } from '../../shell/adapters';
import { Workbench } from '../../shell/Workbench';
import { ChatShell } from '@p31ca/design-core/compositions';
import { useChatThreadStore } from '../../shell/chat/threadStore';
import { createChatStream } from '../../shell/chat/streamClient';
import { useChatPresentation } from '../../shell/chat/useChatPresentation';
import { useToolStore, type ToolCall } from '../../shell/chat/toolStore';
import { useLoadOlderOnScroll } from '../../shell/chat/useLoadOlderOnScroll';
import { useArtifactStore } from '../../shell/chat/artifactStore';
import { copyShareLink, revokeShare, shareArtifact } from '../../shell/chat/artifactShareClient';
import { detectArtifacts, type ArtifactKind } from '../../shell/chat/artifactDetect';
import { ThreadList } from '../../shell/chat/ThreadList';
import { ArtifactPane } from '../../shell/chat/ArtifactPane';
import { ArtifactCard } from '../../shell/chat/ArtifactCard';
import { ToolBlock } from '../../shell/chat/ToolBlock';
import { Thread } from '../../shell/chat/Thread';
import { Composer } from '../../shell/chat/Composer';
import { useCollabStore } from '../../shell/chat/collab/collabStore';
import { PresenceBar } from '../../shell/chat/collab/PresenceBar';
import { RemoteCursor } from '../../shell/chat/collab/RemoteCursor';

function useIsWide(): boolean {
  const [wide, setWide] = useState<boolean>(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const cb = (e: MediaQueryListEvent) => setWide(e.matches);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  }, []);
  return wide;
}

/** Stable thread identity — the URL `?session=` or a fixed default, so a reload
 *  re-attaches to the same thread (session-scoped hydrate + live filter). */
function useSessionId(): string {
  return useMemo(() => {
    if (typeof window === 'undefined') return 'convergence-default';
    return new URLSearchParams(window.location.search).get('session') ?? 'convergence-default';
  }, []);
}

export function ChatFace({ manifest }: { manifest: FaceManifest }) {
  const presentation = useChatPresentation();
  const { identity } = useAdapters();
  const did = identity.did;
  const messages = useChatThreadStore((s) => s.messages);
  const error = useChatThreadStore((s) => s.error);
  const streaming = useChatThreadStore((s) => s.streaming);
  const applyEvent = useChatThreadStore((s) => s.apply);
  const toolCalls = useToolStore((s) => s.calls);
  const applyToolEvent = useToolStore((s) => s.apply);
  const applyArtifactEvent = useArtifactStore((s) => s.apply);
  const hasMore = useChatThreadStore((s) => s.hasMore);
  const loadOlderInFlight = useChatThreadStore((s) => s.loadOlderInFlight);
  const loadOlder = useChatThreadStore((s) => s.loadOlder);
  const setHasMore = useChatThreadStore((s) => s.setHasMore);
  const setLoadOlderInFlight = useChatThreadStore((s) => s.setLoadOlderInFlight);
  const sessionId = useSessionId();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const streamRef = useRef<ReturnType<typeof createChatStream> | null>(null);
  const wide = useIsWide();

  // Join the room: the collab store owns the Yjs draft + presence. Scoped to
  // the session; the room is reached over the same identity header the turn
  // reads (x-p31-did).
  useEffect(() => {
    if (did) useCollabStore.getState().connect(sessionId, did);
    return () => useCollabStore.getState().disconnect();
  }, [sessionId, did]);

  // The before-cursor: the ledger id of the oldest retained message.
  const oldestId = messages.length > 0 ? messages[0]!.id : null;

  // Load-older sentinel: prefetch older messages as the reader nears the top.
  const { sentinelRef } = useLoadOlderOnScroll({
    sessionId,
    hasMore,
    inFlight: loadOlderInFlight,
    oldestId,
    onPage: (older, more) => {
      loadOlder(older);
      setHasMore(more);
    },
    setInFlight: setLoadOlderInFlight,
  });

  // Hydrate from the ledger, then stream live — session-scoped. Every event is
  // routed to the thread store (messages), the tool store (tool calls), and the
  // artifact store (the durable tier: artifact.persisted rehydrates a shared
  // artifact from its server-side copy).
  useEffect(() => {
    const stream = createChatStream(sessionId);
    streamRef.current = stream;
    void stream.start(
      (ev) => {
        applyEvent(ev);
        applyToolEvent(ev);
        applyArtifactEvent(ev);
      },
      ({ windowSize }) => {
        // A full hydrate window means history was cut off — open the
        // load-older latch (the sentinel probe then resolves it per-session).
        if (windowSize >= 500) setHasMore(true);
      },
    );
    return () => stream.abort();
  }, [sessionId, applyEvent, applyToolEvent, applyArtifactEvent, setHasMore]);

  // Group consecutive same-tool calls into one block (noise control).
  const toolGroups = useMemo(() => {
    const groups: ToolCall[][] = [];
    for (const call of toolCalls) {
      const last = groups[groups.length - 1];
      if (last && last[last.length - 1]!.toolName === call.toolName) last.push(call);
      else groups.push([call]);
    }
    return groups;
  }, [toolCalls]);

  // Artifacts: detect + ingest from assistant messages; the store dedupes on
  // kind+title and versions on content hash (idempotent re-ingest is cheap).
  const artifacts = useArtifactStore((s) => s.artifacts);
  const activeKey = useArtifactStore((s) => s.activeKey);
  useEffect(() => {
    // Detection waits for the turn to settle: a half-streamed code fence is a
    // partial artifact, and re-ingesting it per token versions it per token.
    if (streaming) return;
    // Detect on the NEWEST assistant message only — not the concatenation of
    // every message. Concatenating re-parses the whole transcript on every
    // token that lands during streaming (a render-loop hazard).
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return;
    const detected = detectArtifacts(lastAssistant.text);
    if (detected.length > 0) useArtifactStore.getState().ingest(detected);
  }, [messages, streaming]);

  const activeArtifact = artifacts.find((a) => a.key === activeKey);
  const artifactContent = activeArtifact?.versions[activeArtifact.versions.length - 1]?.content ?? '';
  const artifactVersion = activeArtifact?.versions.length ?? 0;
  const setActiveArtifact = useArtifactStore((s) => s.setActive);

  // Sharing is the only path to persistence, and it is always a deliberate
  // POST (explicitShare) — never an auto-sync. Once shared the button becomes
  // "Copy link"; revoke returns the artifact to session-local only.
  const handleShare = useCallback(async () => {
    if (!activeArtifact) return;
    if (activeArtifact.shareId) {
      await copyShareLink(activeArtifact.shareId);
      return;
    }
    const latest = activeArtifact.versions[activeArtifact.versions.length - 1];
    const res = await shareArtifact({
      sessionId,
      artifactKey: activeArtifact.key,
      artifact: {
        kind: activeArtifact.kind as ArtifactKind,
        title: activeArtifact.title,
        language: activeArtifact.language,
        content: latest?.content ?? '',
      },
    });
    if (res) useArtifactStore.getState().setShare(activeArtifact.key, res.shareId);
  }, [activeArtifact, sessionId]);

  const handleRevoke = useCallback(async () => {
    if (!activeArtifact?.shareId) return;
    if (await revokeShare(activeArtifact.shareId, sessionId)) {
      useArtifactStore.getState().setShare(activeArtifact.key, null);
    }
  }, [activeArtifact, sessionId]);

  const handleSend = async (text: string, signal: AbortSignal) => {
    // Phase 1 runs before a single token exists: mark the turn streaming now so
    // Stop is in the DOM from the first frame, not from the first flush.
    useChatThreadStore.setState({ streaming: true, error: null });
    // Optimistic: the user's message renders immediately, keyed by a local id,
    // then reconciles to the ledger id when the emit returns.
    const localId = useChatThreadStore.getState().addUser(text, sessionId);
    const history = useChatThreadStore.getState().messages.map((m) => ({ role: m.role, content: m.text }));

    try {
      const emitRes = await fetch('/api/bus/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'message.content', sessionId, text, role: 'user', authorDid: did ?? undefined }),
        signal,
      });
      if (emitRes.ok) {
        const data = (await emitRes.json()) as { event?: { id?: number } };
        const id = data.event?.id;
        if (id != null) useChatThreadStore.getState().reconcile(localId, String(id));
      }

      const chatRes = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(did ? { 'x-p31-did': did } : {}) },
        body: JSON.stringify({ sessionId, messages: history }),
        signal,
      });
      if (!chatRes.ok && !signal.aborted) {
        const err = (await chatRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? `chat HTTP ${chatRes.status}`);
      }
    } catch (err) {
      if (signal.aborted) return; // user stopped the turn — not an error
      useChatThreadStore.setState({ error: err instanceof Error ? err.message : 'send failed', streaming: false });
    }
  };

  const conversation = (
    <div className="chat-face">
      <PresenceBar />
      <Thread messages={messages} sentinelRef={sentinelRef} />
      <RemoteCursor />
      {artifacts.length > 0 && (
        <div className="chat-artifacts" role="list" aria-label="Artifacts">
          {artifacts.map((a) => (
            <ArtifactCard
              key={a.key}
              kind={a.kind}
              title={a.title}
              version={a.versions.length}
              onClick={() => setActiveArtifact(a.key)}
            />
          ))}
        </div>
      )}
      {toolGroups.length > 0 && (
        <div className="chat-tools" role="list" aria-label="Tool calls">
          {toolGroups.map((g) => (
            <ToolBlock key={g[0]!.toolCallId} calls={g} messages={messages} />
          ))}
        </div>
      )}
      {error && <p className="chat-error" role="alert">{error}</p>}
      <Composer
        placeholder={presentation.placeholder}
        canSend={presentation.canSend}
        streaming={streaming}
        onSend={handleSend}
        onAbort={() => useChatThreadStore.setState({ streaming: false })}
      />
    </div>
  );

  const threads = (
    <ThreadList
      onSelect={(id) => { window.location.assign(`#/chat?session=${encodeURIComponent(id)}`); }}
      onNew={() => { window.location.assign('#/chat'); }}
    />
  );

  const context = activeArtifact ? (
    <ArtifactPane
      kind={activeArtifact.kind}
      title={activeArtifact.title}
      content={artifactContent}
      version={artifactVersion}
      versionCount={activeArtifact.versions.length}
      shareId={activeArtifact.shareId ?? null}
      onShare={handleShare}
      onRevoke={handleRevoke}
    />
  ) : (
    <section className="chat-context" aria-label="Context">
      <span className="chat-context__head">Context</span>
      <p className="chat-context__empty">Artifacts appear here when the model generates one.</p>
    </section>
  );

  return wide ? (
    <Workbench left={threads} center={conversation} right={context} />
  ) : (
    <ChatShell
      header={<span className="chat-head">{manifest.wordmark}</span>}
      drawerLabel="Context"
      drawerOpen={drawerOpen}
      onCloseDrawer={() => setDrawerOpen(false)}
      drawer={context}
    >
      {conversation}
    </ChatShell>
  );
}