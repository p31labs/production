# Workstream C — Mobile-First Audit Gate

<!-- P31-HEADER
id: p31_c_readme_20261011_v1.0
type: doc
component: design-workflow/C-mobile-audit
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: half-sour
-->

Runbook: `P31-local-workspace/DESIGN-SYSTEM-PARALLEL-PATHS-RUNBOOK.md` §7 (WORKSTREAM C),
research basis §2 items 3–5. **Mobile-first is a gate, not a preference** — the base
layer must function at 320px with all media queries disabled.

## Files

| File | What |
|---|---|
| `mobile-first-audit.mjs` | Static gate — zero dependencies, Node 24 ESM |
| `fixtures/good.css` | Positive control — passes every check |
| `fixtures/bad.css` | Negative control — violates every check on purpose |
| `fixtures/page.html` | DOM fixture — deliberately bad (28px button + 400px container) |
| `dom-check.mjs` | Optional browser check (Playwright, browser-gated, never downloads) |

## Run

```bash
cd /home/p31/production/design-workflow/C-mobile-audit

# static gate (exit 1 if ANY check FAILs)
node mobile-first-audit.mjs <css-file> [--label name]

# negative control (must exit 1 — proves the gate can fail)
node mobile-first-audit.mjs fixtures/bad.css --label bad

# positive control (must exit 0)
node mobile-first-audit.mjs fixtures/good.css --label good

# optional DOM check (browser-gated — no downloads, ever)
node dom-check.mjs
```

Every check prints `PASS`/`FAIL`/`WARN` with `file:line` evidence (P31 law 9:
cite file:line). Summary: `N checks | M failed | K findings`. Exit code 1 iff any
check FAILs (fail closed, P31 law 10).

## Checks and what they enforce

| Check | Rule | Authority |
|---|---|---|
| `clamp-rem` | Every `clamp(...)` must contain a `rem` term anywhere inside it. Pure-vw preferred values break browser zoom. | WCAG F94 (SC 1.4.4 text resize) |
| `viewport-units` | Literal `100vh` = FAIL (mobile URL bar overflows). Use `100svh`/`100dvh`. | runbook §2.4 |
| `safe-area` | If the file has `position: fixed`/`sticky` or `bottom-bar`/`bottom-nav`/`tab-bar` selectors, it must declare `env(safe-area-inset-*)` at least once. | Apple HIG safe-area doctrine |
| `breakpoint-hardcode` | `@media (min-width: …px)` / `(max-width: …px)` with raw px = FAIL. Require rem (~30/48/64/90rem) or a breakpoint token var (`--p31-breakpoint-*`, Lane B-3). | runbook §2.3; law 7 (no hardcoded values) |
| `touch-target-static` | Rules targeting `a` / `button` / `[role="button"]` / `input` with `height` or `min-height` < 44px: **FAIL** inside `@media (pointer: coarse)` or `(hover: none)`; **WARN** outside. (Compact 34px floor is permitted only under `(pointer: fine)` — out of scope here, handled by Lane B tier resolver.) | WCAG 2.5.5 Target Size (Minimum) 44×44 CSS px · Apple HIG 44pt · M3 48dp |
| `horizontal-overflow-static` | `width: <n>px` with n > 320 not inside a `min-width` media query = **WARN** (WARN-only by design per runbook; the 320px litmus). Inside `min-width` media queries, >320px widths are exempt. | runbook §2.3 (320px litmus) |

PASS lines cite the compliant `file:line` evidence. Vacuous passes (e.g. no
interactive rules in a tokens-only CSS file) print a `no occurrences` note.

## Negative controls (P31 doctrine: a gate that cannot fail is furniture)

- `fixtures/bad.css` fails **all six checks**: pure-vw `clamp(1vw, 1vw+0.5vw, 2vw)`,
  `height: 100vh`, fixed `.bottom-nav` with no safe-area env, `min-width: 600px` /
  `max-width: 599px` px breakpoints, 28px targets under `(pointer: coarse)` and
  `(hover: none)` plus a 30px target outside (WARN), and `width: 400px` (WARN).
  Expected: `RESULT: FAIL`, exit 1.
- `fixtures/page.html` + `dom-check.mjs` — the DOM-level negative control: at
  320×844 with `@media` neutralized (media wrappers stripped, inner rules
  re-injected), both assertions FAIL: `scrollWidth=400 > innerWidth=320` and a
  28px button. Exit 1. That failure *is* the demonstration.

## dom-check.mjs — browser policy (hard boundary)

Probes, in order: `PLAYWRIGHT_BROWSERS_PATH` → `~/.cache/ms-playwright` →
`/home/p31/.cache/ms-playwright` → system `chromium` (launched via
`executablePath`, then Playwright `channel`s). If nothing can launch it prints
`SKIPPED: no browser binaries — hardware-gated` and **exits 0**. It never
attempts downloads or installs. Playwright 1.62.0 is already at
`/home/p31/node_modules`.

## Integration note — phase 2

In phase 2 this gate runs against Lane A's emitted mobile CSS:

```
/home/p31/production/design-workflow/A-token-pipeline/dist/css-mobile/tokens.mobile.css
```

— *path noted only; NOT executed in this lane.* Wiring per runbook §10:
`pnpm gate:mobile-first` (mobile-first), `pnpm gate:touch-target`,
`pnpm gate:clamp-rem`. The static gate is intentionally dependency-free so it can
run in CI before/without any browser; `dom-check.mjs` is the optional
hardware/browser-gated layer on top.