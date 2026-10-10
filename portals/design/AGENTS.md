# AGENTS.md — P31 Design System Portal (Quantum Material)

## Repository
- Live: `design.p31ca.org` · Source: this directory (`production/portals/design/`)
- Stack: React 19 · Vite 6 · React Router 6 · Tailwind v4 · Zustand · Vitest · Cloudflare Pages
- Design canon: `@p31ca/design-core` **3.0.1** (vendored tarball `vendor/p31-design-core-3.0.1.tgz`)
- Canon source: `production/packages/design-core/` · Deploy: `pnpm deploy`

## Read before editing
1. `docs/SYSTEM_ARCHITECTURE.md` — IA, shell, routes, surfaces, canon (facts)
2. `docs/BUILD_SPEC.md` — Quantum Material invariants, tokens, patterns (rules)
3. `docs/AGENT_RUNBOOK.md` — roles, workflow, gates, incident response (procedures)

## Non-negotiables
- **Empirical visual verification (P2ER rule):** All claims regarding component rendering MUST be verified against the rendered DOM/browser before asserting to the user. The agent cannot report a UI change complete without the structural layout gate (`layout-invariants.mjs`) having passed against the built preview. This is the fix for "the agent said done but the topbar was clipped."
- Colors: OKLCH / `color-mix(in oklch, …)` only. Raw hex/rgba forbidden — the canon gate
  `node <design-core>/scripts/token-audit.mjs` fails on any raw literal in design sources.
- Portal-owned `src/tokens.css` (hue-270 neutrals + quantum accents) is imported LAST so the portal wins.
- Every surface root carries `data-mcp-tool` (set on `.portal-main` per route via `src/lib/mcpTools.ts`).
- Do not hand-edit `vendor/*.tgz` — re-pack from the canon (`npm pack` in design-core) and `pnpm install`.
- Spoon 0 = calm floor: CrisisOverlay is the ONLY chrome; no motion, no blur.

## Gates (run from this directory after every edit)
`pnpm typecheck && pnpm lint && pnpm test && pnpm build && node <dc>/scripts/token-audit.mjs && pnpm v:gate`

## Efficient test loop (DO NOT re-run the full suite to see a failure)
The `| grep -E "passed|failed"` pipe swallows the failure detail. Instead:
1. **Read the persisted report** — failures are in `playwright-report/` + `test-results/results.json` after ANY run. No re-run needed.
   - `npx playwright show-report` — HTML report with traces + screenshots
   - `pnpm test:json` — list failures from `test-results/results.json`
   - `npx playwright show-trace test-results/<name>/trace.zip` — DOM snapshot of the failure
2. **Re-run only failures** — `pnpm test:last-failed` (`--last-failed --reporter=line`). Seconds, not 400s.
3. **Target one test** — `pnpm test:one "<title>"` or `npx playwright test <spec>:<line>`.
4. **Run one project** to avoid parallel contention (the 3-project parallel run produces false `locator.click` timeouts): `pnpm test:acceptance`, `pnpm test:visual`.
5. **Full gate = serial** — `npx playwright test --workers=1` (~3 min) for the real end-to-end; the parallel `build:pwa` thrashes the machine and flags false failures.

The `.last-run.json` is written to `test-results/` — `--last-failed` reads it. Trace (`on-first-retry`) + JSON/HTML reporters are already configured.

## Escalation
- Gate failure after revert → Workspace Architect (Runbook §3.2)
- Vendor/canon drift → re-pack the current-version tarball from design-core (pnpm sync:vendor); `pnpm install`
- Live incident → Runbook §3.5; log in `docs/INCIDENT_LOG.md`
## Freeze rule (RB-SPINE-001)
The design portal is the **reference**. It does not adopt; it is adopted from.
- Any modification to this portal requires an explicit human override with a documented reason.
- The shell/UI decisions for this portal are recorded in `SHELL-DECISIONS.md` (the spine's spec).
- The topbar layout gate is `tools/design-parity/check-shell.mjs` — it must pass at all 12 widths × all routes before any deploy. A failing deterministic check is authoritative; a vision-model disagreement triggers manual review, never an auto-pass.
