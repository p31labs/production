# Changelog — docs/enterprise

Reverse-chronological. Categorized Added / Changed / Fixed / Deprecated /
Removed / Security. This is the record of the DOC SET's own evolution, not the
engine's (that is STATUS.md).

## 2026-10-02

### Added
- Initial enterprise doc set (21 files) for the tetrahedral SIC-POVM UI engine.
- ADR 0001–0005 (SIC-POVM truth layer, two nested tetrahedra, THAKI path,
  non-compensatory Governor, RLDF reward model).
- Runbooks for SIC-POVM gate, vision measurement, RLDF training.
- `p31-glossary.md` (P31-wide terms) split out of `conventions.md`.

### Changed
- Runbooks: `Last drilled` → `Last written` + `Drill status: NOT YET DRILLED`
  (no runbook has been drilled; fabricated drill dates are lies).
- `operations/slos.md` → **SLO targets** with a `Status: NOT YET MEASURED`
  column and a "To measure these, you need" roadmap (an SLO without a metric
  is a wish).
- `architecture/02-training-loop.md`: `[planned]` badges + dashed edges for
  the reward model / Governor fidelity path (not built yet); `Status` column
  in the three-layers table.

### Fixed
- README "Verified status" now says "Verified locally (manual `node --test`,
  not a CI artifact)" instead of an unverifiable claim.
- Added a "For AI agents" section to `conventions.md` (the doc set's primary
  consumers are agents).
- Extended `tools/runbooks-check.mjs` to also scan
  `docs/enterprise/runbooks/` (ADR 0006's follow-up; see below).

### Added (ADR)
- **ADR 0006: Cross-model fallback chain** — the measurement layer's decision
  to chain llama → gemma → qwen → DEFAULT_RUBRIC and return a neutral
  `mean:5/unmeasured` response instead of a 502. Previously it lived only as an
  operational note; it is an architectural decision and is now recorded.

## 2026-10-02 (pre-fix baseline)
- The original 21-file set was produced. The runbook drill dates and the SLO
  claims in that baseline were aspirational-marked-as-fact; this changelog
  records their correction above.