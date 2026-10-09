<!-- P31-HEADER
id: p31_design_core_inventory_20261009_v1.0
type: research
component: packages/design-core
status: live
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

# design-core inventory — drift ledger (2026-10-09)

The SSOT consolidation's missing step. Path A deleted one `tokens.css` and
rewired one `index.css`; this ledger records the *complete* duplication surface
that the partial inventory missed. One artifact owns the truth; everything else
is generated from it, references it, or is deleted.

## 1. Source trees (disposition resolved)

| Tree | Files | Exported? | Imported? | Disposition |
|---|---|---|---|---|
| `src/css/` | 26 files (aggregate) | **yes** (`./css/*`) | via `index.css` | **canonical** — keep |
| `src/styles/` | accessibility.css, base.css, tokens.css | no | no | **deleted 2026-10-09** (dead; 2nd `tokens.css`) |
| `src/recipes/` | forms.css, recipes.css, index.css, responsive.css | no | no | **deleted 2026-10-09** (dead) |
| `src/themes/` | themes.ts, theme-switcher.js | no | no | **deleted 2026-10-09** (dead; divergent theme set) |
| `src/theming/` | theme-store.ts | yes (`./theming/theme-store`) | `gen-tokens.mts` | **canonical theme source** |

Deletion verified three ways: no `@p31ca/design-core/{styles,recipes}/*` import,
no relative import, no reference from `css/index.css` or any generator.

## 2. Theme identity — three sources, drifted

| Source | IDs | Status |
|---|---|---|
| `src/themes/themes.ts` | cipher, garden, retro, ocean, sunset, mono (6) | deleted (dead) |
| `src/theming/theme-store.ts` | garden, ocean, aurora, zen, volt (5) | **canonical** |
| `packages/shared/src/theme/ids.ts` | union of both + aliases (9) | drifted — "canonical registry" still lists 4 deleted IDs |

`ids.ts` is a THIRD hand-edited theme source (LESSONS.md L-003 pattern). Its
`ThemeId` union must be reconciled against `theme-store.ts` — Path B material,
not a mechanical fix.

## 3. NaN surface (achromatic `oklch(L 0 NaN / a)`)

| Location | Count | Disposition |
|---|---|---|
| `src/css/{base,recipes,a2ui-datacard}.css` | 14 | **fixed** (`NaN`→`0`) 2026-10-09 |
| `src/styles/`, `src/recipes/`, `src/themes/` | ~20 | removed with deleted trees |
| `src/mcp/recipes-data.ts` (embedded CSS string) | 7 | open — inline copy of recipes.css; de-dup or regenerate |
| `src/generator/adapters/{html,webcomponent}.ts` | 4 | open — fix at source |
| `src/generated-wc/CommandPalette.wc.js` | 1 | open — regenerate |
| `src/css/semantic-token-manifest.json` | 4 | open — regenerate |

`isNaN()` in `fouc-killer.js:21` and `agentic/learning/track.ts:26` are legitimate
JS, not color NaN.

## 4. Machine-specific paths

| Location | Was | Now |
|---|---|---|
| `packages/canon-mcp/package.json` | `file:/home/p31/production/...tgz` | `file:../design-core` ✓ |
| `packages/ui-react/package.json` | `file:/home/p31/production/packages/design-core` | `file:../design-core` ✓ |
| `portals/design/package.json` `test:core` | `cd ../../../production/...` | `cd ../../packages/design-core` ✓ |
| `portals/design/package.json` `gate` | `node /home/p31/production/tools/canon-audit/...` | **open** — depends on `tools (1)` rename |
| `packages/canon/package.json` `tokens:dtcg`, `gen:tokens` | `/home/p31/production/tools/token-validation/...` | **open** — `tools (1)` rename (fix-plan filed) |
| `packages/design-core/package.json` `tokens:validate` | same | **open** — `tools (1)` rename |

The `tools (1)/` directory (space in name) is a botched copy holding the real
`canon-audit/`, `token-validation/`, `design-parity/`. Consolidating it into
`tools/` is a single housekeeping action that resolves all three open script
paths. See `docs/fix-plans/token-validation-script-paths-broken.md`.

## 5. Workspace / install

| Concern | Resolution |
|---|---|
| Poisoned root install (2 `file:` deps) | fixed — install resolves 2241 pkgs |
| `ERR_PNPM_IGNORED_BUILDS` (pnpm 11) | fixed — `allowBuilds` (esbuild/sharp/workerd `true`) |
| Portal install isolation | `portals/design/pnpm-workspace.yaml` (`packages: ['.']`) |
| `--ignore-workspace` fragility (pnpm 12 #14809) | retired in favour of nested workspace yaml |

## 6. Open items (not yet executed)

1. **W2 merge resolution** — `portals/design` has a real 3-way conflict (5 files,
   no MERGE_HEAD). Human decision: package.json (keep worktree + fix 2 refs),
   vendor tarball (regenerate), 3 PNG snapshots (regenerate or pick side).
2. **`recipes-data.ts` de-dup** — replace the inline recipes.css string with a
   generated import, or regenerate it from `src/css/recipes.css`.
3. **Generator adapters + generated-wc + manifest** — regenerate after the NaN
   source fix (they embed stale copies).
4. **Theme-ID reconciliation** — `packages/shared/src/theme/ids.ts` vs
   `theme-store.ts`.
5. **Path B (dead tokens, DTCG `$deprecated`) + Path C (26 contract over-claims)**.

## The number that proves this ledger

```text
git ls-files packages/design-core/src/styles \
             packages/design-core/src/recipes \
             packages/design-core/src/themes
# MUST return nothing — the dead trees are gone, not migrated.
```