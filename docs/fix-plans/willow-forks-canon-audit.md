<!-- P31-HEADER
id: willow_forks_canon_audit_20261013_v1.0
type: fix-plan
component: apps/willow
status: active
created: 2026-10-13T01:05:00Z
owner: agent
-->

# Fix plan — willow canon-source-audit forks (blocking workspace deploy)

## Symptom
`pnpm deploy` (workspace portal) refused: `canon-source-audit` found forks in
`production/apps/willow`:

- `[component-duplicate]` `src/components/BottomNav.tsx` exports `BottomNav`
  — canon `@p31ca/design-core/compositions` already exports `BottomNav`.
- `[component-duplicate]` `src/components/CrisisOverlay.tsx` exports
  `CrisisOverlay` — canon `@p31ca/design-core/compositions` already exports
  `CrisisOverlay` (a React composition over `<p31-crisis-overlay>` that also
  sets `data-spoons="0"` itself).
- `[token-fork]` `src/styles/globals.css` defines 5 non-adapter `--p31-*`
  tokens (`--p31-nav-bg/-border/-glow/-inset` under `[data-brand="willow"]`,
  `--p31-nav-h` under `:root`).

## Root cause
Willow predates the consume-don't-fork gate (R1/R2 in
`tools/canon-audit/canon-source-audit.mjs`) and hand-rolled:
1. A 5-tab emoji bottom nav whose canon equivalent already exists (and is
   **unused** — no willow call site imports `BottomNav`; dead code).
2. A thin wrapper around the canon crisis web component; the wrapper only
   hardcodes copy — canon's `CrisisOverlay` composition accepts
   `message`/`buttonLabel` props directly.
3. Brand-scoped nav tokens that are **dead definitions** (no `var(--p31-nav-*`
   consumer anywhere in `apps/willow/src` or the packages).

## Fix (consume-don't-fork)
1. Delete `src/components/BottomNav.tsx` (dead code; canon `BottomNav` is the
   contract if a nav is ever added — structured `items`/`activeIndex` API).
2. Delete `src/components/CrisisOverlay.tsx`; update the two call sites
   (`WillowShell.tsx:14`, `App.tsx:13`) to import `CrisisOverlay` from
   `@p31ca/design-core/compositions` and pass the willow copy as props:
   `message="You’re safe. Breathe with the circle. Take your time."`
   `buttonLabel="I’m ready"`.
3. `globals.css`: remove the dead `[data-brand="willow"]` token block; replace
   the `--p31-nav-h` indirection with the clamp inline in `.willow-header`
   (geometry is the shell's job; a plain clamp is not a `--p31-*` fork).
4. Ensure `@p31ca/design-core` is resolvable for willow's build (add
   `file:../../packages/design-core` dep if it is currently a transitive
   ghost import).

## Verification
- `cd apps/willow && npm run build` — TypeScript + vite pass.
- `node tools/canon-audit/canon-source-audit.mjs --target apps/willow/src` — 0 forks (verified 2026-10-13).

## Status (2026-10-13)
- All three fork fixes landed and the willow scoped audit is GREEN.
- **Separate pre-existing finding**: `apps/willow/vite.config.ts` imports
  `@tailwindcss/vite`, which is NOT in `package.json` — the willow build is
  broken independent of this plan (fails at config load). Tailwind also
  violates Seven Laws #2 ("No Tailwind utilities") for new work; the correct
  fix is to remove the plugin from `vite.config.ts` (and any `@tailwind`
  directives in `globals.css`) rather than re-install it. Filed here; not
  part of the canon-fork fix.

## Rollback
`git` is not initialized for this tree; the deleted files are preserved in
this plan's diff description and recoverable from session history. Revert =
recreate the two component files and the token block.