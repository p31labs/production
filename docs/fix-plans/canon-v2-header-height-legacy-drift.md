<!-- P31-HEADER
id: p31_fix_plan_canon_v2_header_height_legacy_drift_20261012_v1.0
type: fix-plan
component: packages/design-core
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: `--p31-header-height` legacy collision + frozen-bundle scroll-padding drift

**Discovered by:** agent:subagent:canon-v2 (H1 header-height + centering leg)
**Discovered at:** 2026-10-12T00:00:00Z
**Severity:** medium (cascade-contract drift; the render-gate A8 exemption
records it until the re-vendor leg)

## The bug(s)

The H1 leg added the header-height contract
(`docs/enterprise/design-system/canon-v2.md` §10):
`--p31-header-height: 4rem` in `BASE` (theme-store.ts) and
`html { scroll-padding-top: var(--p31-header-height) }` in `canon-v2.css`.
Two frozen artifacts drift against that contract:

1. **Legacy token collision.** The pre-canon
   `packages/design-core/src/css/canon.css` declares
   `--p31-header-height: 61px` in an unlayered `:root` block. Any consumer
   importing the aggregate `@p31ca/design-core/css/index.css` (which pulls
   `./canon.css` before the layered `tokens.css`) gets 61px — unlayered
   author CSS beats every layer, so the legacy value wins over the canon
   token. Same collision class as the layer-quarantine plan
   (`docs/fix-plans/canon-v2-design-core-legacy-layer-quarantine.md`).

2. **Frozen vendor bundle.** `portals/mcp-marketplace` pins
   `@p31ca/design-core: file:vendor/p31-design-core-3.0.1.tgz`, which
   predates the scroll-padding rule. Live probe (2026-10-12):
   `getComputedStyle(document.documentElement).scrollPaddingTop === "auto"`
   on `https://p31-portal-mcp-marketplace.pages.dev`. Anchor jumps on the
   deployed site therefore do NOT clear the bar until re-vendor + redeploy.

3. **Live topbar sticky finding (portal-side, filed here for the port leg).**
   The live `.topbar` (`.topbar--app .topbar--sticky`) computes to
   `position: relative` — it never sticks — and sits 12px below the viewport
   top at load (above a fixed `.starfield-bg` layer). A3 still passes, but
   the sticky-not-fixed contract (§10) is not rendering on the frozen
   bundle. Render-gate A8 will flag it once scroll-padding lands live
   (64px < bar bottom 76px − 2 at load offset), which is the sensor doing
   its job; the port leg must fix the shell CSS, not the assertion.

## Why it is not flipped in place

- `canon.css` is unlayered legacy shared with un-ported faces — wrapping or
  editing it in place flips the cascade under live portals (same reasoning as
  the layer-quarantine plan). Its `:root` token block retires face-by-face.
- `portals/**` is out of scope for the H1 leg (hard rule 4); the vendor tgz
  swap is a portal re-vendor + redeploy, owner-scheduled.

## What changes (next legs)

1. Quarantine pass: move the legacy `canon.css` `:root` token overrides into
   `@layer legacy` per-face (or delete the `--p31-header-height: 61px` line
   when its last consumer ports), same cadence as
   `canon-v2-design-core-legacy-layer-quarantine.md`.
2. Re-vendor: rebuild `@p31ca/design-core` ≥ 3.0.2 (with the H1
   `canon-v2.css` rule) into `portals/mcp-marketplace/vendor/`, bump the
   `file:` pin, redeploy pages.dev.
3. Portal shell: restore true sticky on the topbar (`position: sticky;
   top: 0` with the 12px offset resolved), then re-run render-gate — A8
   must evaluate (no `auto` note) and stay green.

## Verification

- `node scripts/check-token-parity.mjs` — `--p31-header-height` present in
  both `tokens.dtc.json` and `dist/tokens.css` (4rem).
- `node scripts/render-gate.mjs --self-test` — A7/A8 fixtures trip and pass.
- Post-revendor: `node scripts/render-gate.mjs` live exits 0 with A8
  evaluated (evidence `notes` empty for scroll-padding).
## Resolution (2026-10-12)

- Removed the legacy `--p31-header-height: 61px` literal from
  `packages/design-core/src/css/canon.css` (the canon token layer owns the
  value now — unlayered legacy was beating `canon.tokens`).
- Portal: re-vendored (`sync:vendor` detected the change, auto-ran
  `pnpm update`), moved `<Topbar/>` into the Shell's `topbar` slot
  (`App.tsx`), pinned `[data-p31="shell-topbar"]` + inner `.topbar` to
  `var(--p31-header-height)` in `shell.css` (@layer shell, geometry-only).
- Render-gate: A3 anchor now prefers `[data-p31="shell-topbar"]` (the bare
  `[data-p31]` catch-all measured the whole shell root once the topbar
  moved inside it).
- Verified: live bundle serves `--p31-header-height: 4rem` (0×61px), topbar
  renders 64px, `scroll-padding-top` 64px ≥ header-bottom − 2 → render-gate
  30/30 exit 0.
