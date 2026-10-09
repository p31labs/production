# fix: Wave 9a has three correctness bugs that make pages not actually work

<!-- P31-HEADER
id: p31_fix_plan_wave9a_correctness_20261006_v1.0
type: fix-plan
component: shell
status: resolved
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

## Symptom

Wave 9a is structurally green (pages 8/8, typecheck/build/vitest 101/101), but
three defects mean the feature does not work as specified, and no gate caught
them:

1. **The suggestions store is per-request.** `functions/api/pages/[id]/suggestions.ts`
   holds `const suggestions = new Map<string, SuggestionRecord>()` at module
   scope. Cloudflare Pages Functions run in ephemeral isolates; a suggestion
   created in one request is invisible in the next, so `accept`/`reject` will
   404 on every real suggestion. It is not a cache — it is the feature not
   working.
2. **The checkpoint `seq` resets on hibernation.** `room/src/PageRoom.ts` holds
   `private seq = 0`. Hibernation discards in-memory state, so the next
   checkpoint writes `seq = 1` again; `INSERT OR REPLACE` on
   `(page_id, seq, chunk)` overwrites the prior version's rows, leaving stale
   chunks whose `hash` no longer matches the content.
3. **Page events pollute `session_id`.** `page.created`/`page.deleted`/
   `page.restored` are appended with `sessionId: <pageId>`. The ledger's
   `session_id` column now holds page ids for page events and session ids for
   chat events, so "all events in session X" is no longer answerable.

## Evidence

```bash
grep -n "const suggestions = new Map" portals/shell/functions/api/pages/[id]/suggestions.ts  # → line 22
grep -n "private seq = 0" portals/shell/room/src/PageRoom.ts                                 # → line 31
grep -n "sessionId: id\|sessionId: pageId" portals/shell/functions/api/pages/index.ts portals/shell/functions/api/pages/[id]/index.ts
```

## The fix

1. Move suggestions to D1 (`migrations/0004_suggestions.sql`), with
   `accepted` NULL = pending, 1 = accepted, 0 = rejected. The accept path reads
   the row, checks `accepted IS NULL`, applies the replacement, sets
   `accepted = 1`, appends `suggestion.resolved`. A second accept sees
   `accepted = 1` and returns 409 — idempotent, not a race.
2. Derive `seq` from `SELECT COALESCE(MAX(seq), 0) + 1 FROM page_versions WHERE
   page_id = ?` instead of an in-memory counter.
3. Append page events with `sessionId: ''` and carry the page id in `pageId`
   (the event shape already has it). `session.joined`/`session.left` keep their
   session ids.

## Why it is not done yet

Resolved this turn (Phase 0 of Wave 9b): suggestions moved to D1
(`migrations/0004_suggestions.sql`), `seq` derived from `MAX(seq)+1`, and page
events appended with `sessionId: ''`. The `pages` gate gained a
"suggestions are D1-backed" assertion and the `collaboration` gate gained a
SessionRoom-hibernation assertion so both fixes are now enforced.