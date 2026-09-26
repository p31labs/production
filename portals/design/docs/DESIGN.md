# DESIGN.md — P31 Design Portal (Quantum Material)

> Agent-native governance for the design portal. Every claim resolves to a file
> on disk or a live URL. This is the Level 2 → Level 3 maturity transition:
> governance, not just components.

## Design principles

1. **Hierarchy over removal.** Before deleting an element, ask whether it could
   stay smaller, lower-contrast, or repositioned. Density is a feature (the
   MCP console + Accessibility surfaces are the density bar; every surface
   conforms to the 960px centered container).
2. **Load-bearing micro-interactions.** Every action acknowledges within 100ms.
   Motion is purposeful: animate `transform` + `opacity` only. Respect
   `--motion-scale` (spoon-driven) and `prefers-reduced-motion`.
3. **Dark-first, elevation by luminance.** Four surface levels (`surface`,
   `surface2`, `surface3`, `surface-deep`), 5–8% OKLCH lightness steps, no pure
   black. Elevation is luminance, not shadow.
4. **Tokens, never hardcoded values.** Raw hex/rgba is forbidden (token-audit
   gate). Three-tier: primitive → semantic → component.

## Token governance

- **Primitives** are locked (design-core canon, OKLCH only).
- **Semantic** tokens are additive (reference primitives, never raw values).
- **Component** tokens are per-portal overrides (reference semantic).
- Machine-verified: `scripts/token-audit.mjs` (raw hex), `scripts/token-presence.mjs`
  (required definitions in built CSS), `scripts/contrast-audit.mjs` (WCAG 2.2 AA).

## Component lifecycle

`proposed → experimental → stable → deprecated → removed`

- **proposed**: in the catalog, no guarantee.
- **experimental**: usable, API may change.
- **stable**: the 4.5:1 / 3:1 contrast contract holds, keyboard-first, ARIA.
- **deprecated**: still works, no new usage.
- **removed**: no longer exists.

## Contribution model

| Role | Decision rights |
|---|---|
| Design canon (design-core) | owns primitives + semantic tokens + stable components |
| Portal (this repo) | owns surfaces, component tokens, per-surface CSS (`@layer suite`) |
| AI agents | may edit surfaces + portal tokens; MUST pass all gates before deploy |

Review SLA: every change runs `pnpm gate` (typecheck + lint + test + build:pwa
[token-presence + contrast-audit] + v:gate).

## Exception path

If a change cannot conform (rare), document it in the surface's CSS header with
the specific rule it deviates from and why. Never silent-drift.

## Gates (run before any deploy)

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build:pwa && pnpm v:gate
```

`build:pwa` = `vite build && node scripts/token-presence.mjs && node scripts/contrast-audit.mjs`.