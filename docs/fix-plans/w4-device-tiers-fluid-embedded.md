# fix: W4 device tiers — p31.device.*, fluid clamps, embedded shell emitter

<!-- P31-HEADER
id: p31_fix_plan_w4_device_tiers_20261012_v1.0
type: fix-plan
component: packages/design-core
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

**Discovered by:** agent:subagent:wave4-device-tiers (human-simplification plan)
**Discovered at:** 2026-10-12T00:00:00Z
**Severity:** medium (planned wave, additive surface)

## The work

W4 of `docs/plans/mcp-marketplace-human-simplification.md` — device tiers
(research principles 4/5). Landed additively; no pre-existing `p31.*` path
or value changed.

## What landed

1. **Device token groups** — `p31.device.phone|chromebook|desktop|embedded`
   in canon `SEMANTIC_MAP` (`packages/canon/src/theming/theme-store.ts`):
   window-size-class thresholds (`*.min`/`*.max`), pointer-capability hints
   (`*.pointer.coarse|fine`, number flags), per-tier
   `spacing.xs|sm|md`, `type.base|sm|lg`, `radius.sm|md`.
   Emitted as `--p31-device-*` in `dist/tokens.css` + nested DTCG nodes.
2. **Fluid tokens** — `--p31-fluid-text-*`, `--p31-fluid-space-*`,
   `--p31-fluid-radius-md` in canon `GLOBAL_COMPAT`; formula
   `clamp(MIN, MIN + slope·vi, MAX)` with rem bounds (WCAG 1.4.4-safe),
   documented in `docs/enterprise/design-system/device-tiers.md`.
3. **Device-tier utilities** — new `packages/design-core/src/css/device.css`
   (`[data-device-adaptive]` slot remap per tier, embedded opt-in), exported
   as `@p31ca/design-core/css/device.css` + wired into `css/index.css`.
4. **Embedded tier** — `packages/design-core/scripts/emit-embedded-shell.mjs`
   (zero-dep) emits a 25-token subset to `dist/embedded/p31-embedded.css(.gz)`
   with `--check` budget gate (raw < 20 KB, gzip < 8 KB) and `--self-test`
   negative control (injected oversized token must fail the check).
5. **Tests** — `packages/design-core/tests/device-tiers.spec.ts` (11 tests):
   device-token presence, additivity spot-checks, clamp-3-arg formula sanity,
   embedded budget + self-test.
6. **Doc** — `docs/enterprise/design-system/device-tiers.md` (thresholds,
   pointer hints, clamp formula, container-query decision guide, LittleFS
   `.gz` naming).

## Gates (all green)

- `node scripts/check-token-vocabulary.mjs` — pass
- `node scripts/check-token-parity.mjs` — pass (237 DTCG tokens in CSS)
- `node tools/token-validation/src/validate.mjs --only` — canon + design-core
  DTCG pass
- design-core `vitest run tests/device-tiers.spec.ts` — 11/11
- embedded `--check` pass (1559 B raw / 661 B gzip), `--self-test` proves the
  budget check fails on an injected oversized token
- regeneration of canon artifacts diffed **byte-for-byte additive** against a
  pre-edit regeneration (0 removed lines in tokens.css / tokens.dtc.json /
  tokens.resolved.json)

## Resolved

W4 landed 2026-10-12. Pre-existing unrelated design-core test failures
(React 19 server-render) tracked separately in
`docs/fix-plans/design-core-react19-server-render-test-failures.md`.