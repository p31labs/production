<!-- P31-HEADER
id: p31_feature_search_20261006_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Feature: Search and the Command Palette

## The invariant

A participant can find any thread, page, artifact, or action from one keyboard
surface in under a second; the search index is a projection over the ledger, not
a second store; a stale response never overwrites a fresh one; and the palette
is fully keyboard-navigable with a visible empty state.

## The boundary

This feature does **not** own:

- **The ledger** — `bus_events` is the corpus. The index is derived from it.
- **The thread list** — Wave 6's `ThreadList` owns the sidebar. The palette
  surfaces the same threads by search, not by scroll.
- **Pages** — Wave 9's `PageTree` owns navigation. The palette links into it.
- **The activity feed** — a separate feature. The feed is a timeline; search is
  a query.
- **Semantic embeddings** — this wave ships lexical (FTS5) plus graph-adjacency
  ranking. A vector index is a later wave with its own cost model.

Four rules this feature owns outright:

1. **The index is derived from the ledger and rebuildable.** An FTS5 virtual
   table over `bus_events` with triggers on insert. Dropping and rebuilding it
   loses nothing — the ledger is the source of truth. The same discipline Wave 5
   applied to the load-older cursor: the index is a projection, never a second
   writer.
2. **A stale response never wins.** Every query carries a request id; a response
   whose id is not the latest in flight is discarded. The palette debounces at
   150ms and the input is never blocked.
3. **The ranking is lexical plus adjacency.** FTS5 `bm25()` is the base score; an
   event that shares a `session_id`, `did`, or `page_id` with the current context
   is boosted. This is the P31 analogue of Glean's knowledge-graph signals — the
   graph is the ledger's existing foreign keys, not a new structure.
4. **The palette renders four groups and always shows an empty state.** Threads,
   Pages, Artifacts, Actions. An empty query shows recents, not nothing. A query
   with no results shows "No results for X" and the actions group — never a
   blank panel.

### The decisions (answered before the build)

| Question | Decision |
|---|---|
| Does the index live in D1 or the Durable Object? | **D1, over `bus_events`.** A session's live Yjs draft is not searchable until it commits — the same rule Wave 8 set for the ledger (commits, not keystrokes). Indexing the DO's live doc would surface text the author has not sent. |
| Is semantic search in scope? | **No.** Lexical (FTS5) + adjacency boost. A vector index is a separate wave with its own embedding and cost budget. |
| Is the export in scope? | **No.** Export is `compliance.md`. Search reads the ledger; it never exports it. |

## The implementation

| File | What it provides |
|---|---|
| `migrations/0007_search.sql` | `search_fts` virtual table (FTS5) + insert triggers on `bus_events` |
| `functions/api/search/index.ts` | `?q=&scope=&limit=` — FTS5 match, adjacency boost, grouped results |
| `src/shell/search/searchStore.ts` | the query state, the request-id guard, the 150ms debounce |
| `src/shell/search/CommandPalette.tsx` | the `cmdk` overlay: input, groups, keyboard nav, the eight states |
| `src/shell/search/useGlobalShortcut.ts` | ⌘K / Ctrl+K binding, escape, focus management |
| `src/shell/search/recentItems.ts` | the recently-used list (derived from the ledger, not localStorage) |
| `src/shell/Shell.tsx` | *(modified)* mount the palette above every face |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| the index is derived | drop `search_fts` and rebuild → identical results | the index holds data the ledger does not |
| stale response discarded | fire query A then B; A resolves late → B's results render | A overwrites B |
| keyboard only | open, type, arrow, enter, escape — no mouse | a step requires a click |
| empty state | open with no query → recents render | blank panel |
| no results | query "zzzz" → "No results" + the actions group | blank panel |
| adjacency boost | a result in the current session ranks above an equal match elsewhere | pure lexical order |
| eight states | each of the eight designed states renders | a state falls through to a crash |

## The gate

```bash
node scripts/gate.mjs --feature search
npx playwright test tests/e2e/search.spec.ts
```

The structural assertions are a precondition. The behavioural assertions are the
gate: (a) ⌘K opens the palette from any face; (b) typing filters without
blocking; (c) a late response never overwrites a fresh one; (d) keyboard-only
navigation completes a full round trip.

## The escalation

When this feature blocks a surface, the surface does not ship search. A
workspace with 500 threads and no search is a workspace where nothing is
findable — the sidebar becomes a scroll and the ledger becomes write-only.