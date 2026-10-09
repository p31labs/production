---
description: Add a new workspace surface following the canon build pattern
agent: Workspace Architect
subtask: false
---

# /add-surface — P31 Quantum Material Workspace

1. Read `docs/SYSTEM_ARCHITECTURE.md` §5 and `docs/BUILD_SPEC.md` §4 (surface build pattern).
2. Create `src/features/<name>/<Name>Surface.tsx` — named export, `data-mcp-tool` on root, no props,
   store-backed state, pickle labels only.
3. Register: `src/lib/routes.ts` (ROUTES), `src/lib/mcpTools.ts` (MCP_TOOLS + MCP_HANDLERS),
   `App.tsx` SURFACE_COMPONENTS + APP_HASHES.
4. Elevated surface? Add to `useModeGate.ts` ELEVATED; navigate only via `navigate()`.
5. Add `src/features/<name>/<Name>Surface.test.tsx`.
6. Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build && node scripts/token-audit.mjs`
   (do not use `pnpm v:gate` — it fails in this portal, see `docs/BUILD_SPEC.md` GAP-07).
7. Update SYSTEM_ARCHITECTURE §5. Tag-out with Workspace Architect.