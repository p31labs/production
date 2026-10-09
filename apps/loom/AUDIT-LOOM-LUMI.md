# LOOM + LUMI Audit — Form Function + Design

**Portal:** `production/apps/loom` (LOOM app + LUMI agent + canon substrate) · **Mode:** static · **Date:** 2026-10-02
**Machine-readable findings:** [`.audit/impeccable.json`](./.audit/impeccable.json)

## Verdict in one line

LOOM's design system is genuinely wired (the opposite of the chat portal's critical bug): canon tokens are imported, 468 `var(--p31-*)` uses, zero standalone raw hex, reduced-motion honored end-to-end, and a tamper-evident event log with 99/99 tests and all canon loom gates green. The findings are surgical — 4 high (mostly keyboard/ARIA), 7 medium, 11 low, **0 critical**.

## Toolchain status (all verified this run)

| Check | Result |
|---|---|
| `pnpm typecheck` (+ functions tsconfig) | PASS |
| `pnpm test` | PASS (99/99) |
| canon loom tests (gate/review/memory/training/drift/determinism) | PASS |
| `scripts/verify.mjs` (SHA-256 chain + tamper) | PASS — 7 records, tamper detected |
| LUMI eval (via `dist`) | PASS — good meets all floors; bad/hard-bad correctly fail |
| `scripts/lumi-eval.mjs` (the CLI itself) | **BROKEN** — imports TS source, `ERR_MODULE_NOT_FOUND` |
| `port-audit.mjs` | 7/7 event kinds in canon; 8 used-but-unmanifested AAF actions; 18 manifest-but-unused; +84 raw-value queue |
| `docs-audit.mjs` | 13 docs, 0 failures, 1 warning |
| APCA on canon tokens | 0 fails, but **19/19 skipped** (validator is design-core-specific) |

## High

| ID | Finding | Location |
|---|---|---|
| L-F1 | Clickable `<li>` not keyboard-operable; **no `onKeyDown` anywhere in the app** | `EventOverlay.tsx:31-41` |
| L-F2 | Reject-reason `<input>` has no `aria-label`/`<label>` | `ProposalReviewPanel.tsx:65-70` |
| L-F3 | Timeline scrubber range unlabeled (Jitterbug's is labeled) | `TimelineScrubber.tsx:40-47` |
| L-D1 | Inert `data-theme="compat"` on `<html>` — not a canon ThemeId | `index.html:2` |

## Medium

- **L-D8** APCA validator is design-core-specific — canon tokens never contrast-validated (19/19 skipped)
- **L-D9** LOOM src scores 12 on chat's slop-eval, but it's a counting artifact: 196 hex are `var()` **fallbacks**, 104 rgba are shadows/highlights, 1 "emoji" is a `✳` dingbat node-label prefix (`App.tsx:288`). Not real slop.
- **L-D5** 9 non-canon token drift items (`--loom-*`, `--motion-scale`, `--p31-spring-*`)
- **L-D6** 8 `data-agent-action`s absent from `agent-manifest.json` (chain.verify, presentation.*, proposal.diff/why); 18 manifest actions unused
- **L-F4** `SoundToggle` commits to localStorage only, never the log — inconsistent write path (README documents this as intentional)
- **L-F5** Canvas surfaces (Instrument hit-test, Jitterbug orbit/zoom) are pointer-only, no keyboard equivalent
- **L-D2** Raw hex `theme-color` in `index.html:8`

## Low

- **L-F6** no skip-link / landmark labels
- **L-F7** zero `<form>`/`<label>`/`<fieldset>`/`<select>` semantics app-wide
- **L-D3** 33 rgba + 5 oklch + 3 hsl literals (documented intentional glass/shadow micro-elements)
- **L-D4** 10 inline `style={{}}` sites — all token/layout math, no hardcoded colors
- **L-D7** canon defines `[data-spoons]` scaling but LOOM never sets `data-spoons` (energy model = attention-as-light)
- **L-D10** `apps/loom/` is **not tracked in git** (`?? apps/loom/`) — no baseline/CI diff possible
- **L-D11** `docs/TOKEN-ROTATION.md` missing Related Documents (docs-audit warning)
- **L-L1** `Lumi.tsx` SVG face uses `var(--p31-bg, #1a120b)` hex fallbacks ×6 (fallbacks only, token-correct)
- **L-L2** `scripts/lumi-eval.mjs` broken (TS-source import) — works when pointed at `dist/loom/scoring.js`
- **L-L3** LUMI scorer + canon substrate verified healthy (positive)
- **L-L4** auto-propose is a deterministic 3.5s timer; no model identity (positive)

## Recommended fix order

1. **L-L2** fix `lumi-eval.mjs` to import from `dist` (tooling is broken today)
2. **L-F1/L-F2/L-F3** keyboard + labeling on the three interactive gaps (highest real-impact form-function)
3. **L-D6** sync `agent-manifest.json` (8 missing actions, prune 18 unused)
4. **L-D1** remove the inert `data-theme="compat"`
5. **L-D8** add a canon APCA matrix so family/theme palettes get contrast coverage
6. **L-D10** decide the git boundary for `apps/loom/` so audits version
7. **L-D5/L-D7** upstream or document the local token drift

No source changes made — report-only audit. `port-audit`/`docs-audit` regenerated their own inventories as part of the toolchain run.