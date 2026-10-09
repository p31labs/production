<!-- P31-HEADER
id: p31_wave_9a_harness_fidelity_20261006_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Wave 9a — Harness Fidelity (the behavioural gate, made real)

## Scope note (the honest line)

Wave 9b's Phase 0 fixed the three correctness bugs (suggestions → D1, `seq` →
`MAX(seq)+1`, page events `sessionId: ''`) and — for the first time — **ran the
behavioural gate**. 3/7 pass; the 4 failures are harness-fidelity gaps, not
feature bugs, and are filed as `collab-harness-fidelity.md`.

This runbook executes that fix-plan. It is the last blocker before Wave 9b's
feature build: a `PageRoom` with a green structural gate and a stub behavioural
gate is the Wave 8 gap one level up, and the package has shipped that gap three
times (Wave 8 room, Wave 9a pages, Wave 9a harness).

Three fixes, each grounded in the Yjs/Playwright mechanics:

1. **Convergence is not tested.** Two `browser.newContext()`s cannot share a
   `BroadcastChannel` — "pages from different contexts can never share session
   data". And the textarea does `delete(0, len) + insert(0, value)` on every
   change, which Yjs "interprets as deleting all existing text and inserting all
   new text" — there is no merge to converge on.
2. **Presence is not tested.** The harness *seeds* two static avatar entries, so
   the count is 2 regardless of how many pages connect. Real awareness is never
   relayed.
3. **The orphan test asserts a string.** `!draft.includes(anchor)` is not a
   relative-position `null`. (Partially fixed in Phase 0: the harness now checks
   the resolved index's content, but the resolution still uses the default
   `followUndoneDeletions` and no `assoc`.)

## Preconditions (deterministic, abort-fast)

```bash
node scripts/gate.mjs --feature collab-harness      # 3/3 today
node scripts/gate.mjs --feature pages               # 9/9 today
npm --prefix portals/shell run typecheck            # exit 0
```

## Phase 1 — the incremental binding (convergence, part 1)

The harness textarea must apply a diff, not a full replace. Yjs ships no
official plain-form-control binding, so the harness owns it.

In `harness-collab.tsx`, replace the `onChange` full-replace with a prefix/suffix
diff, and apply remote changes through `ytext.observe` with `setRangeText`
(which preserves the local caret):

```tsx
const LOCAL_ORIGIN = 'harness-local';

useEffect(() => {
  const doc = new Y.Doc();
  const ytext = doc.getText('draft');
  // ... create the BroadcastChannel ...
  let oldContent = ytext.toString();

  // Remote changes: apply the delta, do not re-drive the value.
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
    setDraft(ta.value);
  });

  const onInput = () => {
    const ta = taRef.current;
    if (!ta) return;
    const next = ta.value;
    // Common prefix.
    let start = 0;
    while (
      start < oldContent.length && start < next.length &&
      oldContent.charCodeAt(start) === next.charCodeAt(start)
    ) start++;
    // Common suffix (accounting for the length delta).
    const delta = next.length - oldContent.length;
    let end = next.length;
    while (
      end > start && end - delta > start &&
      oldContent.charCodeAt(end - delta - 1) === next.charCodeAt(end - 1)
    ) end--;
    const oldLength = end - delta - start;
    doc.transact(() => {
      if (oldLength > 0) ytext.delete(start, oldLength);
      if (end > start) ytext.insert(start, next.substring(start, end));
    }, LOCAL_ORIGIN);
    oldContent = next;
    setDraft(next);
  };

  ta.addEventListener('input', onInput);
  return () => ta.removeEventListener('input', onInput);
}, [sessionId]);
```

The textarea is uncontrolled (ref, not `value={draft}`) — a controlled input
bound to the doc "rewrites the input's value on every remote keystroke, and the
HTML specification requires the browser to respond by discarding the user's
caret".

## Phase 2 — the BroadcastChannel handshake (convergence, part 2)

The stub must implement the two-step sync, not just relay updates. y-websocket's
cross-tab provider sends Sync Step 1 (the state vector) on open, and Sync Step 2
(the diff) in reply:

```tsx
const channel = new BroadcastChannel(`collab-${sessionId}`);
channel.postMessage({ type: 'sync-step-1', data: Y.encodeStateVector(doc) });

channel.onmessage = (ev) => {
  const msg = ev.data as { type: string; data: ArrayBuffer | Uint8Array };
  if (msg.type === 'sync-step-1') {
    channel.postMessage({
      type: 'sync-step-2',
      data: Y.encodeStateAsUpdate(doc, new Uint8Array(msg.data)),
    });
  } else if (msg.type === 'sync-step-2') {
    Y.applyUpdate(doc, new Uint8Array(msg.data));
    setDraft(ytext.toString());
  } else if (msg.type === 'update') {
    Y.applyUpdate(doc, new Uint8Array(msg.data));
    setDraft(ytext.toString());
  } else if (msg.type === 'awareness') {
    awarenessProtocol.applyAwarenessUpdate(awareness, new Uint8Array(msg.data), 'broadcast');
  }
};

doc.on('update', (update: Uint8Array) => {
  channel.postMessage({ type: 'update', data: update });
});
```

