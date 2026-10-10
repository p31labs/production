# Token Vocabulary Inventory — yml ↔ p31

Generated 2026-10-10 (step 1 of token-vocabulary-migration.md).

## Group classification

- **DTCG token groups** (`$value`): primitive, root, scale, spacing, typography, color, touch, z_index, animation, shadow, border, breakpoints.
- **Alias layers** (reference `{primitive.*}`, no `$value`): semantic (20), component (74).
- **Mixed**: property-overrides (58 `$value` + 18 config keys) — ruling deferred.
- **Non-token config**: version, metadata, theme, bounding_boxes, layout_containers, spacing_rules, cascade_layers, svg_rules, agent_prompt_injection, examples, version_history.

## primitive → p31 (the value layer)

- primitive tokens: **71**
- p31 distinct tokens: **184**
- matched by name normalization: **15**
- unmatched (vocabulary gap): **56**

### Matched (15)

- `primitive.color.text_primary` → `p31-color-text-primary`
- `primitive.color.text_secondary` → `p31-color-text-secondary`
- `primitive.spacing.xs` → `p31-spacing-xs`
- `primitive.spacing.sm` → `p31-spacing-sm`
- `primitive.spacing.md` → `p31-spacing-md`
- `primitive.spacing.lg` → `p31-spacing-lg`
- `primitive.spacing.xl` → `p31-spacing-xl`
- `primitive.spacing.xxl` → `p31-spacing-xxl`
- `primitive.radius.sm` → `p31-radius-sm`
- `primitive.radius.md` → `p31-radius-md`
- `primitive.radius.lg` → `p31-radius-lg`
- `primitive.radius.full` → `p31-radius-full`
- `primitive.blur.subtle` → `p31-blur-subtle`
- `primitive.blur.standard` → `p31-blur-standard`
- `primitive.blur.strong` → `p31-blur-strong`

### Unmatched — yml-only primitives (56)

- `primitive.color.cyan`
- `primitive.color.violet`
- `primitive.color.gold`
- `primitive.color.green`
- `primitive.color.red`
- `primitive.color.iris`
- `primitive.color.void_deep`
- `primitive.color.void`
- `primitive.color.surface`
- `primitive.color.surface2`
- `primitive.color.text_tertiary`
- `primitive.color.glass_surface`
- `primitive.color.glass_border`
- `primitive.color.glass_border_hover`
- `primitive.color.glass_surface_strong`
- `primitive.color.glass_surface_subtle`
- `primitive.color.glass_surface_body`
- `primitive.color.glass_surface_strong_tier`
- `primitive.color.glass_surface_overlay`
- `primitive.color.glass_surface_light_tier`
- `primitive.color.glass_border_tier`
- `primitive.color.glass_border_hover_tier`
- `primitive.color.starfield_hearth`
- `primitive.color.starfield_teal`
- `primitive.color.starfield_remembrance`
- `primitive.color.starfield_particle_teal`
- `primitive.color.starfield_particle_coral`
- `primitive.color.neon_cyan`
- `primitive.color.neon_magenta`
- `primitive.color.neon_violet`
- `primitive.color.neon_amber`
- `primitive.color.neon_mint`
- `primitive.color.neon_coral`
- `primitive.color.neon_orange`
- `primitive.color.neon_blue`
- `primitive.color.neon_lavender`
- `primitive.color.neon_pink`
- `primitive.color.neon_dim`
- `primitive.color.neon_faint`
- `primitive.color.neon_ghost`
- `primitive.color.void_s1`
- `primitive.color.void_s2`
- `primitive.color.void_s3`
- `primitive.color.void_s4`
- `primitive.radius.xl`
- `primitive.typography.font_sans`
- `primitive.typography.font_mono`
- `primitive.shadow.glass`
- `primitive.shadow.glow_cyan`
- `primitive.shadow.glow_cyan_hover`
- `primitive.shadow.glow_neon`
- `primitive.shadow.glow_magenta`
- `primitive.shadow.glow_violet`
- `primitive.shadow.glow_amber`
- `primitive.shadow.glow_mint`
- `primitive.shadow.glow_coral`

## Key finding

Only 15/71 primitives match by mechanical name normalization. The two
vocabularies differ structurally, not just by snake_case vs dash:

- yml: `primitive.color.glass_surface` (category-prefixed, snake_case)
- p31: `p31.glass.surface` / `p31-glass-surface` (flat semantic namespace)

The `color.`/category layer is dropped in p31, so a naive reverse mapping
(p31 → yml) fails for nearly every token. **The mapping is a semantic
translation table (step 2), not a rename.**

## Next (step 2)

Each of the 56 unmatched primitives needs disposition: (a) rename to a
canonical p31 path, (b) add a missing p31 token, or (c) mark non-portable. The
semantic/component alias layers resolve against the primitive layer, so they
follow once the primitive mapping lands.
