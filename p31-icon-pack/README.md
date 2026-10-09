# P31 Animated SVG Icon Pack

11 self-contained animated SVG icons representing the P31 sovereign tech ecosystem.

## Structure

```
p31-icon-pack/
├── icons/
│   ├── regular/        (8 icons, 3 colors each)
│   └── advanced/       (3 icons, 6 colors each)
├── demo.html
└── README.md
```

## Regular Icons (8)

| Icon | File | Primary | Secondary | Neutral |
|------|------|---------|-----------|---------|
| K4 Tetrahedron | `k4-tetrahedron.svg` | Cyan | Violet | White |
| 863 Hz Resonance | `863hz-resonance.svg` | Gold | Violet | White |
| LOVE Heart | `love-heart.svg` | Violet | Cyan | White |
| Spoon | `spoon.svg` | Iris | Violet | White |
| Molecule | `molecule.svg` | Green | Violet | White |
| P31 Wordmark | `p31-wordmark.svg` | Red | Violet | White |
| Mesh Node | `mesh-node.svg` | Red | Violet | White |
| Signal | `signal.svg` | Cyan | Violet | White |

## Advanced Showcase Icons (3)

| Icon | File | Colors |
|------|------|--------|
| Comet Orb | `comet-orb.svg` | Cyan, Violet, Gold, Green, Red, Iris |
| Nebula Burst | `nebula-burst.svg` | Cyan, Violet, Gold, Green, Red, Iris |
| Prism Fold | `prism-fold.svg` | Cyan, Violet, Gold, Green, Iris, Red |

## Required CSS Variables

```css
:root {
  --p31-accent: #00F0FF;
  --p31-accent-violet: #A78BFA;
  --p31-accent-gold: #FBBF24;
  --p31-accent-green: #34D399;
  --p31-accent-red: #FB7185;
  --p31-accent-iris: #818CF8;
  --p31-text: #F5F5F7;
}
```

## Usage

**Inline (recommended):** Copy the SVG markup directly into your HTML. CSS variables inherit from your document.

**Image tag:** `<img src="icons/regular/k4-tetrahedron.svg" alt="K4 Tetrahedron" />` — note that CSS variables won't penetrate external SVGs; hardcode colors if using this method.

## Accessibility

- `role="img"`, `<title>`, and `<desc>` on every icon
- `prefers-reduced-motion` disables all infinite animations

## Demo

Open `demo.html` in a browser to preview all 11 icons with hot-swapping, 4x4 regular grid + 3x1 advanced showcase row, keyboard navigation, and one-click SVG copy.
