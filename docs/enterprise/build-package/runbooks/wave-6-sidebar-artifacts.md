<!-- P31-HEADER
id: p31_wave_6_sidebar_artifacts_20261006_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Wave 6 — The Thread List and the Artifact Panel (Convergence, part 5)

## Scope note (the honest line)

Waves 2–5 built a chat surface with real transport, interface, tools, and
history. Wave 6 completes the 3-column workbench: the left rail becomes a
thread list, the right rail becomes an artifact panel. Five things land:

1. **The thread list** — cursor pagination `(lastMessageAt, sessionId)`, date
   buckets, search, pin.
2. **The sidebar virtualizer** — the absolute-positioning contract, no flicker.
3. **Artifact detection** — the pure `detectArtifacts` function with pinned thresholds.
4. **The artifact store** — `kind + title` dedupe, version history.
5. **The artifact pane** — the sandboxed preview, the version stepper, the
   memoized viewer.

Plus three corrections carried from Wave 5's review:

6. **The cold-start flake is fixed, not documented.** `webServer.timeout` bump and
   a `waitForSelector` on the first row before the scroll.
7. **The prepend-skip moves to the component that decides.** Wave 5's `isPrepend`
   is dead code in the hook; the bottom pull lives in the component.
8. **The race/stall/latch bugs get a behavioural assertion**, not just the
   anchor-stability test.

**Explicitly not in this wave:** token-level streaming with tools (JSON Mode
blocks it), artifact sharing, and artifact persistence beyond the session.

## The DAG

```yaml
version: "1.0"
name: wave-6-sidebar-artifacts
inputs:
  - name: scope_lock
    required: true
    description: "src/shell/chat/**, src/faces/chat/**, functions/api/conversations/**, tests/e2e/**, playwright.config.ts, scripts/gate.mjs"
  - name: role
    required: false
    default: operator

nodes:
  # ── Phase 1 — Read (deterministic) ─────────────────────────────────────
  - id: read-master
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/00-MASTER.md]

  - id: read-thread-list
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/features/thread-list.md]
    depends: [read-master]

  - id: read-artifacts
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/features/artifacts.md]
    depends: [read-master]

  - id: read-virtualizer
    type: deterministic
    command: cat
    args: [portals/shell/src/shell/chat/useThreadVirtualizer.ts]
    depends: [read-thread-list]

  - id: read-chat-face
    type: deterministic
    command: cat
    args: [portals/shell/src/faces/chat/ChatFace.tsx]
    depends: [read-thread-list, read-artifacts]

  - id: read-playwright
    type: deterministic
    command: cat
    args: [portals/shell/playwright.config.ts]
    depends: [read-thread-list]

  # ── Phase 2 — Fix the Wave 5 gate corrections (agentic) ───────────────
  - id: fix-flake
    type: agentic
    prompt: |
      Fix the Wave 5 cold-start flake. In portals/shell/playwright.config.ts bump
      webServer.timeout to 120_000. In tests/e2e/load-older.spec.ts add a
      waitForSelector on the first [data-message-id] row after the goto and
      before the scroll. The gate must pass on a cold checkout.

  # ── Phase 3 — Build (agentic) ─────────────────────────────────────────
  - id: build
    type: agentic
    prompt: |
      Read features/thread-list.md and features/artifacts.md.
      Build the thread list and artifact panel exactly as described:
      1. Create functions/api/conversations/index.ts — cursor pagination over
         bus_events grouped by session_id; cursor is (last_message_at, session_id)
         exclusive; limit+1 probe for hasMore.
      2. Create src/shell/chat/threadListClient.ts — fetchThreads(before, limit).
      3. Create src/shell/chat/useThreadListOnScroll.ts — bottom sentinel,
         in-flight guard, ref-guard on the query identity.
      4. Create src/shell/chat/threadListStore.ts — list, cursor, hasMore, date
         buckets (Today / Yesterday / This Week / This Month / Older) computed
         from lastMessageAt against local midnight.
      5. Create src/shell/chat/useThreadListVirtualizer.ts — start-anchored
         absolute-positioning contract (spacer + translateY), NOT padding.
      6. Create src/shell/chat/ThreadList.tsx — rows, bucket headers, search,
         new-thread; active row pinned.
      7. Create src/shell/chat/artifactDetect.ts — pure detectArtifacts with
         pinned thresholds (HTML, SVG ≥ 2k chars, code fences ≥ 48 lines or 3k
         chars) and title derivation.
      8. Create src/shell/chat/artifactStore.ts — per-session registry,
         kind+title dedupe, content-hash versions.
      9. Create src/shell/chat/ArtifactCard.tsx — transcript card.
      10. Create src/shell/chat/ArtifactPane.tsx — memoized on content+version;
          version stepper, PREVIEW/SOURCE, copy, download.
      11. Create src/shell/chat/ArtifactPreview.tsx — iframe sandbox="allow-scripts"
          alone (no allow-same-origin) + SVG path.
      12. Modify src/faces/chat/ChatFace.tsx — ThreadList left, ArtifactPane right.
      13. Relocate the prepend-skip: remove dead isPrepend from
          useLoadOlderOnScroll.ts; the bottom-pull decision lives in the component.
      14. Create tests/e2e/thread-list.spec.ts — sidebar flicker gate.
      15. Create tests/e2e/artifacts.spec.ts — artifact memoization gate.
      Only touch the scope lock. Do NOT re-declare scroller CSS. Do NOT write
      scrollTop manually in the sidebar.
    depends: [fix-flake, read-virtualizer, read-chat-face]

  # ── Phase 4 — Gate (structural + behavioural) ─────────────────────────
  - id: gate-thread-list
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, thread-list]
    depends: [build]

  - id: gate-artifacts
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, artifacts]
    depends: [build]

  - id: gate-behavioural
    type: deterministic
    command: npx
    args: [playwright, test, tests/e2e/]
    cwd: portals/shell
    depends: [build]

  - id: gate-load-older
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, load-older]
    depends: [build]

  - id: gate-tools
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, tool-protocol]
    depends: [build]

  - id: gate-primitives
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, chat-primitives]
    depends: [build]

  - id: gate-surface
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --surface, chat]
    depends: [build]

  - id: gate-build
    type: deterministic
    command: npm
    args: [run, build]
    cwd: portals/shell
    depends: [build]

  - id: gate-typecheck
    type: deterministic
    command: npm
    args: [run, typecheck]
    cwd: portals/shell
    depends: [build]

  # ── Phase 5 — Approval (human) ────────────────────────────────────────
  - id: review
    type: approval
    prompt: "Thread list and artifact panel built and gated. Deploy to production?"
    depends: [gate-thread-list, gate-artifacts, gate-behavioural, gate-load-older, gate-tools, gate-primitives, gate-surface, gate-build, gate-typecheck]

  # ── Phase 6 — Deploy (deterministic) ──────────────────────────────────
  - id: deploy
    type: deterministic
    command: npm
    args: [run, deploy]
    cwd: portals/shell
    depends: [review]

edges:
  - from: read-master
    to: read-thread-list
    contract: { requires: [package-exists], ensures: [contract-read] }
  - from: fix-flake
    to: build
    contract: { requires: [gate-deterministic], ensures: [gate-clean-on-checkout] }
  - from: build
    to: gate-thread-list
    contract: { requires: [sidebar-built], ensures: [structural-green] }
  - from: build
    to: gate-behavioural
    contract: { requires: [sidebar-built], ensures: [no-flicker-no-rerender] }
  - from: gate-behavioural
    to: review
    contract: { requires: [behavioural-green], ensures: [human-approval] }
  - from: review
    to: deploy
    contract: { requires: [human-approval], ensures: [deployed] }

error_handlers:
  - on: gate-thread-list-failed
    action: abort
    message: "Thread list gate red. The cursor or the bucket computation is broken."
  - on: gate-artifacts-failed
    action: abort
    message: "Artifacts gate red. Detection, dedupe, or sandbox is wrong."
  - on: gate-behavioural-failed
    action: abort
    message: "The sidebar flickers or the pane re-renders per token."
  - on: gate-load-older-failed
    action: abort
    message: "Wave 5 regressed."
  - on: gate-primitives-failed
    action: abort
    message: "Wave 3 primitives regressed."
```

