---
description: Fix a raw hex/rgba token-audit violation
agent: Surface Artisan
subtask: true
---

# /fix-token-audit — P31 Quantum Material Workspace

1. `node scripts/token-audit.mjs` — read the failing file:line.
2. Convert the raw value to OKLCH using the migration table in `docs/BUILD_SPEC.md` §3.2
   (use the nearest token — never recompute from scratch).
3. If no token fits, extend `src/tokens.css` `:root` with the OKLCH value.
4. Re-run `node scripts/token-audit.mjs` until it prints `Token audit OK`.
5. Run `pnpm typecheck && pnpm test && pnpm build`.