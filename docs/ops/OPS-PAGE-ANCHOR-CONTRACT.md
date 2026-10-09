# /ops Page — Anchor Contract (Phase 0.5)

Canonical contract for the `/ops` route rebuild (Phase 1C). Every anchor listed
here is the destination of at least one rule in `public/_redirects` and one
entry in `ground-truth/p31.ground-truth.json => edgeRedirects`. When
`src/pages/ops.astro` is created, it MUST define an element with each `id`
below; otherwise the migration redirects land on a SPA-shell page with no
in-page target.

## Required anchors (28)

| id                  | redirects from (examples)                                   |
|---------------------|-------------------------------------------------------------|
| `agents`            | `/agents`, `/agents.html`, `/fleet-agents.html`             |
| `appointment-tracker` | `/appointment-tracker-about.html`                         |
| `attractor`         | `/attractor-about.html`, `/attractor.html`                  |
| `axiom`             | `/axiom-about.html`, `/axiom.html`                          |
| `budget-tracker`    | `/budget-tracker-about.html`                                |
| `buffer`            | `/app/buffer`, `/buffer-about.html`, `/buffer.html`         |
| `builder`           | `/builder.html`                                             |
| `centaur`           | `/centaur`, `/super-centaur`, `/super-centaur-about.html`, `/p31-super-centaur-starter.html` |
| `contact-locker`    | `/contact-locker-about.html`                                |
| `content-forge`     | `/content-forge-about.html`, `/content-forge.html`          |
| `cortex`            | `/cortex-about.html`, `/cortex.html`                        |
| `discord`           | `/discord-bot-about.html`, `/discord-bot.html`              |
| `docs`              | `/doc-suite`, `/open-doc-suite.html`                        |
| `ede`               | `/app/ede`, `/ede-about.html`, `/ede.html`                  |
| `editor`            | `/editor.html`                                              |
| `forge`             | `/kofi-forge`, `/forge-about.html`, `/forge.html`           |
| `integrations`      | `/integrations-about.html`                                  |
| `legal-evidence`    | `/legal-evidence-about.html`                                |
| `medical-tracker`   | `/medical-tracker-about.html`                               |
| `observatory`       | `/observatory.html`                                         |
| `onboard`           | `/onboard`, `/planetary-onboard-about.html`, `/planetary-onboard.html` |
| `prism`             | `/prism-about.html`, `/prism.html`                          |
| `sleep-tracker`     | `/sleep-tracker-about.html`                                 |
| `somatic`           | `/somatic-anchor-about.html`                                |
| `style`             | `/style-generator.html`                                     |
| `switches`          | `/switches.html`                                            |
| `theme`             | `/theme-showcase.html`                                      |
| `vault`             | `/vault.html`                                               |

## Edge worker apps (302 to live workers — card targets, not anchors)

`/appointment-tracker`, `/budget-tracker`, `/contact-locker`, `/genesis-gate`,
`/legal-evidence`, `/love-ledger`, `/medical-tracker`, `/sleep-tracker`,
`/somatic-anchor` → respective `*.trimtab-signal.workers.dev`.

## Rules

1. Each `id` must be a unique `id` attribute on an element in `ops.astro`.
2. Keep redirects intact: do not remove any rule in `public/_redirects`; run
   `node scripts/verify-ground-truth.mjs` after any edit to either file.
3. `/ops` keeps the Technical Hub content (moved from the old homepage hub);
   the landing page moves to `/`.
4. `/launch` and `/start` anchors belong to the landing page, not `/ops`.

## Verification

```bash
node scripts/verify-ground-truth.mjs   # must print OK
# spot-check: curl -sI https://p31ca.org/onboard
# expect: HTTP 301 -> /ops#onboard
```