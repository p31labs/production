# 23 — Triad Acceptance

The UI polish pass for the Triad (Narrator / Mechanic / Architect)
surfaces: SiteShell chrome, WorkerChat, WorkshopPage.

## Acceptance questions

1. **Are every surface's visual primitives tokenized?**
   Yes — the gate overlay uses `var(--p31-glass-blur)` (the pattern on
   `studio.css:2094` is the Studio session overlay, a different element,
   out of scope), the PIN entry sits in a token-styled container,
   composer spacing is `var(--space-2)`, worker task rows use spacing
   tokens. `token-audit` (see `docs/15`) still green.
2. **Does every surface handle its empty/boundary state gracefully?**
   Yes — WorkerChat now renders a tokenized empty state (`role="status"`,
   icon with `<title>`, heading, suggestion) when a worker has no tasks.
   PIN entry is in a bordered container inside the hub card.
3. **Did the pass touch substrate or the mode gate?**
   No — substrate stayed dormant (`SUBSTRATE_ENABLED=false`,
   `VITE_P31_SUBSTRATE_ENABLED` unset on the app; the `qpj:edge` vitest
   env flag is test-time only), mode gate unchanged, PIN factory default
   remains `1234`.

## Evidence

| Check | Result |
|-------|--------|
| `src/__tests__/triad-surfaces.test.tsx` | 8/8 pass (3 fail-today → green after Path C1/C2) |
| `pnpm typecheck` | 0 |
| `pnpm lint` | 0 |
| `pnpm build` | 0 |
| `token-audit` guard | green (no unresolved `--p31-*`, no hex/rgb) |
| Substrate code touched | none |
| New tokens/components/deps | none |

## Sign-off

| Role | Decision | Date |
|------|----------|------|
| Narrator (mechanic) | Copy on empty state aligned to `docs/03-VOICE` tone; no emoji | |
| Mechanic (worker) | Empty-state DOM structure pass a11y + the gate overlay now tokenized | |
| Architect | Review in `docs/16` (Review section): scope kept, substrate dormant | |
