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

## Category-level translation (machine-readable rules)

The generator applies these rules to each yml leaf; any leaf matching no rule
goes to the gaps list. **Canonical target is always the nested semantic form**
(from `SEMANTIC_MAP`); the flat `p31.*-*` forms are non-canonical aliases and
are NOT emitted. `{name}`/`{rest}` = token's own tail, snake_case → dot.

| # | yml rule | p31 target (nested, canonical) |
|---|---|---|
| 1 | `primitive.color.{cyan,violet,gold,green,red,iris}` | `p31.accent.{name}` |
| 2 | `primitive.color.glass_{rest}` | `p31.glass.{rest}` |
| 3 | `primitive.color.{surface,surface2,void,void_deep,void_s1..s4}` | `p31.{surface,void,...}` |
| 4 | `primitive.color.neon_{rest}` | `p31.neon.{rest}` |
| 5 | `primitive.color.starfield_{rest}` | `p31.starfield.{rest}` |
| 6 | `primitive.color.text_tertiary` | `p31.text.tertiary` |
| 7 | `primitive.radius.xl` | `p31.radius.xl` |
| 8 | `primitive.typography.{font_sans,font_mono}` | `p31.font.{sans,mono}` |
| 9 | `spacing.{name}` | `p31.layout.spacing.{name}` |
| 10 | `z_index.{name}` | `p31.z.{name}` |
| 11 | `animation.duration.{name}` | `p31.duration-{name}` |
| 12 | `animation.easing.{name}` | `p31.easing-{name}` |
| 13 | `touch.{name}` | `p31.touch-{name}` |
| 14 | `scale.{name}` | `p31.scale.{name}` |
| 15 | `typography.font_family.{name}` | `p31.font.family.{name}` |
| 16 | `color.quantum.{name}` | `p31.quantum-{name}` |
| 17 | `border.radius.{name}` | `p31.radius.{name}` |

> The `{rest}`/`{name}` targets with a dash (`duration-{name}`, `touch-{name}`,
> `quantum-{name}`) are the p31 flat-form category names; the generator emits
> them nested (`p31.duration.fast`) regardless, per the "nested output" rule.

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