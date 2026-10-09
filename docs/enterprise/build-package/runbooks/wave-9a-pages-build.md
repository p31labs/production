<!-- P31-HEADER
id: p31_wave_9a_pages_build_20261006_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Wave 9a — Pages Build (executable)

## Scope note (the honest line)

This is the **executable** build runbook for pages. It supersedes the
spec-shaped `wave-9a-pages.md` for execution — it names the exact gate entries
to add, the exact hibernation discipline, and the exact chunking the 2MB
ceiling forces.

**The room exists but has never been run by two browsers.** Wave 8's structural
gate is green (collaboration 10/10); its behavioural gate is an open fix-plan
(`wave-8-collab-harness.md`). This build's Phase 2 fixes that *first*, because a
`PageRoom` with no behavioural test is the same gap one level up.

Three technical corrections, verified against the actual `@cloudflare/workers-types`
in this repo, that any draft using `this.ctx` would get wrong:

1. **`DurableObject` is an interface here, not a class.** There is no `this.ctx`
   field. Store the constructor's first argument as `this.state` and call
   `this.state.acceptWebSocket(...)`, `this.state.storage`, and
   `this.state.blockConcurrencyWhile(...)`.
2. **`blockConcurrencyWhile` runs in `fetch`, not the constructor.** It returns
   a Promise (the constructor cannot await), and its whole job is to serialize
   concurrent requests against the one-time state reload.
3. **Hibernation discards *all* in-memory state — not just the `Y.Doc`.** The
   `sockets` set and `presence` map are gone too. They rebuild on wake from
   `this.state.getWebSockets()` plus per-socket `serializeAttachment` /
   `deserializeAttachment` (which persist the `did` across the connection).

And one correction carried from the earlier runbook: **the snapshot is chunked,
never skipped.** A skipped checkpoint at the 2MB ceiling silently stops
persisting the page; chunking keeps a large page durable.

## Preconditions (deterministic, abort-fast)

```bash
node scripts/gate.mjs --feature collaboration   # must be 10/10 — it is today
npm --prefix portals/shell run typecheck        # must exit 0
npm --prefix portals/shell run build            # must exit 0
```

## Phase 1 — reading

Read `features/pages.md`, `features/collaboration.md`,
`room/src/SessionRoom.ts`, `room/src/index.ts`, `src/bus/events.ts`,
`src/features/docs/components/DocsSurface.tsx` (the feature-surface pattern),
and `migrations/0001_bus_ledger.sql`, `migrations/0002_shared_artifacts.sql`.

## Phase 2 — fix the room and build the harness (blocks everything)

This phase runs before any page work. A page built on an unverified room
inherits the gap.

### 2a — Hibernation with full state persistence (in `room/src/SessionRoom.ts`)

- Store the constructor's `state` as `this.state`.
- Replace `server.accept()` with `this.state.acceptWebSocket(server)`, then
  `server.serializeAttachment(did)` so the `did` survives hibernation.
- On every applied doc update, debounce-save `Y.encodeStateAsUpdate(this.doc)`
  to `this.state.storage.put('doc', update)`.
- Lazy-load in `fetch`, not the constructor:
  `await this.state.blockConcurrencyWhile(() => this.ensureLoaded())`, where
  `ensureLoaded` is guarded by a `loaded` flag, reads `storage.get('doc')`, and
  applies it with `Y.applyUpdate`. The constructor does nothing but store
  `state`/`env`/`sessionId` — it runs on every wake.
- Rebuild presence on wake: `this.state.getWebSockets()` returns the live
  sockets; for each, read `ws.deserializeAttachment()` for its `did`. Do not
  trust an in-memory `Map` after hibernation.
- `webSocketClose(ws, code, reason, wasClean)` takes four arguments.

Re-run `--feature collaboration` (must stay 10/10) and typecheck/build.

### 2b — The health fallback

In `room/src/index.ts`: return 404 for any fetch that is neither `/health` nor
an `Upgrade: websocket` request. A misrouted upgrade must surface, not land in
a room named `health`.

### 2c — The collaboration harness

Create `harness-collab.html` + `harness-collab.tsx`: a `.draft` textarea bound
to a `Y.Text` named `draft` in the collab store; `PresenceBar` (`.presence-avatar`)
and `RemoteCursor` (`.remote-cursor`); a `#run-turn` button that sets the agent
phase. Stub the WebSocket with a `BroadcastChannel` so two tabs converge without
a live room Worker. Then `npx playwright test tests/e2e/collaboration.spec.ts` → 4/4.

### 2d — Add the missing gate entries (`scripts/gate.mjs`)

