<!-- P31-HEADER
id: p31_feature_pages_20261006_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Feature: Pages and Spaces

## The invariant

A page is an editable document that a human and an agent both change; a space
is a folder with people in it that groups pages; a page can live inside a space
or standalone; an agent writes to a page only through a suggestion a human
accepts or rejects; and a page's content survives concurrent edits and a Durable
Object eviction.

## The boundary

This feature does **not** own:

- **The turn** — Wave 7's two-phase turn owns model calls. An agent's page
  work is invoked from a comment mention, not from the chat composer.
- **The room transport** — Wave 8's `SessionRoom` DO owns the WebSocket sync.
  A page's Yjs doc is hosted by a `PageRoom` DO with the **same topology**
  (`portals/shell/room/` — a standalone Worker; Pages cannot host a DO class,
  see `collaboration.md` → The topology).
- **Approval policy** — Wave 4's `isConsequential` owns which actions gate. A
  page suggestion is a gated tool result; no new policy.
- **Notifications** — a separate feature (`comments-notifications.md`).
- **BYOK** — a separate feature (`byok.md`).
- **The activity feed** — deferred. It is a curated allowlisted view over the
  ledger, not a Wave 9 deliverable.

Five rules this feature owns outright:

1. **A page's content is a Yjs doc — one doc per page; the ledger holds its
   metadata and its commits.** The page row (`id`, `space_id`, `parent_page_id`,
   `title`, `author_did`) is a `page.created` ledger event. The content is CRDT
   state, checkpointed to D1. History is read from the ledger; live editing is
   the doc. A `PageRoom` per page matches the `meetingwords` topology — each
   document is its own Durable Object and idle documents hibernate. A page
   created from a chat message copies that message's text into the page's own
   doc; the session doc stays the session's.
2. **A suggestion is anchored to a range, not to a message.** The anchor is a
   Yjs relative position. A suggestion whose anchor resolves to `null` is
   orphaned — it renders with the quoted text it was attached to, not deleted.
   `null` is a state, never a crash (the same discipline Wave 3 applied to a
   ledger row with no id).
3. **An agent never writes page content directly.** An agent writes by proposing
   a block replacement (`suggestion.created`) that a human accepts or rejects.
   The server is the only privileged writer; structurally, an agent cannot touch
   the text. This is the `cowrite` rule, and it is the whole safety model.
4. **A space is a folder with people in it; a page can live standalone.** A
   `space_id` is nullable on a page (standalone), and a page's sharing follows
   its own controls unless it is inside a shared space. A page moved into a
   shared space inherits the space's access; a page shared standalone does not
   open the space. `parent_page_id` nests subpages; subpages inherit access
   from their parent.
5. **Deletion is a move to Trash, not a removal.** A `page.deleted` event moves
   the page and its nested pages to a `trashed_at` state. Restore is a
   `page.restored` event. A hard delete is a separate, admin-only, consequential
   action.

### The decisions (answered before the build)

| Question | Decision |
|---|---|
| Is page content a new Yjs doc per page, or a section of the session's doc? | **One doc per page** — a `PageRoom` DO per page id (hibernation + eviction isolation). "Create a page from this message" copies the text into the page's own doc. |
| Which writer is privileged? | **The server only.** An agent's proposal is a tool result gated by the existing `ApprovalGate` (Wave 4). No new approval machinery — the `isConsequential` contract already routes it. |
| Is a page's `author_did` verified or asserted? | **Asserted, and the gap is carried, not papered over.** Pages record the same client-asserted identity claim as chat (`collaboration.md` names it). Wave 9b's credentials give a possession-based identity for *key resolution*; they do not make page authorship verifiable in this wave. |

## The implementation

| File | What it provides |
|---|---|
| `migrations/0003_pages.sql` | `pages`, `spaces`, `page_versions` tables |
| `functions/api/pages/index.ts` | list, create, read (cursor-paginated per space) |
| `functions/api/pages/[id]/index.ts` | read, patch title, move, trash, restore |
| `functions/api/pages/[id]/room.ts` | the WebSocket upgrade → the `PAGE_ROOM` binding (`env.PAGE_ROOM.idFromName(pageId)`) |
| `portals/shell/room/src/PageRoom.ts` | the page's Yjs server (same shape as `SessionRoom`: sync, awareness relay, checkpoint to D1) |
| `portals/shell/room/wrangler.toml` *(modified)* | exports `PageRoom` alongside `SessionRoom` from the room Worker |
| `wrangler.toml` *(modified)* | `[[durable_objects.bindings]]` `name = "PAGE_ROOM"`, `script_name` → the room Worker |
| `functions/api/pages/[id]/suggestions.ts` | create, list, accept, reject — the anchor + the accept gate |
| `src/features/pages/lib/pageStore.ts` | the page list, the current page, the cursor |
| `src/features/pages/hooks/usePageRoom.ts` | the client Yjs doc + provider for a page |
| `src/features/pages/components/SuggestionBlock.tsx` | the proposed-replacement diff + accept/reject |
| `src/features/pages/components/PageEditor.tsx` | the TipTap-v3 editor bound to the page doc — synced through the `PageRoom` provider, **not** Hocuspocus (Node-only; P31's sync is the DO room pattern) |
| `src/features/pages/components/PageTree.tsx` | the space → folder → page → subpage tree (flat list + one O(n) parent-map pass) |
| `src/features/pages/components/PagesSurface.tsx` | *(new)* mount the tree + editor + suggestions (a feature surface, like `src/features/docs/components/DocsSurface.tsx`) |
| `src/bus/events.ts` | *(modified)* `page.created`, `page.deleted`, `page.restored`, `suggestion.created`, `suggestion.resolved` |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| concurrent edit converges | two editors change the same page; both survive | last-write-wins → one edit lost |
| suggestion gated | an agent proposes; content is unchanged until accepted | proposal applies immediately |
| anchored suggestion | the suggestion stays on its range through an edit above it | anchor drifts or detaches |
| orphaned anchor | delete the anchored text → the suggestion renders orphaned with its quote | it vanishes or crashes |
| standalone page | a standalone page shared → the space is not opened | sharing the page opens the space |
| trash + restore | delete → the page is in Trash; restore → it is back | hard delete on first click |
| subpage cascade | delete a parent → children move to Trash | children orphaned in the tree |

## The gate

```bash
node scripts/gate.mjs --feature pages
npx playwright test tests/e2e/pages.spec.ts
```

The structural assertions are a precondition. The behavioural assertions are the
gate: (a) two contexts edit a page and both changes survive; (b) an agent's
suggestion does not change the content until accepted; (c) deleting the anchored
text orphans the suggestion rather than crashing.

## The escalation

When this feature blocks a surface, the surface does not ship pages. A page that
loses an edit is worse than no page — the author believes their work is saved,
and an agent's silent overwrite is the failure the suggestion channel exists to
prevent.