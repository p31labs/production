<!-- P31-HEADER
id: p31_wave_5_pagination_20261006_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Wave 5 — Load-Older Pagination (Convergence, part 4)

## Scope note (the honest line)

Waves 2–4 built the chat surface: transport, interface, tools. Wave 5 makes the
history real. Four things land:

1. **The cursor walk** — `?before=&limit=&session=` paging on the events endpoint,
   a `limit + 1` probe to compute `hasMore`, a bounded filtered-page hop.
2. **The sentinel** — a top `IntersectionObserver` with a one-viewport
   `rootMargin` to prefetch, an in-flight guard against double-fetches.
3. **The four-bug fixes** — the bottom-yank (skip the bottom pull on prepend),
   the double compensation (verify the Wave 3 CSS holds), the cross-conversation
   bleed (ref-guard on the captured conversation id), and the stalled cursor
   (bounded hops).
4. **The behavioural gate** — Playwright mounts 200 messages, prepends 50,
   asserts the anchor's `boundingBox().y` is unchanged within 1px.

Plus two spec corrections carried from Wave 4's review:

5. **The approval interaction is a ledger event** — the user's click on the
   approval gate appends `tool.approval.recorded`, so the audit trail includes
   the human decision, not just its consequence.
6. **The tool-response shape is pinned** — `parseToolCall` records the expected
   Workers AI shape in a comment and the spec names the model whose shape it
   assumes.

**Explicitly not in this wave:** token-level streaming with tools (JSON Mode
does not stream; the two-phase turn is its own design), the threads sidebar, and
the artifact panel. The sidebar and panel are Wave 6.

## The DAG

```yaml
version: "1.0"
name: wave-5-pagination
inputs:
  - name: scope_lock
    required: true
    description: "src/shell/chat/**, functions/api/bus/events.ts, src/bus/events.ts, src/faces/chat/**, scripts/gate.mjs, tests/e2e/**"
  - name: role
    required: false
    default: operator

nodes:
  # ── Phase 1 — Read (deterministic) ─────────────────────────────────────
  - id: read-master
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/00-MASTER.md]

  - id: read-feature
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/features/load-older.md]
    depends: [read-master]

  - id: read-thread-store
    type: deterministic
    command: cat
    args: [portals/shell/src/shell/chat/threadStore.ts]
    depends: [read-feature]

  - id: read-thread
    type: deterministic
    command: cat
    args: [portals/shell/src/shell/chat/Thread.tsx]
    depends: [read-feature]

  - id: read-events-endpoint
    type: deterministic
    command: cat
    args: [portals/shell/functions/api/bus/events.ts]
    depends: [read-feature]

  # ── Phase 2 — Build (agentic) ─────────────────────────────────────────
  - id: build-pagination
    type: agentic
    prompt: |
      Read the feature contract at docs/enterprise/build-package/features/load-older.md.
      Build load-older pagination exactly as described. The four rules in the
      contract are the four bugs from the elizaOS reference — do not re-derive
      them.
      1. Modify functions/api/bus/events.ts — accept ?before=<id>&limit=<n>&session=<id>,
         return { events, hasMore } using a limit+1 probe. The before-cursor is
         the ledger id and is exclusive (WHERE id < before ORDER BY id DESC).
      2. Create src/shell/chat/paginationClient.ts — fetchOlder(sessionId, before,
         limit) with the bounded filtered-page hop (MAX_FILTERED_PAGE_HOPS).
      3. Create src/shell/chat/useLoadOlderOnScroll.ts — the top sentinel
         IntersectionObserver (rootMargin: one viewport), an in-flight guard, and
         a ref-guard on the conversation id captured at trigger time.
      4. Modify src/shell/chat/threadStore.ts — add loadOlder(older), hasMore,
         loadOlderInFlight, and a per-conversation hasMore latch. loadOlder
         prepends and dedupes by id.
      5. Modify src/shell/chat/Thread.tsx — render the top sentinel above the
         first virtual item, and add data-message-id={msg.id} to every row so the
         behavioural gate can locate the anchor.
      6. Fix the bottom-yank — in the auto-scroll effect, recognize a prepend
         (previous top message still present, pushed to a deeper index; new
         content only lands at the tail) and skip the bottom pull for it.
      7. Add tool.approval.recorded to src/bus/events.ts and append it when
         useToolApproval resolves — the human decision is a ledger event.
      8. Pin the tool-response shape — add a comment in
         functions/api/chat/stream.ts naming the Workers AI tool-call shape
         parseToolCall assumes.
      9. Create tests/e2e/load-older.spec.ts — the behavioural gate. Mount 200
         messages, scroll to the middle, locate an anchor row by data-message-id,
         record its boundingBox().y, trigger a prepend of 50, assert the anchor's
         y is unchanged within 1px.
      Only touch the files in the scope lock. Do NOT write scrollTop manually —
      the virtualizer owns it. Do NOT re-declare overflow-anchor or
      overscroll-behavior — Wave 3 owns those.
    depends: [read-thread-store, read-thread, read-events-endpoint]

  # ── Phase 3 — Gate (structural + behavioural) ─────────────────────────
  - id: gate-feature
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, load-older]
    depends: [build-pagination]

  - id: gate-behavioural
    type: deterministic
    command: npx
    args: [playwright, test, tests/e2e/load-older.spec.ts]
    cwd: portals/shell
    depends: [build-pagination]

  - id: gate-surface
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --surface, chat]
    depends: [build-pagination]

  - id: gate-primitives
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, chat-primitives]
    depends: [build-pagination]

  - id: gate-tools
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, tool-protocol]
    depends: [build-pagination]

  - id: gate-build
    type: deterministic
    command: npm
    args: [run, build]
    cwd: portals/shell
    depends: [build-pagination]

  - id: gate-typecheck
    type: deterministic
    command: npm
    args: [run, typecheck]
    cwd: portals/shell
    depends: [build-pagination]

  # ── Phase 4 — Approval (human) ────────────────────────────────────────
  - id: review
    type: approval
    prompt: "Pagination built and behaviourally gated. Deploy to production?"
    depends: [gate-feature, gate-behavioural, gate-surface, gate-primitives, gate-tools, gate-build, gate-typecheck]

  # ── Phase 5 — Deploy (deterministic) ──────────────────────────────────
  - id: deploy
    type: deterministic
    command: npm
    args: [run, deploy]
    cwd: portals/shell
    depends: [review]

edges:
  - from: read-master
    to: read-feature
    contract: { requires: [package-exists], ensures: [contract-read] }
  - from: read-feature
    to: read-thread-store
    contract: { requires: [contract-read], ensures: [store-read] }
  - from: build-pagination
    to: gate-feature
    contract: { requires: [pagination-built], ensures: [structural-green] }
  - from: build-pagination
    to: gate-behavioural
    contract: { requires: [pagination-built], ensures: [anchor-stable] }
  - from: gate-feature
    to: review
    contract: { requires: [structural-green], ensures: [human-approval] }
  - from: review
    to: deploy
    contract: { requires: [human-approval], ensures: [deployed] }

error_handlers:
  - on: gate-feature-failed
    action: abort
    message: "Load-older structural gate red. The cursor walk or the store is broken."
  - on: gate-behavioural-failed
    action: abort
    message: "The anchor moved. The reader lost their place — this is the bug the wave exists to prevent."
  - on: gate-primitives-failed
    action: abort
    message: "Wave 3 primitives regressed. Pagination touched the scroller it does not own."
```

