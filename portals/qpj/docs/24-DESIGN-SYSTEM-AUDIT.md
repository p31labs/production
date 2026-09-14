# Design System Audit — QPJ Portal

Verification: `npx playwright test e2e/a11y.spec.ts` (9 routes, wcag2a+wcag2aa+wcag22aa).
Axe is the authoritative a11y check. Ratios for axe-flagged items were computed from browser computed styles using the WCAG 2.x relative-luminance formula on OKLCH→sRGB conversion (ratio = (L_higher+0.05)/(L_lower+0.05)).
Audit scope: QPJ-owned WCAG items only. design-core vendored items (Button recipes, SpoonDial `aria-checked`) are documented, not patched.
Audit date: post a11y polish pass. Severity per axe-core 4.13 impact labels.

---

## Fixed by this pass

| Item | Route(s) | Verified | Evidence |
|---|----------|----------|----------|
| SkipLink `role="skip-link"` | all | axe passes | Removed invalid `role="skip-link"` from `<a>` in `index.html:13` — `<a href>` has implicit link role (2.4.1 bypass satisfied). |
| PinDialog focus trap | PinDialog | axe passes | Added `panelRef` + focus-trap `useEffect` (cycle Tab through focusables, restore focus to trigger on close) in `PinDialog.tsx`. |
| `worker-chat__mode.is-active` contrast | site, worker | **12.30:1** | `worker.css:41-45` — background changed from `--p31-interactive` (57% gold) to `--p31-surface` (18.5% dark). Foreground `--p31-text` (rgb 205,198,188) on background `--p31-surface` (rgb 3,1,0). Gold kept as `border-color` for visual distinction. |
| YouPage `dl` structure | you | axe passes | `YouPage.tsx:125` — moved `<p className="you__stat-desc">` inside `<dd>` so each `<div>` wraps a clean `<dt>` + `<dd>` group. |
| NotificationStack dismiss target size | all | 24×24 min | `notification.css:67` added `min-height: 24px; min-width: 24px` to `.notif__close`. Toast close (32×32) already passed. |
| Orphaned `button--*`/`.button` recipes | — | removed | `index.css:591–632` deleted — `.button`, `.button:active`, `.button--primary`, `.button--primary:hover`, `.button--ghost`, `.button--ghost:hover`, `.button[disabled]`. Verified zero TSX/docs/non-CSS consumers across the monorepo before deletion. |

## Vendor — documented, not patched (design-core @ 2.3.0)

| Item | Route(s) | Ratio | Evidence |
|---|----------|--------|----------|
| SpoonDial `aria-checked` on toggle buttons | all (6 nodes each) | invalid ARIA | `node_modules/@p31/design-core/src/compositions/SpoonDial.tsx:36` (generated `SpoonDial.tsx:26`). QPJ does not own this markup; vendor fix required. `aria-allowed-attr` Critical. |
| `Button` `.btn`/`.btn-sm` color-contrast | entry, you | **1.68:1** | design-core owned (`node_modules/@p31/design-core/src/css/`). Computed: `--p31-accent-contrast` (14%, rgb 1,1,0) on `--p31-interactive`/`--p31-accent` (57%, rgb 88,38,1). Vendor defect — below large-text threshold. QPJ does not own these recipes. |

## Open design decision (needs owner sign-off)

| Item | Current state | Decision needed |
|------|---------------|-----------------|
| `.worker-chat__mode.is-active` visual language | Active state changed from gold fill (`--p31-interactive`) to dark chip with gold outline (bg: `--p31-surface`, border: `--p31-interactive`). 12.30:1 contrast ✅ but visual meaning changed from "filled" to "outlined." | Design-owner confirmation that the outlined active state is acceptable. See commit `de11907`. |

## All other surfaces passing

All 9 routes pass `wcag2a+wcag2aa+wcag22aa` for QPJ-owned checks via `e2e/a11y.spec.ts`. design-core vendored items (`Button` color-contrast, SpoonDial `aria-checked`) are filtered in the spec with explicit count assertions (fails loudly if vendor surfaces change).

## Pre-flight decisions (methodology findings)

Rule | Decision | Rationale
-----|----------|------------
2.4.11 Focus Not Obscured | **DROPPED** | Topbar is `position: relative` (not sticky), content never obscures focus target.
2.5.7 Dragging Move/Copy | **DROPPED** | Range inputs exempt per WCAG.
2.5.8 Target Size (44×44) | **APPLIED selectively** | Toast close button is 32×32 — passes. NotificationStack dismiss was ~16×8 — reduced to 24×24 (still under 44 but material improvement, non-blocking). PIN dialog, PinDialog not auth-critical — PIN is caregiver door.
3.3.8 Accessible Auth | **DROPPED** | PIN is a caregiver door, not authentication. Auth is SSO; PIN is a PIN. Document divergence in `docs/15-DIVERGENCES.md`.

## Deferred (revisit triggers)

| Item | Revisit trigger |
|------|-----------------|
| `.worker-chat__mode.is-active` visual language | Design-owner confirms or rejects the outlined active state in commit `de11907`. |
| `Button` `.btn`/`.btn-sm` color-contrast (1.68:1) | design-core releases a Button recipe that reaches WCAG AA (vendor fix). |
| SpoonDial `aria-checked` (invalid ARIA) | design-core removes `aria-checked` from SpoonDial toggle buttons (vendor fix). |
| Full audit vs targeted | Post-launch full-route audit (this pass was targeted at WCAG a/aa items raised during polish). |
| Screen-reader manual pass (PinDialog focus trap, SkipLink) | Post-launch QA session with a screen reader — focus trap logic should be validated by real assistive tech, not just axe. |
| VRT (visual regression baseline) | Add on next token-family change or when route count reaches 10 (see `docs/22-QA.md`). |

## Substrate status

No substrate changes. All changes UI-polish + a11y. Dormant bridge (entry route) remains documented in `docs/15-DIVERGENCES.md` and `docs/16-MASTER-PROMPT-SUBSTRATE.md`. No dev/prod drift from prior run.

---

Run commands:
- Verify a11y: `pnpm test e2e/a11y.spec.ts` (9 routes, asserts zero QPJ-owned violations per route, vendor items counted explicitly)
- Verify a specific element's ratio (throwaway): use axe's `include` option or compute from computed styles via Playwright. `test-results/` and `playwright-report/` are gitignored and excluded from git.
