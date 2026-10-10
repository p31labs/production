<!-- P31-HEADER
id: p31_token_vocabulary_map_20261010_v1.0
type: spec
component: catalog
status: live
retention: keep-forever
created: 2026-10-10T00:00:00Z
owner: will
-->

# Token Vocabulary Map — primitive.* → p31.* DTCG

Decision (locked 2026-10-10): migrate CLI tooling to `p31.*` DTCG.

## The four-layer bridge (corrected 2026-10-10)

The prior "17 rules" were **guessed** and produced non-existent paths
(`p31.accent.cyan` does not exist). The real relationship is four layers of ONE
pipeline, bridged by `SEMANTIC_MAP` (source: `theme-store.ts`):

```
short name         accent                       ← componentDefs.ts / registry.json
semantic path      color.accent.default         ← SEMANTIC_MAP key
DTCG path          p31.color.accent.default     ← tokens.dtc.json  (p31. + semantic path)
CSS var            --p31-accent                 ← dist/tokens.css  (flat, palette)
```

`SEMANTIC_MAP['color.accent.default'] = { palette: 'accent' }` is the literal
bridge: the `palette` field names the CSS var; the key is the semantic path.

**Verified facts:**

- 85 `SEMANTIC_MAP` keys; 79 map to a real DTCG path (`p31.${semPath}`); the
  6 that don't (`type.emphasized.*`) are css-dependent/non-portable, dropped
  intentionally by `gen-tokens.mjs`.
- **8 palettes are ambiguous** — one short name → many semantic paths:

| short name | maps to |
|---|---|
| `accent` | `color.action.primary`, `color.action.primary-hover`, `color.accent.default`, `color.accent.muted` |
| `accent-gold` / `-green` / `-red` / `-violet` | `color.accent.{x}.default`, `color.accent.{x}.muted` |
| `glass-bg` | `color.action.ghost-hover`, `glass.background` |
| `surface2` | `color.action.secondary`, `surface.overlay` |
| `text-primary` | `color.action.primary-text`, `color.action.secondary-text`, `color.text.primary` |

**Consequence:** the component short names (`accent`, `accent-green`) cannot be
uniquely mapped to a DTCG path — `accent` alone is 4 different tokens. A
correct migration must decide which semantic path each short name resolves to,
or migrate component defs to full semantic paths (`color.accent.default`).

## Category-level translation (guessed — SUPERSEDED, keep for history only)

The following 17 rows were derived from yml category names and are **wrong**
(targets like `p31.accent.{name}` do not exist). Do NOT repoint consumers
against them. Replaced by the SEMANTIC_MAP-derived bridge above.

| # | yml rule | p31 target | status |
|---|---|---|---|
| 1 | `primitive.color.{cyan,violet,gold,green,red,iris}` | `p31.accent.{name}` | ✗ wrong |
| 2 | `primitive.color.glass_{rest}` | `p31.glass.{rest}` | ✗ wrong |
| 3 | `primitive.color.{surface,void,...}` | `p31.{surface,void,...}` | ✗ wrong |
| 4 | `primitive.color.neon_{rest}` | `p31.neon.{rest}` | ✗ wrong |
| 5 | `primitive.color.starfield_{rest}` | `p31.starfield.{rest}` | ✗ wrong |
| 6 | `primitive.color.text_tertiary` | `p31.text.tertiary` | ✗ wrong |
| 7 | `primitive.radius.xl` | `p31.radius.xl` | ✗ wrong (full, not xl) |
| 8 | `primitive.typography.{font_sans,font_mono}` | `p31.font.{sans,mono}` | ✗ wrong |
| 9–17 | spacing/z_index/animation/touch/scale/typography/color/border | (guessed) | ✗ wrong |

## Genuine gaps (non-portable or add-to-p31)

Tokens with no p31 equivalent — per-token disposition (non-portable vs
add-to-p31), not a rename:

| yml tokens | disposition |
|---|---|
| `root.base_unit` | rename → `p31.base` |
| `root.{tetrahedral_ratio,golden_ratio,larmor_hz,sic_povm_overlap,k4_vertices,beta_squared}` | non-portable (canonical constants) |
| `border.width.{thin,normal,thick}` | non-portable (no p31 equivalent) |
| `breakpoints.{mobile..ultrawide}` | non-portable (layout-only) |
| `shadow.{none,xs,sm,md,lg}` | non-portable (elevation covers, not 1:1) |
| `animation.{larmor_hz,speed_factor}` | `speed-factor` rename → `p31.speed-factor`; rest non-portable |

## Component group — regenerate from `componentDefs.ts` (NOT drop)

The `component` group (74 leaves) is stale component-level CSS property
templates that resolve `{primitive.*}` references. They are NOT DTCG tokens
(`tokens.dtc.json` `component` subtree is empty) and are superseded by
`componentDefs.ts` + `design-core/src/css/*.css`.

**Disposition: regenerate from `componentDefs.ts`, not drop.** The 3 consumers
that read `ty.component` (`export-design-system.mjs`, `build-sovereign.mjs`,
`export-a2ui.mjs`) keep working unchanged; the generator emits the `component`
group from the current component definitions (variants + token lists) in the
shape consumers expect, instead of the stale `{primitive.*}` templates.

| Component | props | primitive refs | disposition |
|---|---|---|---|
| `glass_panel` | 6 | glass_surface, blur, glass_border, radius.xl, shadow.glass | regenerate |
| `glass_card` | 8 | glass_surface, blur, glass_border, radius.xl, spacing.lg, shadow.glass | regenerate |
| `glass_strong` | 5 | glass_surface_strong, blur, radius.xl | regenerate |
| `glass_subtle` | 5 | glass_surface_subtle, blur, radius.xl | regenerate |
| `btn_primary` | 7 | void, spacing, radius.md, glow_cyan | regenerate |
| `btn_secondary` | 7 | spacing, radius.md | regenerate |
| `btn_ghost` | 5 | spacing, radius.md | regenerate |
| `header_candy` | 10 | (none) | regenerate |
| `crown_xs` | 2 | (none) | regenerate |
| `spoon_icon` | 3 | (none) | regenerate |
| `starfield` | 8 | void_deep | regenerate |
| `starfield_brand_p31ca` | 4 | starfield_hearth, starfield_teal | regenerate |
| `starfield_brand_phosphorus31` | 4 | (none) | regenerate |

## Dual-form tokens (flat + nested)

The 21 p31 tokens with both `p31.radius-sm` (flat) and `p31.radius.sm` (nested)
are emitted **once, nested**. See `token-vocabulary-migration.md` step 3.

## Output form

Generated `tokens.yml` emits the nested form (`p31.radius.sm`). Consumers are
repointed from `primitive.color.glass_surface` → `p31.glass.surface` per the
table above.