<!-- P31-HEADER
id: p31_plan_marketplace_human_simplification_20261012_v1.0
type: plan
component: portals/mcp-marketplace
status: live
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# Plan — Marketplace Hub: human simplification + device tiers

**Trigger:** first live build reviewed as "AI sloppish" — cramped topbar, empty
pages, developer jargon. Audience: a 70-year-old, a 10-year-old, a friend's
wife. Scales: Chromebook dev, mobile-first users, ESP-32 Node Zero.

## Research principles (sealed)

1. Plain language = 5th-grade reading level, Gunning Fog ≤ 8.0, Hemingway
   graded, GATE-ENFORCED (else it regresses).
2. COGA-first: familiar affordances, consistent layout, personalization
   (users adapt the UI); no flat-design guessing; security must not bar
   cognitive-disability users.
3. Cognitive load numbers: nav ≤5 items, ≤7 cards/grid, 1 primary action per
   screen, working-memory chunks ≤4–7, topbar ≤4 interactive elements.
4. Responsive 2026 = container queries + fluid `clamp()` type + `cqi` units
   (Baseline since Aug 2025); components adapt to container, not viewport.
5. ESP-32 budget: LittleFS 512KB → <100KB web UI, gzip `.gz` assets,
   minimal token subset (~20–30), not the full tree.
6. Production ≠ deployed: IdP auth, externalized secrets, monitoring with
   alerting, backup/restore.

## Wording mapping (locked)

| Now | Becomes |
|---|---|
| Inspect any URL | Try a server |
| governed / public | Admin view (hidden unless signed in) |
| MAKER | gone |
| claim did:key | Sign in |
| spoon dots | Energy (settings sheet: "How much energy right now?") |
| Calm pill | "Reduce motion" toggle (settings sheet) |
| LOVE settled | Payment confirmed |
| probe failed: server did not answer server/discover | We couldn't reach that server. Check the address and try again. |
| RFC 8707 audience binding | This sign-in doesn't work here. Try again. |
| backend unreachable (network/CORS) / backend unavailable | The helper isn't connected right now. |
| Ctrl+K hint | tooltip only |

## Waves

- **W1 Words** — string sweep to 5th grade; `scripts/plain-language-scan.mjs`
  gate (FK >8 or jargon blocklist → fail; self-test negative control).
- **W2 Chrome** — topbar = logo · nav(Home/Discover/Playground/Publish) ·
  search · identity chip; settings sheet (Energy, Reduce motion, role);
  `scripts/check-cognitive-load.mjs` gate (nav ≤5, topbar ≤4 interactive,
  cards/grid ≤7; negative control).
- **W3 Stories** — Home = 3 cards (Find a tool / Try a tool / Share a tool);
  Discover real empty state + simple cards (name, one-liner, Open); Server
  default tab = Install; Playground numbered 1-2-3 with "Show technical
  details" disclosure; Publish 3-step wizard; Review hidden without access;
  task-completion suite (find/try/publish < 1 min each).
- **W4 Device tiers** (design-core) — device token groups (phone/chromebook/
  desktop/embedded), fluid clamp() type+spacing, cqi + container-query
  utilities, embedded tier ~20-30 tokens + <100KB gzipped shell emitter.
  Additive only; existing token paths unchanged.
- **W5 Production** (parallel/owner-gated) — Access auth, registry probe
  alerting, secret rotation runbook, D1/KV backup/restore runbook, gateway
  redeploy (owner token). Filed: see docs/fix-plans.

## Gates

Each wave: fix-plan first → gate with proven negative control → portal gates
(typecheck/lint/test/build/v:gate, canon forks 0) → deploy → live check →
`mcp:health` 16/16.