## The gate

```bash
node scripts/gate.mjs --feature thread-list
node scripts/gate.mjs --feature artifacts
npx playwright test tests/e2e/
```

Structural assertions (precondition): cursor tuple, `limit+1` probe, absolute
positioning (no padding), date buckets, pinned detection thresholds, `kind+title`
dedupe, `allow-scripts`-only sandbox, memo on `content+version`, prepend-skip
relocated.

Behavioural assertions (the gate): sidebar no-flicker, artifact pane
memoization, and Wave 5's three unverified bugs (race, stall, latch).

## The negative control

```bash
# Plant: padding-based positioning (assertion fails)
sed -i 's/position: absolute/paddingTop: 0/' portals/shell/src/shell/chat/useThreadListVirtualizer.ts
npx playwright test tests/e2e/thread-list.spec.ts   # MUST fail

# Plant: allow-same-origin (assertion fails)
sed -i 's/sandbox="allow-scripts"/sandbox="allow-scripts allow-same-origin"/' portals/shell/src/shell/chat/ArtifactPreview.tsx
node scripts/gate.mjs --feature artifacts --quick   # MUST exit 1

# Plant: remove the memo (assertion fails)
sed -i 's/memo(ArtifactPane)/ArtifactPane/' portals/shell/src/shell/chat/ArtifactPane.tsx
npx playwright test tests/e2e/artifacts.spec.ts   # MUST fail
```

The first three plants are the ones that matter: the sidebar flicker is the bug
Hermes spent a PR on; the same-origin escape is a security hole; the per-token
re-render is the jank that makes the artifact panel unusable during streaming.
All three pass typecheck, unit tests, and every structural gate.