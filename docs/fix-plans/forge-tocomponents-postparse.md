# fix: forge component lifts dead on post-parse HTML (KPI/rec/callout never render)

<!-- P31-HEADER
id: p31_fix_plan_forge_tocomponents_postparse_20261012_v1.0
type: fix-plan
component: software/p31-forge/scripts/render-report.mjs
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

## Symptom

A rendered research report (session `btc-callkit`, 13-page PDF) showed the
cover styled but content pages reading as plain prose: metric bullets,
recommendations, and labeled paragraphs rendered as bare `<li>`/`<p>` text.
Class census of the emitted HTML: `kpi-card: 0`, `rec-card: 0`,
`callout: 0`, while `pull-quote: 1` and `data-table: 2` worked.

## Root cause

`toComponents()` runs AFTER `marked.parse()`. The KPI and rec-card lift
regexes still matched markdown syntax — `/<li>\*\*([^*]+)\*\*:…/` — but
marked has already converted `**` to `<strong>`, so literal `\*\*` can never
appear in the input. Those two lifts were dead code. The callout lift was
already post-HTML (`<p><strong>…`) and only looked dead because no section
used that pattern. Table and blockquote lifts are structural (tags survive
parse) and worked.

## Fix

Rewrote the three label lifts to operate on marked's actual output
(`<strong>`), with these rules:

- **KPI** — `<li><strong>Metric</strong>: value (detail)</li>`. The
  parenthetical is REQUIRED: it disambiguates metric bullets from
  recommendation items.
- **Callout** — `<p><strong>Label</strong>: body</p>`.
- **rec-card** — `<li><strong>Title</strong>: desc</li>`, matching only
  items the KPI lift did not consume.
- All three accept the label colon inside OR outside the `<strong>`
  (`Label:</strong>` or `</strong>:`) via an alternation, but require a colon
  somewhere — a colon-less bold bullet lifts to nothing.

## Verification (2026-10-12, session btc-callkit)

Post-fix class census: `kpi-card: 5` (Bridge Metrics), `rec-card: 5`
(Next Actions only — script bullets stay plain), `callout: 1` (honest
frame), `pull-quote: 1`, `data-table: 2`. `check-report.mjs` PASS (FK 6.9),
`check-layout.py` PASS (13 pages). PDF regenerated at
`/home/p31/BIG-THINK-CALL-KIT.pdf` (184,099 bytes).

## Gate gap (hardening suggestion, not applied)

The CSS-use check in `check-report.mjs` only verifies that classes USED in
the HTML have CSS rules. Classes never emitted (dead lifts) are invisible to
it — the regression shipped silently. A "vocabulary census" gate (expected
component classes present when their trigger pattern exists in source
markdown) would catch this class of regression. Filed for a future pass.

## Rollback

Revert `toComponents()` in `render-report.mjs` to the pre-fix regexes; no
other file touched.