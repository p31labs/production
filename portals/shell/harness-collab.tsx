/**
 * harness-collab.tsx — the collab behavioural harness.
 *
 * Mounts a Yjs draft (a `Y.Text` named 'draft') and syncs it over a
 * BroadcastChannel stub of the room WebSocket using the two-step sync handshake
 * (Sync Step 1 = state vector, Sync Step 2 = the diff). The textarea is bound
 * INCREMENTALLY — remote deltas are applied with setRangeText (preserving the
 * caret), local edits are applied as a prefix/suffix diff — never a full
 * replace, so two pages converge. Presence is real awareness
 * (y-protocols/awareness.js) relayed over the channel, not a static seed.
 *
 * `?seed=1` seeds the initial draft (used by the single-page suggestion/orphan
 * specs); multi-page convergence specs leave the doc empty so both pages start
 * clean and merge their edits.
 */
import { createRoot } from 'react-dom/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness.js';
import { PresenceBar } from './src/shell/chat/collab/PresenceBar';
import { RemoteCursor } from './src/shell/chat/collab/RemoteCursor';
import { useCollabStore } from './src/shell/chat/collab/collabStore';
import './src/index.css';

const ANCHOR = 'anchored';
const INITIAL = `draft with ${ANCHOR} text`;
const LOCAL_ORIGIN = 'harness-local';

interface Suggestion {
  text: string;
  anchor: string;
}

