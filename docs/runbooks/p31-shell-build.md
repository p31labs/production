# Runbook: P31 Shell — Cartridge Console (Build & Verify)

## Overview

- **Alert Name:** `P31-SHELL-BUILD`
- **Severity:** P2 — build/verification failure blocks feature work; not a production outage
- **Related Services:** `@p31ca/design-core` (canon shell), `production/portals/*` (faces), `prototypes/p31-shell.html` (T4 reference)
- **Owner:** `@p31-platform`
- **Version:** 1.4.2
- **Last Updated:** 2026-10-01
- **Last Verified:** 2026-10-01 (RB-SPINE-001 executed end-to-end: negative control FAIL at 820–1300 overlap + 390/768 dual-nav; fix = topbar-center position:static override of canon absolute + min-width:0 + single-owner nav display with !important vs canon recipe; 156/156 PASS local + preview + production across 13 routes × 12 widths; deployed 5aa4ef16)
- **Trigger conditions:** A shell artifact fails verification; a cartridge manifest drifts from contract; a theme token changes layout; the frame unmounts during a route error; `check-derived-names` fires on a cartridge write.

**Purpose.** The P31 Shell is the single immutable frame every portal renders through. Cartridges are manifests that fill slots — never rearrange them. The console (`CartridgeConsole`) hosts many cartridges, persists the active face + user theme, and renders the switcher/theme/composer chrome. The load-bearing invariant is **spatial constancy**: the frame never changes shape, only theme (color) and content change. This runbook makes that invariant checkable and the build repeatable.

**The contract in one line.** The shell owns geometry, slot order, theme engine, identity fence position, error boundary, ambient canvas. The cartridge owns wordmark text, search placeholder, action label, identity fill, nav, routes, blocks, theme preference. Nothing crosses that line.

## Symptoms

Symptom-first. Start at the symptom that matches what you see; do not read the whole runbook.

| # | Symptom | Likely cause | Jump to |
|---|---------|--------------|---------|
| 1 | Shell opens but ambient canvas is blank; console logs a canvas context error | Ambient init failed | D1 → F1 |
| 2 | Switching cartridges changes topbar structure (search moves, identity fence vanishes) instead of only content | Cartridge rearranging the frame | D2 → F2 |
| 3 | A throwing route unmounts the shell — topbar, sidebar, or ambient disappears | Error boundary not scoped to `#main` | D3 → F3 |
| 4 | Theme switch changes layout (topbar height, sidebar width, block spacing) instead of only color | Layout token leaked into theme block | D4 → F4 |
| 5 | Composer step 6 "Save cartridge" does nothing; no new cartridge in switcher | Save handler missing or step not visible | D5 → F5 |
| 6 | Identity slot empty or unfenced (no left border separation) | Identity fill missing / slot geometry broken | D6 → F6 |
| 7 | `check-derived-names` fails on a cartridge manifest or chain write | Raw identity literal in `statedBy`/`author` | D7 → F7 |

## Impact Assessment

- **Affected users:** P31 engineers building cartridges; end users of any cartridge-loaded portal.
- **Business impact:** A broken shell breaks spatial constancy across the ecosystem — the user loses orientation, and the "calm, familiar place" the shell exists to provide is gone. A broken shell also blocks the Composer (T4 generation), the cartridge store, and the chain-recorded cartridge registry.
- **Blast radius:** canon (`@p31ca/design-core`) is the shared dependency; a shell regression forces every portal to re-verify. The Loom chain's `cartridge.load` event depends on the shell's validation path.
- **SLO context:** prototype is local-first (no SLO); production portals target the workspace's standard verify chain. Failure here consumes error budget if it ships.

## Diagnostic Steps

Each step is copy-pasteable and expects a specific result. Run from `production`.

### D1 — Confirm the shell frame renders

