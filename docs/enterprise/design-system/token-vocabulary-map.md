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

## Category-level translation (9 rows)

Old pattern → new path. `{name}`/`{rest}` are the token's own tail segments,
unchanged except for snake_case → dot.

| # | yml pattern | p31 target | disposition |
|---|---|---|---|
| 1 | `primitive.color.{cyan,violet,gold,green,red,iris}` | `p31.accent.{name}` | rename |
| 2 | `primitive.color.glass_*` | `p31.glass.{rest}` | rename |
| 3 | `primitive.color.{surface,surface2,void,void_deep,void_s1..s4}` | `p31.{surface,void,...}` | rename |
| 4 | `primitive.color.neon_*` | `p31.neon.{rest}` | rename |
| 5 | `primitive.color.starfield_*` | `p31.starfield.{rest}` | rename |
| 6 | `primitive.shadow.{glass,glow_*}` | `p31.shadow.{rest}` | rename |
| 7 | `primitive.color.text_tertiary` | `p31.text.tertiary` | rename |
| 8 | `primitive.radius.xl` | `p31.radius.xl` | rename |
| 9 | `primitive.typography.{font_sans,font_mono}` | `p31.font.{sans,mono}` | rename |

## Component group — non-portable (13 rows)

The `component` group (74 leaves) is stale component-level CSS property
templates that resolve `{primitive.*}` references. They are NOT DTCG tokens
(`tokens.dtc.json` `component` subtree is empty) and are superseded by
`design-core/src/css/*.css` + `componentDefs.ts`. Disposition: **drop from
token output; do not map to p31.** Preserve nothing — regenerate component
config from `componentDefs.ts` if any consumer still needs it.

| Component | props | primitive refs | disposition |
|---|---|---|---|
| `glass_panel` | 6 | glass_surface, blur, glass_border, radius.xl, shadow.glass | drop |
| `glass_card` | 8 | glass_surface, blur, glass_border, radius.xl, spacing.lg, shadow.glass | drop |
| `glass_strong` | 5 | glass_surface_strong, blur, radius.xl | drop |
| `glass_subtle` | 5 | glass_surface_subtle, blur, radius.xl | drop |
| `btn_primary` | 7 | void, spacing, radius.md, glow_cyan | drop |
| `btn_secondary` | 7 | spacing, radius.md | drop |
| `btn_ghost` | 5 | spacing, radius.md | drop |
| `header_candy` | 10 | (none) | drop |
| `crown_xs` | 2 | (none) | drop |
| `spoon_icon` | 3 | (none) | drop |
| `starfield` | 8 | void_deep | drop |
| `starfield_brand_p31ca` | 4 | starfield_hearth, starfield_teal | drop |
| `starfield_brand_phosphorus31` | 4 | (none) | drop |

## Dual-form tokens (flat + nested)

The 21 p31 tokens with both `p31.radius-sm` (flat) and `p31.radius.sm` (nested)
are emitted **once, nested**. See `token-vocabulary-migration.md` step 3.

## Output form

Generated `tokens.yml` emits the nested form (`p31.radius.sm`). Consumers are
repointed from `primitive.color.glass_surface` → `p31.glass.surface` per the
table above.