## Phase 3 — presence over the channel

Presence is a separate CRDT in `y-protocols/awareness.js` — not part of the
document. The harness must relay it on the same channel and rebuild
`useCollabStore.presence` from received frames. `y-protocols` is a direct
dependency (`^1.0.6`); the API is `Awareness`, `encodeAwarenessUpdate`,
`applyAwarenessUpdate`, `removeAwarenessStates`.

```tsx
import * as awarenessProtocol from 'y-protocols/awareness.js';

const awareness = new awarenessProtocol.Awareness(doc);
awareness.setLocalStateField('user', { did });

awareness.on('update', ({ added, updated, removed }, origin) => {
  if (origin === 'broadcast') return; // do not echo
  const changed = [...added, ...updated, ...removed];
  channel.postMessage({
    type: 'awareness',
    data: awarenessProtocol.encodeAwarenessUpdate(awareness, changed),
  });
});

// Rebuild presence from the awareness instance, not a static seed.
awareness.on('change', () => {
  const next: Record<string, { did: string }> = {};
  for (const [clientId, state] of awareness.getStates()) {
    if (clientId === doc.clientID) continue;
    const user = (state as { user?: { did?: string } }).user;
    if (user?.did) next[user.did] = { did: user.did };
  }
  useCollabStore.setState({ presence: next });
});

// Announce departure BEFORE teardown — a 30-second ghost avatar is visible
// to every other participant otherwise.
const depart = () => {
  awarenessProtocol.removeAwarenessStates(awareness, [doc.clientID], 'local');
  channel.postMessage({
    type: 'awareness',
    data: awarenessProtocol.encodeAwarenessUpdate(awareness, [doc.clientID]),
  });
};
window.addEventListener('beforeunload', depart);
return () => {
  depart();
  window.removeEventListener('beforeunload', depart);
  channel.close();
  awareness.destroy();
  doc.destroy();
};
```

Remove the static seed (`presence: { [did]: …, [PEER]: … }`) — that seed is why
the presence test passes regardless of connection count.

## Phase 4 — the orphan, resolved consistently

Two refinements to Phase 0's fix:

```ts
// assoc: the start anchors LEFT of the range, the end anchors RIGHT.
const start = Y.createRelativePositionFromTypeIndex(ytext, index, -1);
const end = Y.createRelativePositionFromTypeIndex(ytext, index + length, 1);

// followUndoneDeletions=false: a position shared across users must resolve
// the same for everyone. The default (true) follows the undo chain, which
// differs per client.
const a = Y.createAbsolutePositionFromRelativePosition(start, doc, false);
const b = Y.createAbsolutePositionFromRelativePosition(end, doc, false);
```

The harness resolves both ends, and — because a deleted item is a tombstone
until GC, not an immediate `null` — also asserts the resolved range still holds
the anchored text. That is the Phase 0 fix, kept.

## Phase 5 — the specs use one context, two pages

`tests/e2e/collaboration.spec.ts` and `tests/e2e/pages.spec.ts` — every
convergence/presence/focus test changes from two contexts to two pages in one
context:

```ts
// Before: two contexts (cannot share BroadcastChannel)
// const ctxA = await browser.newContext(); const ctxB = await browser.newContext();

// After: one context, two pages (share BroadcastChannel + storage)
const context = await browser.newContext();
const pageA = await context.newPage();
const pageB = await context.newPage();
await pageA.goto('/harness-collab.html?session=collab-converge');
await pageB.goto('/harness-collab.html?session=collab-converge');
await context.close();
```

## The gate

```bash
npx playwright test tests/e2e/collaboration.spec.ts tests/e2e/pages.spec.ts
```

Add to `scripts/gate.mjs` (the `collab-harness` feature):

```javascript
{ name: 'the harness binds the draft incrementally (no full replace)', fn: () => {
  const s = shellSrcIf('harness-collab.tsx');
  if (/delete\(0,\s*ytext\.length\)/.test(s)) return 'full-replace binding — cannot converge';
  return (/setRangeText|applyDelta/.test(s)) || 'no incremental binding';
} },
{ name: 'the harness implements the two-step sync handshake', fn: () => {
  const s = shellSrcIf('harness-collab.tsx');
  return (/encodeStateVector/.test(s) && /encodeStateAsUpdate/.test(s)) || 'no sync handshake';
} },
{ name: 'presence comes from real awareness, not a seed', fn: () => {
  const s = shellSrcIf('harness-collab.tsx');
  if (/presence:\s*\{\s*\[did\]/.test(s)) return 'presence is a static seed';
  return (/new awarenessProtocol\.Awareness|new Awareness/.test(s)) || 'no awareness instance';
} },
{ name: 'departure is announced before teardown', fn: () => {
  const s = shellSrcIf('harness-collab.tsx');
  return (/removeAwarenessStates/.test(s)) || 'no explicit departure';
} },
{ name: 'the convergence specs use one context, two pages', fn: () => {
  const a = shellSrcIf('tests/e2e/collaboration.spec.ts');
  const b = shellSrcIf('tests/e2e/pages.spec.ts');
  if (/browser\.newContext\(\)[\s\S]{0,400}browser\.newContext\(\)/.test(a + b)) return 'still two contexts';
  return true;
} },
```

