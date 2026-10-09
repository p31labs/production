# Status — Shipped / Planned / Known gaps

Single source of truth. Other docs link here rather than duplicating this list.
Last verified: 2026-10-02.

## Shipped

- **Dreamer constrained decoding (JSON Mode)** — `phos-ai-proxy` `/` route
  forwards `response_format`; the Dreamer sends the ui-schema component tree as
  Workers AI JSON Mode with a mandatory fallback to the unconstrained call.
  Live: the Dreamer now emits REAL bindings (`action.logSpoon`,
  `entity.spoon.level`) instead of the `entity.field` placeholder.
- **Studio polish** — empty state (illustration + CTA + load-example), loading
  skeleton (>300ms), error card with retry, and a gate status card (traffic
  light + nextGate checklist). The gate verdict is now visible, not `n/a`.
- **RLDF reward tie-break** — the Governor's `selectSurvivors` uses an optional
  `reward` as a fidelity tie-break among equal structural scores. Admissibility
  stays non-compensatory; the reward never vetoes.
- **Loom `description`** — `chat.artifact.generated` now carries an optional
  `description` (the spec that produced the artifact), making the Loom data a
  superset of the Apple ML-RLDF dataset format.
- **AHD slop taxonomy** — `src/slop-taxonomy.mjs` maps the AHD 39-tell taxonomy
  to the four SIC-POVM axes; the specialist prompts reference it. Measured
  slop reduction 61–78%.

- **Cross-model fallback chain** in `/vision` — llama → gemma → qwen, then
  DEFAULT_RUBRIC fallback. A platform outage on the primary no longer
  collapses a specialist. (`apps/phos/worker-ai-proxy/src/vision.ts`)
- **Neutral-failure response** — all-models-fail returns
  `{ mean: 5, verdict: 'unmeasured', degraded: true }` (HTTP 200) with
  `X-P31-Degraded: true`, so the gate distinguishes "platform down" from
  "measured and collapsed".
- **Validate-before-cache** — a `/vision` result is only cached when `mean` is
  a number in `[0,10]` and `verdict` is present. Model output is external
  data, not a trust boundary.
- **SIC-POVM completeness gate** (`packages/ui-forge/src/gate.mjs`) — 4-axis
  completeness (floor 0.4), 1/3-overlap corroboration (critical findings need
  ≥2 specialists), QBism belief-update halt (`‖Δp‖ < ε`), and `needs-review`
  status for degraded axes.
- **Non-compensatory Governor** (`src/governor.mjs`) — `classifyAdmissibility`
  marks candidates admissible/inadmissible by hard rules (unknown type, no
  data binding, token violation). No LLM has unilateral selection authority.
- **Center `nextGate`** (`src/center.mjs`) — collapsed/degraded axes and
  corroborated findings map to named, actionable fixes.
- **Shared classified retry** (`src/retry.mjs`) — retries only 429/5xx/network
  with exponential backoff + jitter; fails fast on 4xx and Workers AI
  deterministic codes 7502/7504/7506. Wired into the Dreamer provider and the
  gate CLI.
- **Loom v1.2 screenshot refs** — `chat.artifact.generated` carries optional
  `screenshotRef` / `screenshotRef2` (additive extension; frozen v1 union
  unchanged). `packages/canon/src/loom/rldf.ts` extracts the pairs.
- **RLDF export harness** (`packages/ui-forge/scripts/rldf-train.mjs`) —
  exports `reward-model.jsonl` (image pairs) + `pref.jsonl` (DPO/KTO).
- **Screenshot capture** (`portals/chat/src/features/sandbox/loomEmit.ts`) —
  emits `chat.artifact.generated` with `screenshotRef` on create and
  `screenshotRef2` on edit. Wired into the sandbox store.
- **Dreamer token-map prompt** — the Dreamer prompt now includes the
  per-component allowed-token map, so live candidates are admissible.

## Planned

- **Exit-code differentiation** in the gate CLIs — `0` pass / `1`
  needs-revision / `2` incomplete / `3` needs-review (today all non-pass is
  exit `1`). Tracked as ADR-0001 follow-up.
- **PNG capture for RLDF** — the preview iframe is opaque-origin sandboxed, so
  the parent cannot canvas-capture it. Add `html-to-image` or an in-iframe
  canvas + `postMessage` so the RLDF reward model trains on images, not HTML
  fragments. Today the "screenshot ref" is the serialized rendered fragment
  (feeds the DPO/KTO text-policy layer).
- **Clef-Flash decision-model routing** in the orchestrator (`vision_review`
  tool selection).
- **AI Gateway server-side fallback** (Gemma → Llama) via `cf-aig-step`.

## Known gaps

- **RLDF reward model has no training data yet** — the Loom must accumulate
  `chat.artifact.generated` events with real pairs before `rldf-train.mjs`
  produces a meaningful dataset.
- **`--url` measurement pass** into the gate — the Playwright contrast /
  touch-target measurement (`measurePage` in `vision-review.mjs`) is not yet
  threaded into the SIC-POVM gate's sensory specialist.
- **Review-history store** — the QBism `beliefDelta`/`atEquilibrium` halt rule
  is implemented in `gate.mjs` but no R2/D1 store keeps per-artifact history
  across iterations yet.

## Verified at the last check

- 31/31 ui-forge tests · 76/76 chat portal tests · canon `tsc` clean
- `saveSetting`/`loadSetting` + the `settings` IndexedDB store exist and the
  chat suite passes (P3 dependency confirmed)
- `/vision` + `/models` live; default `llama-3.2-11b`; fallback chain and
  `X-P31-Degraded` header live-verified
- **End-to-end via smoke** (`node scripts/ui-forge-smoke.mjs`): unit + full
  pipeline (stubbed Dreamer) + gate discrimination + API liveness all pass;
  live-scoring (opt-in) scored a real image in ~4s. The smoke test is the
  integration verification — re-run it to confirm current state.