## The gate

```bash
node scripts/gate.mjs --feature load-older
npx playwright test tests/e2e/load-older.spec.ts
```

Structural assertions (the precondition):

| # | Assertion | Proves |
|---|---|---|
| 1 | the events endpoint accepts `before` + `limit` | The cursor walk exists |
| 2 | `hasMore` is computed from a `limit + 1` probe | No second query |
| 3 | `loadOlder` prepends and dedupes | The store contract |
| 4 | the in-flight guard exists | No double-fetch |
| 5 | the result is ref-guarded on the conversation id | No cross-conversation bleed |
| 6 | the bottom pull is skipped for a prepend | No bottom-yank |
| 7 | `MAX_FILTERED_PAGE_HOPS` bounds the cursor hop | No stall |
| 8 | `tool.approval.recorded` is in the event union | The human decision is audited |
| 9 | rows carry `data-message-id` for the anchor test | The test can locate the anchor |
| 10 | typecheck passes | No type contract violated |
| 11 | build passes | The bundle builds |

Behavioural assertion (the gate):

| # | Assertion | Proves |
|---|---|---|
| 12 | prepend 50 → anchor `boundingBox().y` unchanged (±1px) | The reader does not lose their place |

Assertions 10–11 are skipped under `--quick`. Assertion 12 is never skipped.

## The negative control

```bash
# Plant: re-enable the bottom pull on prepend (assertion 12 fails)
sed -i 's/if (isPrepend) return;/if (false) return;/' portals/shell/src/shell/chat/useLoadOlderOnScroll.ts
npx playwright test tests/e2e/load-older.spec.ts   # MUST fail — anchor yanked to bottom
git checkout portals/shell/src/shell/chat/useLoadOlderOnScroll.ts

# Plant: remove the cross-conversation ref-guard (assertion 5 fails)
sed -i 's/conversationIdRef.current === capturedId/true/' portals/shell/src/shell/chat/useLoadOlderOnScroll.ts
node scripts/gate.mjs --feature load-older --quick   # MUST exit 1
git checkout portals/shell/src/shell/chat/useLoadOlderOnScroll.ts
```

The first plant is the one that matters: the bottom-yank bug is the feature
killing itself — the reader scrolls up, a page loads, and a passive effect
smooth-scrolls them back to the newest message.