Behavioural assertions (the gate): two pages edit and both survive; a second
page joins and the first sees one avatar; the second page closes and the avatar
disappears; deleting the anchored text orphans the suggestion; an edit above the
anchor does not orphan it; typing while a remote cursor hovers still types.

## Negative controls (plant, grep the needle, prove it fails, `cp` restore)

```bash
mkdir -p /tmp/opencode/nc

# 1 — the binding reverts to full replace (convergence breaks)
cp portals/shell/harness-collab.tsx /tmp/opencode/nc/harness-collab.tsx.bak
sed -i 's/setRangeText/setText/g' portals/shell/harness-collab.tsx
grep -c 'setRangeText' portals/shell/harness-collab.tsx   # MUST be 0
node scripts/gate.mjs --feature collab-harness --quick   # MUST exit 1 (no incremental binding)
cp /tmp/opencode/nc/harness-collab.tsx.bak portals/shell/harness-collab.tsx

# 2 — presence reverts to a static seed
cp portals/shell/harness-collab.tsx /tmp/opencode/nc/harness-collab.tsx.bak
sed -i "s/useCollabStore.setState({ presence: next })/useCollabStore.setState({ presence: { [did]: { did } } })/" portals/shell/harness-collab.tsx
grep -n "presence: { \[did\]" portals/shell/harness-collab.tsx   # MUST show the plant
node scripts/gate.mjs --feature collab-harness --quick   # MUST exit 1 (static seed)
cp /tmp/opencode/nc/harness-collab.tsx.bak portals/shell/harness-collab.tsx

# 3 — the specs revert to two contexts
cp portals/shell/tests/e2e/collaboration.spec.ts /tmp/opencode/nc/collab.spec.ts.bak
sed -i 's/const context = await browser.newContext();/const context = await browser.newContext(); const _u = await browser.newContext();/' portals/shell/tests/e2e/collaboration.spec.ts
grep -n 'newContext' portals/shell/tests/e2e/collaboration.spec.ts
node scripts/gate.mjs --feature collab-harness --quick   # MUST exit 1 (two contexts)
cp /tmp/opencode/nc/collab.spec.ts.bak portals/shell/tests/e2e/collaboration.spec.ts
```

Each plant is grep-verified before the gate runs, and each file is `cp`-restored
after — the Wave 7 rule and the Wave 8 restore rule.

## Decision log

| Decision | Basis | Recorded in |
|---|---|---|
| One context, two pages | BroadcastChannel is same-profile; "pages from different contexts can never share session data" | Phase 5 |
| The two-step sync handshake | y-websocket's cross-tab provider sends Sync Step 1 then Sync Step 2 | Phase 2 |
| An incremental binding, not a full replace | Yjs "interprets [full replace] as deleting all and inserting all" — no merge | Phase 1 |
| The textarea is uncontrolled | a controlled input discards the caret on every remote update | Phase 1 |
| Presence comes from awareness, never a seed | the seed is why the count never changes | Phase 3 |
| Departure is announced before teardown | a 30-second ghost avatar is visible otherwise | Phase 3 |
| `assoc = -1` start, `+1` end | the start anchors left, the end anchors right | Phase 4 |
| `followUndoneDeletions=false` | a shared position must resolve the same for everyone | Phase 4 |
| A tombstone is checked, not just `null` | a deleted item is a tombstone until GC | Phase 4 |

## Three review questions, answered

1. **Peer-to-peer or leader?** Peer-to-peer for the harness (two pages is the
   test); the handshake mirrors the *shape* (Step 1 → Step 2), not the fan-out.
   A real room has a single DO authority; the harness only needs two pages to
   agree.
2. **Structured-clone-safe payloads?** The channel carries only `Uint8Array` /
   `ArrayBuffer` (encoded updates, encoded awareness). A live `Y.RelativePosition`
   or `Y.Doc` does not clone — payloads must be encoded.
3. **Structural gate or behavioural spec?** Keep them separate: the structural
   gate answers "is the harness built right"; the Playwright run answers "does
   it converge". A wave that passes the first and skips the second is the exact
   gap this runbook closes — so the Playwright run is a hard gate (non-zero
   blocks the wave).

## Explicitly not in this wave

Comments, notifications, BYOK (Wave 9b's feature build); search/activity/
compliance (10); the OTel pipeline (11). This runbook is the harness only.