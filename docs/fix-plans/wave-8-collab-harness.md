# fix: Wave 8 collaboration behavioural harness is not built

<!-- P31-HEADER
id: p31_fix_plan_wave8_collab_harness_20261006_v1.0
type: fix-plan
component: shell
status: open
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

## Symptom

Wave 8's structural build is complete (collaboration 10/10, agent-presence
4/4, typecheck/build/vitest all green), but the behavioural spec
`portals/shell/tests/e2e/collaboration.spec.ts` references harness hooks that
do not exist: a `.draft` editable document, `.presence-avatar` elements, a
`#run-turn` trigger, and a `.remote-cursor` overlay. The existing harness
(`harness.html` / `harness.tsx`, `harness-threads`, `harness-streaming`,
`harness-artifacts`) provides thread/stream/artifact hooks only — none of the
collab hooks. `npx playwright test tests/e2e/` therefore fails on the
collaboration spec until the harness is extended.

## Evidence

```bash
cd portals/shell
grep -rl "run-turn\|class=.draft\|presence-avatar\|remote-cursor" harness*.html
# → no output (the hooks are absent)

npx playwright test tests/e2e/collaboration.spec.ts
# → fails: the .draft / .presence-avatar / #run-turn / .remote-cursor locators
#   time out against harness.html
```

## The fix

Extend the harness (either `harness.html` or a dedicated `harness-collab.html`)
to mount a draft editor bound to `useCollabStore`, render `PresenceBar` and
`RemoteCursor`, and expose a `#run-turn` button that fires a stub turn. The
room endpoint can be stubbed in-harness (a no-op WebSocket) so the two-browser
convergence and presence assertions exercise the client sync + overlay paths
without a live Workers runtime.

## Why it is not done yet

The structural layer (room DO, upgrade seam, server→room phase push,
attribution, awareness relay, overlay) is built and gated. The behavioural
harness is the remaining piece of Wave 8 Phase 4; it needs a draft-editor
fixture and a stub room, which are harness work, not feature work.