```javascript
'collab-harness': [
  { name: 'the harness exists', fn: () => existsSync(join(SHELL, 'harness-collab.html')) || 'missing harness-collab.html' },
  { name: 'the harness mounts a .draft bound to Y.Text', fn: () => {
    const s = shellSrcIf('harness-collab.tsx');
    return (/\.draft/.test(s) && /getText\(/.test(s)) || 'no .draft bound to a Y.Text';
  } },
  { name: 'the harness stubs the room with a BroadcastChannel', fn: () => {
    const s = shellSrcIf('harness-collab.tsx');
    return (/BroadcastChannel/.test(s)) || 'no BroadcastChannel stub';
  } },
],
```

And add the two hibernation assertions to the existing `pages` gate (the
earlier runbook assumed them; they do not exist):

```javascript
{ name: 'the PageRoom uses the hibernation API', fn: () => {
  const s = shellSrcIf('room/src/PageRoom.ts');
  if (!s) return 'missing room/src/PageRoom.ts';
  if (/server\.accept\(\)/.test(s)) return 'uses the non-hibernating server.accept()';
  return /acceptWebSocket/.test(s) || 'does not call acceptWebSocket';
} },
{ name: 'the PageRoom persists its snapshot across hibernation', fn: () => {
  const s = shellSrcIf('room/src/PageRoom.ts');
  return (/storage\.(put|get)/.test(s) && /blockConcurrencyWhile/.test(s)) || 'no state persistence — a hibernated room loses its draft';
} },
```

## Phase 3 — build the page entity

### 3a — Schema (`migrations/0003_pages.sql`)

```sql
CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_did TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  space_id TEXT,              -- NULL = standalone
  parent_page_id TEXT,        -- NULL = top level
  title TEXT NOT NULL DEFAULT '',
  author_did TEXT NOT NULL DEFAULT '',
  trashed_at INTEGER,         -- NULL = live; set = in Trash
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pages_space ON pages (space_id, parent_page_id);
CREATE INDEX IF NOT EXISTS idx_pages_trash ON pages (trashed_at);
CREATE TABLE IF NOT EXISTS page_versions (
  page_id TEXT NOT NULL, seq INTEGER NOT NULL, hash TEXT NOT NULL,
  snapshot BLOB, chunk INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
  PRIMARY KEY (page_id, seq, chunk)
);
```

### 3b — The API (`functions/api/pages/`)

- `index.ts` — GET list (flat, cursor-paginated per space; the frontend builds
  the tree — the API returns flat data); POST create.
- `[id]/index.ts` — GET read; PATCH title; POST `/move` (transactional parent
  update, adjacency list, O(1)); POST `/trash` (set `trashed_at`, cascade to
  subpages in one UPDATE over the parent chain); POST `/restore` (clear).
- `[id]/room.ts` — the upgrade → `env.PAGE_ROOM.idFromName(pageId)`; read
  `x-p31-did`, fail closed 401.

### 3c — `room/src/PageRoom.ts`

Same shape as the fixed `SessionRoom`: `this.state`, hibernation API,
`blockConcurrencyWhile` reload in `fetch`, minimal constructor. The doc holds a
`Y.Text` named `content`. Checkpoint on a 2s debounce — **chunked, never skipped**:

```ts
const update = Y.encodeStateAsUpdate(this.doc);
const CHUNK = 1_500_000;                        // under the 2MB row/BLOB ceiling
const chunks = Math.ceil(update.length / CHUNK);
for (let i = 0; i < chunks; i++) {
  await this.env.DB.prepare(
    'INSERT OR REPLACE INTO page_versions (page_id, seq, hash, snapshot, chunk, created_at) VALUES (?,?,?,?,?,?)'
  ).bind(pageId, seq, hash, update.slice(i * CHUNK, (i + 1) * CHUNK), i, Date.now()).run();
}
```

### 3d — The client (`src/features/pages/`)

- `lib/pageStore.ts` — flat list + one O(n) parent-map pass: "create a lookup
  map by page ID, then for each page, push it into its parent's children array".
- `hooks/usePageRoom.ts` — the canonical pattern: `doc` + `awareness` in
  `useState`, provider in `useEffect` with `connect: false` (listeners before
  connect).
- `components/PageEditor.tsx` — TipTap v3 + `@tiptap/extension-collaboration` +
  `@tiptap/y-tiptap` (**not** `y-prosemirror`; Tiptap forked it). Mount the
  editor only after the provider has synced (the UniqueID ordering constraint).
- `components/PageTree.tsx`, `components/SuggestionBlock.tsx`,
  `components/PagesSurface.tsx` — a new feature surface under
  `src/features/pages/`; there is **no** `src/faces/docs/`.

### 3e — Suggestions (`functions/api/pages/[id]/suggestions.ts`)