```bash
node -e "
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file:///home/p31/production/prototypes/p31-shell.html');
  await p.waitForTimeout(500);
  console.log(await p.evaluate(() => JSON.stringify({
    topbar: !!document.querySelector('#topbar'),
    sidebar: !!document.querySelector('#sidebar'),
    main: !!document.querySelector('#main'),
    ambient: !!document.querySelector('#ambientCanvas'),
    identity: document.querySelector('#identitySlot').children.length > 0,
  })));
  await b.close();
})();
"
```

**Expected:** all `true`. If any is `false`, the shell did not initialize — check the `<script>` block for syntax errors and the console for exceptions (fix → F1).

### D2 — Confirm spatial constancy across cartridges

```bash
node -e "
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file:///home/p31/production/prototypes/p31-shell.html');
  await p.waitForTimeout(500);
  const geo = () => { const t = document.querySelector('#topbar'); const r = t.getBoundingClientRect(); return { h: r.height, w: r.width }; };
  const before = await p.evaluate(geo);
  await p.click('.cartridge-switch .trigger');
  await p.click('[data-cart=\"forge\"]');
  await p.waitForTimeout(200);
  const after = await p.evaluate(geo);
  console.log(JSON.stringify({ same: before.h === after.h && before.w === after.w, before, after }));
  await b.close();
})();
"
```

**Expected:** `same: true` (64 × 1440 → 64 × 1440). If `false`, a cartridge is rearranging the frame — the highest-priority bug (fix → F2).

### D3 — Confirm the error boundary is scoped to `#main`

```bash
node -e "
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file:///home/p31/production/prototypes/p31-shell.html');
  await p.waitForTimeout(500);
  await p.click('.cartridge-switch .trigger');
  await p.click('[data-cart=\"broken\"]');
  await p.waitForTimeout(300);
  console.log(await p.evaluate(() => JSON.stringify({
    err: document.querySelector('#errorBoundary').classList.contains('active'),
    frame: !!document.querySelector('#topbar') && !!document.querySelector('#sidebar') && !!document.querySelector('#ambientCanvas'),
    theme: document.documentElement.dataset.theme,
  })));
  await b.close();
})();
"
```

**Expected:** `err: true, frame: true`, theme a valid value. If `frame: false`, the boundary is at the wrong level (fix → F3).

### D4 — Confirm theme switch changes only color

```bash
node -e "
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file:///home/p31/production/prototypes/p31-shell.html');
  await p.waitForTimeout(500);
  await p.click('#tpTrigger');
  await p.click('[data-theme=\"volt\"]');
  await p.waitForTimeout(200);
  console.log(await p.evaluate(() => {
    const t = document.querySelector('#topbar'); const r = t.getBoundingClientRect();
    return JSON.stringify({ theme: document.documentElement.dataset.theme, h: r.height, w: r.width });
  }));
  await b.close();
})();
"
```

**Expected:** `theme: "volt"`, same 64 × 1440 geometry as D2. If geometry changed, a layout token is in the theme block (fix → F4).

### D5 — Confirm the Composer save path

```bash
node -e "
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file:///home/p31/production/prototypes/p31-shell.html');
  await p.waitForTimeout(500);
  await p.click('#composeBtn');
  for (let i = 0; i < 3; i++) await p.click('#nextStep');
  await p.click('[data-add=\"metric\"]');
  for (let i = 0; i < 2; i++) await p.click('#nextStep');
  await p.click('#saveCartridge');
  await p.waitForTimeout(300);
  console.log(await p.evaluate(() => JSON.stringify({
    wordmark: document.querySelector('#wordmark').textContent.trim(),
    inSwitcher: [...document.querySelectorAll('#csMenu button')].some(b => b.dataset.cart.includes('my-cartridge')),
    blocks: document.querySelectorAll('#cartridgeRoot .metric').length,
  })));
  await b.close();
})();
"
```

**Expected:** wordmark contains the composed name, `inSwitcher: true`, `blocks > 0`. If `inSwitcher: false`, the save handler is missing (fix → F5).

### D6 — Confirm the identity slot is fenced and filled

