# AGENTS.md — P31 Design System Portal (Quantum Material)

## Repository
- Live: `design.p31ca.org` · Source: this directory (`production/portals/design/`)
- Stack: React 19 · Vite 6 · React Router 6 · Tailwind v4 · Zustand · Vitest · Cloudflare Pages
- Design canon: `@p31ca/design-core` **3.0.0** (vendored tarball `vendor/p31-design-core-3.0.0.tgz`)
- Canon source: `P31-local-workspace/packages/design-core/` · Deploy: `pnpm deploy`

## Read before editing
1. `docs/SYSTEM_ARCHITECTURE.md` — IA, shell, routes, surfaces, canon (facts)
2. `docs/BUILD_SPEC.md` — Quantum Material invariants, tokens, patterns (rules)
3. `docs/AGENT_RUNBOOK.md` — roles, workflow, gates, incident response (procedures)

## Non-negotiables
- Colors: OKLCH / `color-mix(in oklch, …)` only. Raw hex/rgba forbidden — the canon gate
  `node <design-core>/scripts/token-audit.mjs` fails on any raw literal in design sources.
- Portal-owned `src/tokens.css` (hue-270 neutrals + quantum accents) is imported LAST so the portal wins.
- Every surface root carries `data-mcp-tool` (set on `.portal-main` per route via `src/lib/mcpTools.ts`).
- Do not hand-edit `vendor/*.tgz` — re-pack from the canon (`npm pack` in design-core) and `pnpm install`.
- Spoon 0 = calm floor: CrisisOverlay is the ONLY chrome; no motion, no blur.

## Gates (run from this directory after every edit)
`pnpm typecheck && pnpm lint && pnpm test && pnpm build && node <dc>/scripts/token-audit.mjs && pnpm v:gate`

## Escalation
- Gate failure after revert → Workspace Architect (Runbook §3.2)
- Vendor/canon drift → re-pack 3.0.0 tarball from design-core; `pnpm install`
- Live incident → Runbook §3.5; log in `docs/INCIDENT_LOG.md`