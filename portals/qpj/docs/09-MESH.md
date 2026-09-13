# K₄ Mesh Visualization — Design Doc

## Overview

The K₄ tetrahedral trust mesh renders in `MeshK4` (`src/components/MeshK4.tsx`)
as an SVG tetrahedron with 4 nodes and 6 edges, shown inside a progressive
disclosure `details/summary` on the `/you` page after PassportCard.

## Requirements

- **4 nodes exactly, 6 edges exactly.** Geometry is mathematical, not data-driven.
- **Pickle names, not human names.** Node labels are pickle types:
  Dillpickle (top), Bread & Butter (bottom-left), Cornichon (bottom-right),
  Gherkin (center). Human names never appear in mesh display.
- **Pickle placeholders.** All placeholder data uses PicklePlaceholder
  (`data-placeholder="true"` for grep audit, `data-pickle-kind` attribute).
- **Barely-there UI.** No glow, no pulse, no heartbeat. Subtle opacity,
  weight, and scale only. 2026 design discipline: restraint, not spectacle.
- **Progressive disclosure.** Mesh is behind a `details/summary` wrapper,
  revealed only after PassportCard identity is confirmed.
- **Weight-encoded edges.** Edge thickness encodes trust weight:
  - `--w2`: both endpoints online (strong) → 3px
  - `--w1`: one endpoint online (medium) → 1.5px
  - `--w0`: neither online (dimmed) → 1px, 20% opacity
- **Accessibility.** SVG has `<title>` (mesh-title) and `<desc>` (mesh-desc).
  Each node has `aria-label` including pickle name. Respects
  `prefers-reduced-motion`.
- **No hardcoded human names anywhere in mesh data flow.** Mesh nodes derive
  from `PASSENGER_IDS` (configurable), display names from pickle type list.

## Geometry Constants

```
VERTICES = [{140,52},{52,212},{228,212},{140,148}]  // outer triangle + center
EDGES = [[0,1],[1,2],[2,0],[0,3],[1,3],[2,3]]        // 6 edges, K₄ complete graph
NODE_R = 22
```

## Component Architecture

- `MeshK4` reads `presence` and `meshStatus` from `useQpjStore`
- When `meshStatus === 'idle'`: renders `PicklePlaceholder kind="mesh"`
- When fewer than 4 nodes in `presence`: renders `PicklePlaceholder`
- Otherwise: renders the SVG tetrahedron with weight classes
- `PicklePlaceholder` renders a visually-void card with `data-placeholder="true"`

## Files

- `src/components/MeshK4.tsx` — K₄ mesh component
- `src/components/PicklePlaceholder.tsx` — pickle-themed placeholder
- `src/pages/you/tetrahedron.css` — combined tetrahedron + mesh + placeholder styles
- `src/__tests__/mesh-k4.test.tsx` — 16 tests (vertices, edges, weights, names, accessibility, placeholder, integration)
