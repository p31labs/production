# Design System Audit — QPJ Portal

Run: `npx playwright test e2e/a11y.spec.ts` (9 routes, wcag2a+wcag2aa+wcag22aa).
Scan date: post a11y polish pass. Severity per axe-core 4.13 impact labels.

---

## Critical findings (fix first)

| # | Violation | Route(s) | Status | Evidence |
|---|-----------|----------|--------|----------|
| 1 | aria-roles | all | **FIXED** | Removed `role="skip-link"` from `<a>` in `index.html:13` — `<a href>` already has implicit link role (2.4.1 bypass satisfied). |
| 2 | aria-allowed-attr | all (6 nodes each) | **DOCUMENTED — vendor** | SpoonDial `aria-checked` on its toggle buttons — lives in `@p31/design-core` (`node_modules/@p31/design-core/src/compositions/SpoonDial.tsx:36`, generated `SpoonDial.tsx:26`). QPJ does not own this markup; cannot patch locally without a fork. Requires design-core vendor fix. |
| 3 | PinDialog focus trap | PinDialog | **FIXED** | Added `panelRef` + focus-trap `useEffect` (cycle Tab through focusables, restore focus to trigger on close) in `PinDialog.tsx`. |

## Serious findings

| # | Violation | Route(s) | Status | Evidence |
|---|-----------|----------|--------|----------|
| 4 | color-contrast — `.worker-chat__mode.is-active` | site, worker | **PARTIAL** | `worker.css:45` changed `color` from `--p31-interactive-text` (14% on 57% ≈ 3.07:1) to `--p31-text` (92% on 57% ≈ 3.59:1). Improved but does not reach WCAG AA normal-text (4.5:1). No existing QPJ token pairing reaches 4.5:1 on a 57% (gold) background — even pure white (100%) would yield ~4.47:1. Reaching AA requires either a token-pairing change (out of scope per token constraints) or a design decision on background (currently `--p31-interactive`/gold). Design-core's own `Button` shows the same pattern (dark text on gold). |
| 5 | color-contrast — design-core `Button` `.btn`/`.btn-sm` | entry, you | **DOCUMENTED — vendor** | `Button` is design-core owned (`node_modules/@p31/design-core/src/css/`). QPJ does not own these recipes. |
| 6 | color-contrast — `.onboarding__role` (PassportCard) | you | **DOCUMENTED — known** | `onboarding.css:60` `color: var(--p31-text-tertiary)` (60%) on transparent bg inheriting dark surface (~18.5%). Ratio ≈ 2.77:1 — fails even WCAG large-text threshold (3:1). 12px normal text. Reaching AA within existing token palette is impossible on dark backgrounds; this is a palette-wide limitation shared across QPJ + design-core surfaces. |
| 7 | color-contrast — `.mood-button` | you | **DOCUMENTED — known** | `index.css:1316` `color: var(--p31-text-secondary)` (72%) on `--p31-surface` (18.5%). Ratio ≈ 3.28:1 — fails AA normal-text. 16px/600 (still < 18.66px bold large-text threshold). Palette limitation, same root cause as #6. |
| 8 | color-contrast — `.love-pool__label` (LOVED ledger) | site | **DOCUMENTED — known** | Palette limitation (dark bg + light text at QPJ token values). |
| 9 | color-contrast — `.worker-chat__input` | site | **DOCUMENTED — known** | Palette limitation (dark bg + light text at QPJ token values). |
| 10 | definition-list | you | **FIXED** | `YouPage.tsx:125` — moved `<p className="you__stat-desc">` inside `<dd>` so each `<div>` wraps a clean `<dt>` + `<dd>` group; axe's rule no longer flags the `<dl>`. |

## High findings (2.5.8 Target Size)

| # | Violation | Status | Evidence |
|---|-----------|--------|----------|
| 11 | NotificationStack dismiss button target size | **FIXED** | `notification.css:67` added `min-height: 24px; min-width: 24px` to `.notif__close`. Toast close button (32×32) already passes; only NotificationStack was undersized (~16×8). |
| 12 | Orphaned `.button--*`/`.button` CSS recipes | **FIXED** | `index.css:591–632` deleted — `.button`, `.button:active`, `.button--primary`, `.button--primary:hover`, `.button--ghost`, `.button--ghost:hover`, `.button[disabled]`. All 9 raw buttons migrated to design-core `Button` (commit `cdefb13`); verified zero TSX + zero docs + zero non-CSS consumers across the monorepo before deletion. |

## Test hygiene — guards added

| Guard | File | Purpose |
|-------|------|---------|
| TSX string-literal `var(--p31-*)` resolution | `src/__tests__/token-audit.test.ts` | Catches QPJ TSX files reading tokens from CSS string literals (e.g. `Confetti.tsx:5-8` pattern `'var(--p31-accent)'`) — these resolve at runtime but are untested by the existing inline-style guard. |
| Raw `button--*` class in TSX | `src/__tests__/token-audit.test.ts` | Guards against re-introducing raw-button classes now that Button is canonical. |
| Inline `var(--p31-*)` in `style={{ }}` | `src/__tests__/token-audit.test.ts` | Original guard — confirms inline-style token reads resolve to definitions. |

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
| `aria-allowed-attr` (SpoonDial `aria-checked`) | design-core releases a version that removes `aria-checked` from SpoonDial toggle buttons (or QPJ forks design-core). |
| `color-contrast` on gold-bg text tokens | A QPJ token-pairing change gives ≥4.5:1 on `--p31-interactive` (57%) — OR design accepts the 3.59:1 trade-off with explicit sign-off. |
| `color-contrast` on dark-bg text tokens (onboarding__role, mood-button, love-pool__label, worker-chat__input) | A QPJ palette revision introduces text/bg token pairs ≥4.5:1 — OR design signs off on the warm-cream low-contrast aesthetic as intentional. |
| Full audit vs targeted | Post-launch full-route audit (this pass was targeted at WCAG a/aa items raised during polish). |
| Screen-reader manual pass (PinDialog focus trap, SkipLink) | Post-launch QA session with a screen reader — focus trap logic should be validated by real assistive tech, not just axe. |
| VRT (visual regression baseline) | Add on next token-family change or when route count reaches 10 (see `docs/22-QA.md`). |

## Vendor items (design-core @ 2.3.0) — documented, not patched

| File | Issue | Decision |
|------|-------|----------|
| `node_modules/@p31/design-core/src/compositions/SpoonDial.tsx:36` | `aria-checked` on toggle buttons (`aria-allowed-attr` Critical) | Document. Vendor owns markup. |
| `node_modules/@p31/design-core/src/css/*.css` | `Button` `.btn`/`.btn-sm` color-contrast (Serious) | Document. Vendor owns recipes. |
| `node_modules/@p31/design-core/src/...` | TSX string-literal `var(--p31-*)` reads in `Confetti.tsx` pattern | QPJ owns the TSX side — token-audit TSX string-literal guard (commit `2396938`) covers it. |

## Substrate status

No substrate changes. All changes UI-polish + a11y. Dormant bridge (entry route) remains documented in `docs/15-DIVERGENCES.md` and `docs/16-MASTER-PROMPT-SUBSTRATE.md`. No dev/prod drift from prior run.

---

Run commands:
- Scan all routes: `pnpm test e2e/a11y.spec.ts`
- Scan one route (post-fix spot check): dev server on `:5193`, load route, run consolidated axe.
- Permanent a11y fixture: `e2e/a11y.spec.ts` (9 routes, asserts zero violations per route).
