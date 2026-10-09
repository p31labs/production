# fix: the collab behavioural harness is a stub — convergence and presence are not actually exercised

<!-- P31-HEADER
id: p31_fix_plan_collab_harness_fidelity_20261006_v1.0
type: fix-plan
component: shell
status: resolved
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

## Symptom

The behavioural gate is now **runnable** (Phase 0a of Wave 9b): `vite` + Playwright
execute and return real results. Of the 7 collab/pages specs, 3 pass and 4 fail,
and the 4 failures are harness-fidelity gaps, not feature bugs:

1. `two contexts edit the draft and both edits survive` (x2: collaboration + pages)
   — fails because (a) two **browser contexts** cannot share a `BroadcastChannel`,
   and (b) the harness textarea does a **full replace** (`ytext.delete(0,len);
   ytext.insert(0,value)`) on every change, so there is no Yjs merge for the two
   edits to converge on.
2. `a join shows a presence avatar and a disconnect removes it` — the harness
   **seeds** two static presence entries (`did` + `PEER`), so the count is 2
   regardless of how many pages connect. Presence is not synced across pages.
3. `deleting the anchored text orphans the suggestion` — fixed this turn: the
   harness now resolves a real `Y.RelativePosition` and orphans when the resolved
   index no longer holds the anchored text (a soft-deleted item does not resolve
   to `null` until GC, so `== null` alone was insufficient).

## Evidence

```
npx playwright test tests/e2e/pages.spec.ts tests/e2e/collaboration.spec.ts
# 3 passed, 4 failed — the two-context convergence/presence tests and the orphan test
```

## The fix

Rebuild the harness so it exercises the real mechanisms:

1. **Incremental binding.** Bind the textarea to the `Y.Text` with
   `ytext.observe` (render on change) and, on textarea input, apply a delta
   (delete the differing range, insert the new suffix) rather than
   `delete(0, len) + insert(0, value)`. A full-replace document cannot converge.
2. **Single-context, multi-page.** Change the convergence/presence/focus tests
   from `browser.newContext()` ×2 to `context.newPage()` ×2 — `BroadcastChannel`
   crosses pages in one context, not separate contexts.
3. **Presence over the channel.** Broadcast awareness state on the channel
   (alongside doc updates) and rebuild `useCollabStore.presence` from received
   frames, so a join actually adds an avatar and a disconnect removes it.

## Why it is not done yet

The correctness fixes (suggestions → D1, `seq` → `MAX(seq)+1`, page events
`sessionId: ''`, gated hibernation) landed this turn and are green. The harness
fidelity work is test infrastructure — it is the remaining piece that turns the
behavioural gate from "runnable" into "green", and it is the next move before
the 9b feature build (comments/notifications/BYOK).