Create/list/accept/reject. The anchor is a Yjs relative position
(`Y.createRelativePositionFromTypeIndex`); resolution via
`Y.createAbsolutePositionFromRelativePosition` returns `null` when the anchor is
deleted — `null` is orphaned, rendered with its quote, never an error. The
server is the only privileged writer; accept applies the replacement.

### 3f — Events and the surface

`src/bus/events.ts` — `page.created`, `page.deleted`, `page.restored`,
`suggestion.created`, `suggestion.resolved` (additive). Mount `PagesSurface`
alongside `DocsSurface`.

### 3g — The behavioural spec

`tests/e2e/pages.spec.ts` — two contexts edit a page and both survive; an agent
suggestion does not change content until accepted; deleting the anchored text
orphans the suggestion.

## Phase 4 — gate

```bash
node scripts/gate.mjs --feature pages
node scripts/gate.mjs --feature collab-harness
npx playwright test tests/e2e/pages.spec.ts tests/e2e/collaboration.spec.ts
npm --prefix portals/shell run typecheck
npm --prefix portals/shell run build
```

## Negative controls (plant, grep the needle, prove it fails, `cp` restore)

`portals/shell/**` is untracked — `cp` backups to `/tmp/opencode/nc/`, never
`git checkout`.

```bash
mkdir -p /tmp/opencode/nc

# 1 — the agent writes directly (the whole safety model)
cp portals/shell/functions/api/pages/[id]/suggestions.ts /tmp/opencode/nc/suggestions.ts.bak
sed -i 's/if (accepted)/if (true)/' portals/shell/functions/api/pages/[id]/suggestions.ts
grep -n 'if (true)' portals/shell/functions/api/pages/[id]/suggestions.ts   # MUST show the plant
(cd portals/shell && npx playwright test tests/e2e/pages.spec.ts)           # MUST fail
cp /tmp/opencode/nc/suggestions.ts.bak portals/shell/functions/api/pages/[id]/suggestions.ts

# 2 — the room stops hibernating
cp portals/shell/room/src/PageRoom.ts /tmp/opencode/nc/PageRoom.ts.bak
sed -i 's/this.state.acceptWebSocket(server)/server.accept()/' portals/shell/room/src/PageRoom.ts
grep -n 'server.accept()' portals/shell/room/src/PageRoom.ts   # MUST show the plant
node scripts/gate.mjs --feature pages --quick                  # MUST exit 1
cp /tmp/opencode/nc/PageRoom.ts.bak portals/shell/room/src/PageRoom.ts

# 3 — the snapshot stops persisting across hibernation
cp portals/shell/room/src/PageRoom.ts /tmp/opencode/nc/PageRoom.ts.bak
sed -i 's/storage\.put/storage.remove/' portals/shell/room/src/PageRoom.ts
grep -n 'storage.remove' portals/shell/room/src/PageRoom.ts   # MUST show the plant
node scripts/gate.mjs --feature pages --quick   # MUST exit 1
cp /tmp/opencode/nc/PageRoom.ts.bak portals/shell/room/src/PageRoom.ts

# Re-verify green:
node scripts/gate.mjs --feature pages --quick
node scripts/gate.mjs --feature collab-harness --quick
```

Control 1 is the agent-writes-directly failure. Control 2 is the billing defect
Wave 8 shipped. Control 3 is the hibernation data-loss bug the one-line accept
fix would introduce if it were the only fix.

## Decision log

| Decision | Basis | Recorded in |
|---|---|---|
| The page's Yjs doc is the full content, not a draft layer | a page has no commit boundary; it persists on debounce, not send | this runbook, 3c |
| The checkpoint chunks at 1.5MB, never skips | D1 and DO SQLite cap a row/BLOB at 2MB; a skipped checkpoint loses the page | this runbook, 3c |
| `this.state`, not `this.ctx`; `blockConcurrencyWhile` in `fetch` | `DurableObject` is an interface here; the constructor cannot await | this runbook, scope note |
| Hibernation rebuilds `sockets`/`presence` from `getWebSockets()` + attachments | hibernation discards all in-memory state | this runbook, 2a |
| The tree is a flat query + one O(n) parent-map pass | the API returns flat; the frontend builds the tree | this runbook, 3d |
| `@tiptap/y-tiptap`, not `y-prosemirror` | Tiptap forked it for v3 | this runbook, 3d |
| The editor mounts after the first sync | the UniqueID ordering constraint | this runbook, 3d |
| `null` anchor resolution is orphaned, not an error | "the honest answer" | this runbook, 3e |
| Pages is a new feature surface | no `src/faces/docs/` exists | `features/pages.md` (corrected) |

## Explicitly not in this wave

Comments, notifications, BYOK (9b); search/activity/compliance (10); the OTel
pipeline (11); the per-page cursor overlay (9b); a vector index (later).