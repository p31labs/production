<!-- P31-HEADER
id: p31_wave_9a_pages_20261006_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Wave 9a — Pages and Spaces

## Scope note (the honest line)

Wave 8 built the room and gated it structurally: collaboration 10/10,
agent-presence 4/4, typecheck/build/vitest green, no regression. **Its
behavioural gate is an open fix-plan** (`wave-8-collab-harness.md`) — the room
has never been run by two browsers.

The review of the Wave 8 build found two more room defects, now filed as
`wave-8-room-hibernation.md`:

1. **No hibernation.** `SessionRoom` uses the non-hibernating
   `server.accept()` API, so every open socket keeps the DO billed. The fix is
   `state.acceptWebSocket(server)` **plus** persisting the `Y.Doc` state vector
   to `state.storage` on debounce and reloading it on wake — hibernation
   discards in-memory state, so the accept call alone would lose every edit.
2. **A masking health fallback.** `room/src/index.ts` routes a misrouted
   upgrade into a DO named `health`, so the failure is silent.

One correction to the review, stated so the runbook does not chase a phantom:
**`webSocketMessage`/`webSocketClose` ARE invoked by `server.accept()`.** The
review's claim that they are "never invoked" is wrong — the only real cost is
missing hibernation. The fix is still worth doing, but it is a billing/persistence
change, not a broken-messaging one.

One correction to the pages spec, now applied: **there is no
`src/faces/docs/DocsFace.tsx`.** The shell's faces are `studio`, `audit`,
`monetization`, `chat`; `docs` is a *feature surface*
(`src/features/docs/components/DocsSurface.tsx`). Pages is therefore a new
feature surface — `src/features/pages/` — not a modification to a docs face.

**Explicitly not in this wave:** comments, notifications, BYOK (Wave 9b),
search/activity/compliance (Wave 10), and a vector index. 9a ships the page
entity, the space container, the page tree, the editor, and the suggestion
channel.

## Preconditions (deterministic, abort-fast)

- `node scripts/gate.mjs --feature collaboration` — green today (10/10).
- The collab harness exists (built in Phase 2; `tests/e2e/collaboration.spec.ts`
  passes 4/4).

## Phase 1 — reading

Read `00-MASTER.md`, `features/pages.md`, `features/collaboration.md`,
`room/src/SessionRoom.ts`, `room/src/index.ts`, `src/bus/events.ts`,
`src/features/docs/components/DocsSurface.tsx` (the feature-surface pattern),
and the last two shell migrations.

## Phase 2 — fix the Wave 8 defects (before any pages work)

1. **Hibernation.** In `SessionRoom`: keep `state` from the constructor; replace
   `server.accept()` with `this.state.acceptWebSocket(server)`; on each applied
   doc update, debounce-save `Y.encodeStateAsUpdate(this.doc)` to
   `this.state.storage` (key `doc`); on construction/`fetch`, reload it before
   handling so a hibernated room restores its draft. Re-run `--feature
   collaboration` (must stay 10/10) and typecheck/build.
2. **Health fallback.** In `room/src/index.ts`: return 404 for any fetch that is
   neither `/health` nor a WebSocket upgrade. A misrouted upgrade surfaces.
3. **The collab harness.** Create `harness-collab.html` + `harness-collab.tsx`
   that mount a `.draft` textarea bound to `useCollabStore`'s `Y.Doc` (a
   `Y.Text` named `draft`), render `PresenceBar` (`.presence-avatar`) and
   `RemoteCursor` (`.remote-cursor`), and expose a `#run-turn` button that sets
   the agent phase. Stub the WebSocket with a `BroadcastChannel` so two tabs in
   one browser converge without a live room Worker. Run
   `tests/e2e/collaboration.spec.ts` → 4/4.

The harness is a test fixture; it does not ship.

## Phase 3 — build the page entity (9a)

1. `migrations/0003_pages.sql` — `pages` (`id`, `space_id` NULL,
   `parent_page_id` NULL, `title`, `author_did`, `trashed_at` NULL,
   `created_at`), `spaces` (`id`, `name`, `owner_did`, `created_at`),
   `page_versions` (`page_id`, `hash`, `snapshot` BLOB, `created_at`).
2. `functions/api/pages/index.ts` (list cursor-paginated per space, create) and
   `functions/api/pages/[id]/index.ts` (read, patch title, move, trash sets
   `trashed_at` and cascades to subpages, restore clears).
3. `functions/api/pages/[id]/room.ts` — WebSocket upgrade →
   `env.PAGE_ROOM.idFromName(pageId)`; read `x-p31-did`, fail closed 401.
4. `room/src/PageRoom.ts` — the page's Yjs server, **with the hibernation fix
   from Phase 2 from the start**. The doc holds a `Y.Text` named `content`.
   Checkpoint to D1 (`page_versions`) on a 2s debounce; the snapshot is
