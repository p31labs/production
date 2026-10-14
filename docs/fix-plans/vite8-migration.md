<!-- P31-HEADER
id: p31_fix_plan_vite8_migration_20261011_v1.0
type: fix-plan
component: portals/mcp-marketplace
status: open
retention: archive-90d
created: 2026-10-11T00:00:00Z
owner: will
-->

# fix-plan: Vite 8 migration (Rolldown + Oxc) — future wave

## Symptom

`portals/mcp-marketplace` is on Vite 7.3.7, which is still Rollup 4-based.
The Rolldown + Oxc unified Rust pipeline lands in **Vite 8** (verified against
the Vite 8 migration guide: `build.rollupOptions` → `build.rolldownOptions`
with auto-conversion, `esbuild` key → `oxc` with auto-conversion,
`optimizeDeps.esbuildOptions` deprecated, CJS build removed, default target
`baseline-widely-available`).

Earlier research incorrectly attributed the Rolldown/Oxc rename to Vite 7; the
marketplace agent verified empirically that vite 7.3.7's dist is Rollup 4-based
and kept `rollupOptions` to preserve the `react-vendor` manualChunks split.

## Fix (when Vite 8 stable is adopted)

1. `vite` → ^8, `@vitejs/plugin-react` → the Vite-8-peering major.
2. Rename `build.rollupOptions` → `build.rolldownOptions` (or rely on
   auto-conversion, then migrate explicitly).
3. Audit plugins for Rolldown compatibility (the Rollup-compatible plugin API
   is not guaranteed for every plugin).
4. If `transformWithEsbuild` is used anywhere: add esbuild as an explicit dev
   dependency (Vite 7+ removed the bundled helper).
5. Verify Node >= 20.19 (currently v24 — fine), confirm no CJS build is
   expected, review `build.target` vs the new `baseline-widely-available`
   default, and remove any `splitVendorChunkPlugin` usage (removed).
6. Run the portal gates (typecheck/lint/test/build/v:gate) + the canon deploy
   gate, then deploy.

## Not now

No action until Vite 8 stable is chosen. This fix-plan keeps the migration
filed so it is not forgotten.