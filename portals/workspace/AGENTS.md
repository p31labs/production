# AGENTS.md — P31 Quantum Material Workspace

## Repository
- Live: `workspace.p31ca.org` · Source: this directory (`production/portals/workspace/`)
- Stack: React 19 · Vite 6 · Zustand 5 · TypeScript strict · Vitest · Cloudflare Pages
- Canon design source: `@p31ca/design-core` 2.3.0 (vendored tarball in `vendor/`)
- Deploy: `pnpm deploy` → Cloudflare Pages `p31-portal-workspace` (via `scripts/deploy.mjs`)

## Read before editing
1. `docs/SYSTEM_ARCHITECTURE.md` — shell, routes, persistence, surfaces (facts)
2. `docs/BUILD_SPEC.md` — design-stance invariants, tokens, patterns (rules)
3. `docs/AGENT_RUNBOOK.md` — roles, workflow, gates, incident response (procedures)

## Non-negotiables
- Colors: OKLCH / `color-mix(in oklch, …)` only. Raw hex/rgba forbidden outside `src/tokens.css`.
- Every surface: `data-mcp-tool` on root; register in `src/lib/mcpTools.ts`.
- Elevated surfaces (Sheets, Slides, Drive): route navigation through `useModeGate().navigate`.
- Persisted keys: keep the exact names in SYSTEM_ARCHITECTURE §4; never re-key them.
- Calm mode (spoons 0): non-destructive — no unmount, no state loss.
- Pickle labels only — never render a human name on any surface.

## Gates (run from this directory after every edit)
`pnpm typecheck && pnpm lint && pnpm test && pnpm build && node scripts/token-audit.mjs`
Note: `pnpm gate` / `pnpm v:gate` currently fail in this portal — vendor gate hardcodes `@p31ca/design-core`
but this package is `@p31ca/design-core` (BUILD_SPEC GAP-07). Use the green chain above.

## Escalation
- Gate failure after revert → Workspace Architect (Runbook §3.2)
- Vendor tarball mismatch → Vendor Steward (`pnpm sync:vendor`)
- Live incident → Runbook §3.5 (S1 sequence); log in `docs/INCIDENT_LOG.md`