`Y.encodeStateAsUpdate(doc)`. **Chunk** the snapshot under the 2MB row/BLOB
  limit (one `page_versions` row per ~1.5MB chunk, sequenced) — never skip the
  checkpoint, because a skipped write silently loses the page.
5. `room/wrangler.toml` — export `PageRoom` beside `SessionRoom`; add a
   `PAGE_ROOM` DO binding and a second migration tag. `wrangler.toml` (Pages) —
   the `PAGE_ROOM` binding, `script_name` → the room Worker.
6. `src/features/pages/` — `lib/pageStore.ts` (flat list + parent-map bucket
   pass, the Wave 6 `threadListStore` shape), `hooks/usePageRoom.ts` (the
   canonical Yjs React pattern: `doc` + `awareness` in `useState`, provider in
   `useEffect` with `connect: false`, editor mounts only after the first sync
   frame), `components/PageEditor.tsx` (TipTap v3 + `@tiptap/extension-collaboration`
   + `@tiptap/y-tiptap` — **not** `y-prosemirror`), `components/PageTree.tsx`
   (space → folder → page → subpage), `components/SuggestionBlock.tsx`,
   `components/PagesSurface.tsx`.
7. `functions/api/pages/[id]/suggestions.ts` — create/list/accept/reject. An
   agent proposes a block replacement anchored to a range; the **server** is the
   only privileged writer, and accept applies the replacement.
8. `src/bus/events.ts` — `page.created`, `page.deleted`, `page.restored`,
   `suggestion.created`, `suggestion.resolved` (additive).
9. `tests/e2e/pages.spec.ts` — two contexts edit a page and both survive; an
   agent suggestion does not change content until accepted; deleting the
   anchored text orphans the suggestion.

Install `@tiptap/core @tiptap/react @tiptap/starter-kit
@tiptap/extension-collaboration @tiptap/y-tiptap`. Only touch the scope lock.
An agent never writes page content directly.

## Phase 4 — gate (structural + behavioural)

- `node scripts/gate.mjs --feature pages` (structural)
- `npx playwright test tests/e2e/pages.spec.ts tests/e2e/collaboration.spec.ts`
  (behavioural — pages + the Wave 8 room)
- `node scripts/gate.mjs --feature collaboration` (regression)
- `npm run typecheck` · `npm run build`

## Phase 5 — review-approval · Phase 6 — deploy

## Negative controls (plant ONE, grep the needle, prove it fails, `cp` restore)

1. **The agent writes directly.** In `functions/api/pages/[id]/suggestions.ts`,
   `s/if (accepted)/if (true)/`; `grep -n 'if (true)'`; `pages.spec.ts` must
   fail; restore. This is the whole safety model.
2. **The suggestion loses its anchor.** In `functions/api/pages/[id]/suggestions.ts`,
   `s/anchor/range/g`; `grep -n anchor` (empty — plant confirmed); `node
   scripts/gate.mjs --feature pages --quick` must fail its anchor assertion;
   `cp` restore. (The deep relative-position anchor — swapping
   `Y.createRelativePositionFromTypeIndex` for a non-existent API, and the
   orphaned-anchor `null` — is Wave 9b's control; it targets `useCommentAnchor.ts`,
   the file the comments gate reads.)
3. **The room stops hibernating.** In `room/src/PageRoom.ts`,
   `s/this.state.acceptWebSocket(server)/server.accept()/`; `grep -n
   'server.accept()'`; the pages gate must fail its hibernation assertion (add
   that assertion to the pages gate in Phase 4 — the gate currently asserts only
   that PageRoom exists); `cp` restore.

Control 1 matters most: an agent that writes page content directly is the
failure the suggestion channel exists to prevent. Control 2 is the honest null
(the anchor's place is gone). Control 3 is the defect the Wave 8 build shipped.

## Decision log

| Decision | Basis | Recorded in |
|---|---|---|
| The page's Yjs doc is the **full content**, not a draft layer | a page has no commit boundary; it persists on debounce, not on send | this runbook, Phase 3 step 4 |
| Space membership is a `space_members` join table; a page's effective role is the max of (space role, standalone share role), resolved before `can()` | the identity adapter has one role; no per-space membership exists | this runbook (review question 2) |
| Pages is a **new feature surface** (`src/features/pages/`), not a docs face | no `src/faces/docs/` exists; `docs` is `src/features/docs/` | `features/pages.md` (corrected) |
| The snapshot chunks at ~1.5MB, never skips | D1 and DO storage cap a row/BLOB at 2MB; a skipped checkpoint loses the page | this runbook, Phase 3 step 4 |
| Hibernation fix includes storage persistence, not just the accept call | hibernation discards in-memory state | `wave-8-room-hibernation.md` |

## Explicitly not in this wave

Comments, notifications, BYOK (9b); search/activity/compliance (10); the
per-page cursor overlay (9b); a vector index (later).