function App() {
  const sessionId = useMemo(
    () => new URLSearchParams(location.search).get('session') ?? 'collab-harness',
    [],
  );
  const seed = useMemo(() => new URLSearchParams(location.search).get('seed') === '1', []);
  const did = useMemo(() => `did:key:${Math.random().toString(36).slice(2, 8)}`, []);

  const [suggestion, setSuggestion] = useState<Suggestion | null>({
    text: ' + suggestion',
    anchor: ANCHOR,
  });
  const [orphaned, setOrphaned] = useState(false);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const relPosRef = useRef<Y.RelativePosition | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();
    const ytext = doc.getText('draft');
    docRef.current = doc;
    ytextRef.current = ytext;

    const channel = new BroadcastChannel(`collab-${sessionId}`);
    const awareness = new awarenessProtocol.Awareness(doc);
    awareness.setLocalStateField('user', { did });
    awareness.setLocalStateField('cursor', { index: 0, length: 0 });

    let oldContent = '';
    let anchored = false;

    const resolveAnchor = () => {
      const relPos = relPosRef.current;
      if (!relPos) return;
      // followUndoneDeletions=false: a shared position must resolve the same
      // for every client. A deleted item is a tombstone, not an immediate null,
      // so verify the resolved index still holds the anchored text.
      const abs = Y.createAbsolutePositionFromRelativePosition(relPos, doc, false);
      if (abs == null) { setOrphaned(true); return; }
      const slice = ytext.toString().slice(abs.index, abs.index + ANCHOR.length);
      setOrphaned(slice !== ANCHOR);
    };

    const ensureAnchor = () => {
      if (anchored || ytext.toString().length === 0) return;
      const idx = ytext.toString().indexOf(ANCHOR);
      if (idx < 0) return;
      relPosRef.current = Y.createRelativePositionFromTypeIndex(ytext, idx, -1);
      anchored = true;
      resolveAnchor();
    };

    // Remote changes: apply the delta with setRangeText (keeps the caret).
    // Registered BEFORE seeding so the seed insert reaches the textarea.
    ytext.observe((event, txn) => {
      if (txn.origin === LOCAL_ORIGIN) return;
      const ta = taRef.current;
      if (!ta) return;
      let pos = 0;
      event.changes.delta.forEach((d) => {
        if ('retain' in d) pos += d.retain ?? 0;
        else if ('delete' in d) ta.setRangeText('', pos, pos + (d.delete ?? 0));
        else if ('insert' in d) {
          const s = d.insert as string;
          ta.setRangeText(s, pos, pos);
          pos += s.length;
        }
      });
      oldContent = ta.value;
      ensureAnchor();
      resolveAnchor();
    });

    // Seed the initial draft only for the single-page specs (?seed=1).
    if (seed) {
      doc.transact(() => ytext.insert(0, INITIAL));
      ensureAnchor();
    }

    // Two-step sync handshake + update/awareness relay.
    channel.postMessage({ type: 'sync-step-1', data: Y.encodeStateVector(doc) });
    channel.onmessage = (ev) => {
      const msg = ev.data as { type: string; data: ArrayBuffer | Uint8Array };
      const bytes = msg.data instanceof ArrayBuffer ? new Uint8Array(msg.data) : new Uint8Array(msg.data);
      if (msg.type === 'sync-step-1') {
        channel.postMessage({ type: 'sync-step-2', data: Y.encodeStateAsUpdate(doc, bytes) });
      } else if (msg.type === 'sync-step-2') {
        Y.applyUpdate(doc, bytes);
      } else if (msg.type === 'update') {
        Y.applyUpdate(doc, bytes);
      } else if (msg.type === 'awareness') {
        awarenessProtocol.applyAwarenessUpdate(awareness, bytes, 'broadcast');
      }
    };

    doc.on('update', (update: Uint8Array) => {
      channel.postMessage({ type: 'update', data: update });
    });

    // Real presence: relay awareness and rebuild the store from received states.
    awareness.on('update', (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: string,
    ) => {
      if (origin === 'broadcast') return;
      const changed = [...added, ...updated, ...removed];
      channel.postMessage({
        type: 'awareness',
        data: awarenessProtocol.encodeAwarenessUpdate(awareness, changed),
      });
    });
    awareness.on('change', () => {
      const next: Record<string, { did: string; cursor?: { index: number; length: number } }> = {};
      for (const [clientId, state] of awareness.getStates()) {
        if (clientId === doc.clientID) continue;
        const user = (state as { user?: { did?: string } }).user;
        const cursor = (state as { cursor?: { index: number; length: number } }).cursor;
        if (user?.did) next[user.did] = { did: user.did, cursor };
      }
      useCollabStore.setState({ presence: next });
    });

    // Re-broadcast the full awareness state on a short interval so a peer that
    // joined before this page's channel was ready still converges (the real
    // protocol re-broadcasts every 15s; a test needs it faster than 5s).
    const awarenessInterval = setInterval(() => {
      const states = awareness.getStates();
      if (states.size === 0) return;
      channel.postMessage({
        type: 'awareness',
        data: awarenessProtocol.encodeAwarenessUpdate(awareness, [...states.keys()]),
      });
    }, 1000);

    // Local input: apply a prefix/suffix diff, never a full replace.
    const onInput = () => {
      const ta = taRef.current;
      if (!ta) return;
      const next = ta.value;
      let start = 0;
      while (start < oldContent.length && start < next.length && oldContent.charCodeAt(start) === next.charCodeAt(start)) start++;
      const delta = next.length - oldContent.length;
      let end = next.length;
      while (end > start && end - delta > start && oldContent.charCodeAt(end - delta - 1) === next.charCodeAt(end - 1)) end--;
      const oldLength = end - delta - start;
      doc.transact(() => {
        if (oldLength > 0) ytext.delete(start, oldLength);
        if (end > start) ytext.insert(start, next.substring(start, end));
      }, LOCAL_ORIGIN);
      oldContent = next;
      ensureAnchor();
      resolveAnchor();
    };

    const ta = taRef.current;
    if (ta) ta.addEventListener('input', onInput);

    // Announce departure BEFORE teardown — a 30-second ghost avatar otherwise.
    const depart = () => {
      awarenessProtocol.removeAwarenessStates(awareness, [doc.clientID], 'local');
      channel.postMessage({
        type: 'awareness',
        data: awarenessProtocol.encodeAwarenessUpdate(awareness, [doc.clientID]),
      });
    };
    window.addEventListener('beforeunload', depart);

    return () => {
      ta?.removeEventListener('input', onInput);
      window.removeEventListener('beforeunload', depart);
      clearInterval(awarenessInterval);
      depart();
      channel.close();
      awareness.destroy();
      doc.destroy();
      useCollabStore.setState({ doc: null, connected: false, presence: {}, agentPhase: null });
    };
  }, [sessionId, did, seed]);

  const accept = () => {
    if (!suggestion || orphaned) return;
    const ta = taRef.current;
    if (!ta) return;
    ta.value = ta.value.replace(suggestion.anchor, suggestion.anchor + suggestion.text);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    setSuggestion(null);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div>
        <button id="run-turn" type="button" onClick={() => useCollabStore.setState({ agentPhase: 'thinking' })}>
          run turn
        </button>
      </div>
      <PresenceBar />
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* test hook: .draft — the collaborative draft textarea */}
        <textarea ref={taRef} className="draft" />
        <RemoteCursor />
      </div>
      {suggestion && (
        <div className={orphaned ? 'suggestion orphaned' : 'suggestion'}>
          {orphaned ? (
            <span className="orphan-label">anchor missing</span>
          ) : (
            <>
              <span>{suggestion.text}</span>
              <button id="accept" type="button" onClick={accept}>accept</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);