```bash
node -e "
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file:///home/p31/production/prototypes/p31-shell.html');
  await p.waitForTimeout(500);
  console.log(await p.evaluate(() => {
    const s = document.querySelector('#identitySlot'); const cs = getComputedStyle(s);
    return JSON.stringify({ children: s.children.length, borderLeft: cs.borderLeftWidth, borderLeftStyle: cs.borderLeftStyle });
  }));
  await b.close();
})();
"
```

**Expected:** `children >= 1`, `borderLeftStyle: "solid"` (the fence). The slot renders avatar / sign-in / did-chip fills (fix → F6).

### D7 — Confirm the doctrine gate

```bash
node /home/p31/production/packages/canon/scripts/check-derived-names.mjs 2>&1 | tail -3
```

**Expected:** `✅ derived-names` — every `statedBy`/`author` in chain writes is a pickle name or `codename()`. If it fails, the gate names the file and the raw identity (fix → F7).

## Fix Steps

Estimated times assume a warm dev loop. Re-run the matching diagnostic after each fix.

### F1 — Ambient canvas doesn't render
1. Confirm `#ambientCanvas` exists and `getContext('2d')` did not return `null` (headless GPU-less environments return `null` — that is an environment artifact, not a bug; the shell still functions).
2. Confirm the `data-theme` tokens `--accent` / `--star-cool` are resolvable; `draw()` caches computed colors — a stale cache only updates on theme change, so a missing token falls back to defaults.
3. If reduced-motion is active, the ambient draws a single static frame — a frozen canvas is **correct behavior**, not a failure.
**Est. 5–15 min.**

### F2 — A cartridge breaks frame geometry
1. Open the cartridge manifest. Confirm it declares **only**: `name, tier, themeDefault, wordmark, search, action, actionKind, identity, nav, routes`.
2. Any layout-affecting field (`topbarHeight`, `sidebarWidth`, `--space-*` overrides) is a contract violation — remove it. The shell owns geometry.
3. Re-run D2.
**Est. 5–15 min.**

### F3 — Error boundary escapes `#main`
1. In `renderRoute()`, the `try/catch` must wrap the **block render**, not the whole shell. On throw: `root.style.display='none'` + `#errorBoundary.classList.add('active')` inside the same `#main`.
2. If the frame still unmounts, the catch is too wide — move route resolution inside the `try`.
3. Re-run D3.
**Est. 10–20 min.**

### F4 — Theme switch changes layout
1. Inspect every `html[data-theme="…"]` block. It must declare **only** color tokens: `--accent`, `--star-warm`, `--star-cool`, `--glass-*` tints.
2. Any `--space-*`, `--radius-*`, `--topbar-height`, or `--sidebar-width` in a theme block is a bug — remove those declarations.
3. Re-run D4.
**Est. 5 min.**

### F5 — Composer Save does nothing
1. `rg "saveCartridge" prototypes/p31-shell.html` — the handler must be `$('#saveCartridge').addEventListener('click', saveCartridge);`.
2. If the listener exists but the button is invisible on step 6, check `showStep()` shows `.step[data-step="6"]`.
3. Re-run D5.
**Est. 2 min.**

### F6 — Identity slot empty or unfenced
1. Confirm the cartridge declares an `identity` fill of `avatar | signin | chip`. Missing identity → empty slot is correct default behavior, not a bug.
2. Confirm `.tb-identity` still carries `border-left:1px solid var(--glass-border)` and sits after `.tb-actions` — the fence and position are shell-owned; a cartridge cannot move them.
3. Re-run D6.
**Est. 5 min.**

### F7 — `check-derived-names` fires
1. Read the failing line; the gate names the file and the raw identity.
2. Replace the literal with `codename('role-seed')` — the canonical derivation.
3. Re-run D7.
4. If the failing file is a cartridge manifest, add its directory to `SCAN_DIRS` in the gate (pre-positioning gap, not a bug).
**Est. 5–10 min.**

## Escalation

