# AGENTS.md — P31 Design System (consuming teams)

This is the operating contract for an agent building UI **on top of** the P31
design system. It tells you how to import, how to name, and what never to do.
Read it before writing any UI.

## The two packages

| Package | What it carries | Import from |
|---|---|---|
| `@p31ca/canon` | the tokens — W3C DTCG, OKLCH, one source of truth | `@p31ca/canon/tokens.css` |
| `@p31ca/design-core` | the components + their CSS + contracts | `@p31ca/design-core/compositions`, `@p31ca/design-core/css/*` |

```ts
import { GlassCard, Button, Badge, SpoonDial } from '@p31ca/design-core/compositions';
import '@p31ca/canon/tokens.css';
import '@p31ca/design-core/css/all.css';
```

## The one non-negotiable

**Every visual value routes through a token.** No hardcoded hex, no raw `rgba()`,
no `margin: 16px` in a component. The canonical token vocabulary is the `p31.*`
namespace in `@p31ca/canon/tokens/tokens.dtc.json` — e.g. `p31.color.accent.default`,
`p31.glass.background`, `p31.layout.spacing.sm`, `p31.radius.md`. If a value you
need is not a token, that is a finding, not a reason to hardcode.

```css
/* correct */
color: var(--p31-color-text-primary);
/* wrong — this fails the token audit */
color: #0A0A0F;
```

## The ten mistakes agents make

1. Hardcoding a hex/rgba value instead of resolving a `p31.*` token.
2. Importing `@p31ca/design-core/css/tokens.css` — it was removed in the SSOT
   flip. Tokens come from `@p31ca/canon/tokens.css`.
3. Reaching into a component's internals (`../compositions/Button.tsx`) instead
   of the public `@p31ca/design-core/compositions` export.
4. Inventing a new component for something an existing 32-component composition
   already does (check `component_catalog` first).
5. Setting `position: relative` / `margin` inside a component — geometry is the
   shell's job; the component owns appearance only.
6. Using a deprecated token. `tokens.dtc.json` marks them `$deprecated`; the
   deprecation gate fails on any live consumer.
7. Forgetting `SpoonDial` / spoon-aware behavior at crisis (spoons 0–1: no
   motion, no blur, CrisisOverlay is the only chrome).
8. Mixing themes by naming — themes are a value swap at the semantic tier, never
   a component fork.
9. Shipping a component without a contract (`packages/canon/src/contracts`) and
   a `tier` (`core` / `experimental` / `deprecated`).
10. Editing `packages/canon` or `packages/design-core` to work around a gap —
    that is a contribution proposal, not a fix in place.

## Lifecycle tiers

Every component carries a `tier`: `core` (semver-stable, promoted),
`experimental` (additive, breaking allowed), `deprecated` (retiring, `$deprecated`
entry + codemod). Build against `core`; treat `experimental` as a preview.

## Finding the right thing

- `component_catalog` (the MCP tool) — the full 32-component registry with
  props, tokens, variants, tier.
- `token_resolve('p31.color.accent.default')` — resolve any token to its value.
- `catalog.html` / the design portal — the readable, live-rendered catalog.

## When to stop and ask

If you find yourself (a) needing a value that is not a token, (b) needing a
component that does not exist, or (c) editing the system packages to make a
surface work — stop. That is a contribution proposal, not a workaround.