| Condition | Action | Channel |
|-----------|--------|---------|
| D1 fails (frame doesn't render) | Escalate immediately — a non-rendering frame blocks every cartridge | `@p31-platform` |
| D2 fails after one fix attempt | Escalate with the before/after geometry measurements — a shell that can't hold its shape can't hold the ecosystem | `@p31-platform` |
| D7 fails on a chain write | Escalate to the human operator. Do **not** silence the gate — the chain must never expose an identity handle | Human operator (Half-Sour) |
| Two consecutive fixes fail the same step | Stop iterating; the diagnostic is measuring the wrong thing | `@p31-platform` |
| Frame unmounts with no recovery (P1) | Full postmortem required | `@p31-platform` |

## Post-Actions

- [ ] Record which step failed and how long resolution took (MTTD / MTTR) in the session audit record.
- [ ] If a new cartridge field bypassed shell geometry, add it to the manifest validation rules (canon `shell/contract.ts`).
- [ ] If the failure was a `check-derived-names` violation, confirm the `codename()` fix is in the **source**, not just the vendored copy.
- [ ] Update this runbook if any diagnostic command needs adjustment; bump `Last Verified`.
- [ ] If P1 (frame unmount, no recovery), file a postmortem.

## Appendix — CartridgeManifest Contract (diagnostic reference)

Every cartridge — T4 today, T1/T2/T3 as they land — declares this shape. Missing fields use shell defaults; unknown fields are ignored (additive-only).

```ts
interface CartridgeManifest {
  id: string;
  name: string;
  version: string;
  tier: 'T1' | 'T2' | 'T3' | 'T4';
  themeDefault: ThemeId;
  wordmark: string;            // HTML string
  search: string;              // placeholder
  action: string;              // label or ''
  actionKind: 'primary' | 'ghost' | 'none';
  identity:
    | { kind: 'avatar'; label: string; profile?: boolean }
    | { kind: 'signin'; label: string }
    | { kind: 'chip'; did: string; verified?: boolean };
  nav: { path: string; label: string; emoji: string }[];
  routes: Record<string, BlockDefinition[]>;
  // T1+ only (deferred):
  entryPoint?: string;         // module URL (module federation remote)
  integrity?: string;          // SRI hash
  capabilities?: Capability[]; // declared host functions
}
```

**Ownership line.** Shell owns: geometry, slot order, theme engine, identity fence position, error boundary, ambient canvas. Cartridge owns: wordmark, search, action, identity fill, nav, routes, blocks, theme preference. Nothing crosses that line — if you find a cartridge that does, it is F2.

## Change log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-10-01 | 1.4.2 | **RB-SPINE-001 executed.** Root cause found deeper than modeled: the canon design-core `recipes.css` ships `@media(min-width:768px){.sidebar{display:block !important}}` and `.topbar-center{position:absolute; width:max-content}` — canon's generic responsive recipe hijacked the portal's own layout classes (same class-collision disease). Fix: portal `.topbar-center{position:static; flex:1 1 0; min-width:0; overflow:hidden}`, `.topbar-right{flex-shrink:0}`, single-owner nav `display` with `!important` (beats canon recipe), mobile triage (hide badge/spoon/theme-label ≤768 so session fits at 390). `check-shell.mjs` committed to `$REPO/tools/design-parity`. Negative control FAIL→fix PASS: 156/156 local + preview + production. Deployed 5aa4ef16. Freeze rule + `SHELL-DECISIONS.md` written. | `@p31-platform` |
| 2026-10-01 | 1.4.1 | **TRUE fix for "no content on any page".** Vision-diff (Workers AI llama-3.2-11b) + DOM/paint probes located the root cause: not missing content (the DOM had it) but a **layout collision** — the uncommitted `.app-shell`/`.main-workspace` PortalShell rules in canon `chrome.css` overrode the design portal's own layout, pushing `main-workspace` to `[120,1167,1200,0]` so only the dome was visible. Restored `chrome.css` to committed pre-PortalShell state, fixed 2 `oklch(NaN)` fallbacks (canon-purity), re-synced vendor (compositions present, no `.app-shell`), rebuilt, deployed `85130ff3`. **Verified live == bfbdcbd6**: app-shell 836, main [240,64,1200,836], 66 cards, content on top, zero errors. | `@p31-platform` |
| 2026-10-01 | 1.4.0 | **Click 0 recovery (jitterbug regroup).** Restored the design portal from `stash@{0}` (rich PortalShell-migrated state), replaced the broken PortalTopbar adapter with the original 151-line Topbar from `609ddbc`, reconstructed `design.config.ts`, re-synced vendor, resolved package.json conflict, rebuilt, deployed (82b62d5d). Verified live: matches bfbdcbd6 on brand/theme/search/mode/avatar/spoon/theme-picker/topbar-height AND content (1378 chars, same h1, 61 surfaces, zero errors). Forge restored to its own original Topbar + chrome (c067a151). Both portals back to pre-session selves. | `@p31-platform` |
| 2026-10-01 | 1.3.1 | **ROLLBACK.** The 1.3.0 face layer (PortalTopbar/TopbarFace) touched the design portal — the reference — and broke its look. Restored `portals/design/` to commit `609ddbc` (the source of the known-good `bfbdcbd6` deployment): Topbar back to original, vendor re-synced from canonical workspace design-core, orphan `design.config.ts` removed, rebuilt, deployed as `353189c8`. **Verified identical to `bfbdcbd6` on production** (brand/theme/search/mode/avatar/spoon/theme-picker/topbar-height all match, zero errors). | `@p31-platform` |
| 2026-10-01 | 1.3.0 | **REVERTED (see 1.3.1/1.4.0).** The one-shell-many-faces layer: `shell/face.ts`, `shell/PortalTopbar.tsx`, `shell/SearchBox.tsx`. Design + forge adopted it. This broke the design portal — the reference must not be modified. | `@p31-platform` |
| 2026-10-01 | 1.2.0 | Console layer shipped: `shell/store.ts` (persisted registry + active + userPickedTheme), `CartridgeConsole.tsx` (host), `CartridgeSwitcher.tsx` + `ThemePicker.tsx` (chrome), `AccountMenu.tsx` (identity completion), `CartridgeComposer.tsx` (T4 wizard, validated save), `shell/ambient.tsx` (self-contained canvas dome + LED chip), `css/shell.css` (BEM chrome). `CartridgeShell` now renders through canon compositions (PageHeader/MetricRowBlock/EvidenceBlock/GovernanceOverviewBlock). Full suite 59/59. | `@p31-platform` |
| 2026-10-01 | 1.1.0 | Canon cartridge layer shipped: `shell/cartridge.ts` (contract + ownership gate + theme-travel), `shell/CartridgeShell.tsx` (manifest → immutable frame, SSR-safe broken-cartridge containment), `shell/loadRemote.ts` (T1 loader, SRI gate, never-throw result union). Shell surface 34/34. | `@p31-platform` |
| 2026-10-01 | 1.0.0 | Initial: 7-section standard, 7 diagnostics, 7 fixes, contract appendix | `@p31-platform` |

## Open items (honest)

- **Portal adoption:** `PortalShell`/`CartridgeConsole` are canon-ready and the forge/design portals already consume `PortalShell`; neither consumes the cartridge/console layer yet. Adoption is the next gate (requires rebuilding the vendored `p31-design-core-3.0.0.tgz` — the current tarball predates the cartridge + console layers).
- **Composer interaction tests:** the composer's stateful wizard (steps, add/remove block, save button) is asserted at the store level; a jsdom interaction test is the next hardening pass.
- **Federation plugin:** the T1 loader runtime is verified, but no portal build configures `vite-plugin-federation` (none installed). Wiring a real remote is a portal-build task requiring the plugin + two remotes.
- **Agentic suite flake:** `tests/agentic/*` spawn a tsx CLI under vitest's default 5000ms timeout; the command takes 3.5s idle, 5–6.5s under parallel load. Unrelated to the shell layer (zero shell imports); needs a `testTimeout` bump when next touched.
- **SLOs/metrics:** no SLOs exist (prototype + canon layer only). Mandatory at portal adoption.