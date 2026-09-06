# Crisis Mode — Complete Spec

**Trigger:** `<html data-spoons="0">` (crisis) or `"1"` (minimal).
**Delivery:** inline in every bundle (`styles/accessibility.css` last in cascade). Never lazy-load (Decision 4A).

## Contract

| Concern | Behavior |
|---|---|
| Motion | All durations 0ms; `animation-iteration-count: 1`; ambient loops dead |
| Glass | `--p31-glass-blur: 0px`; surfaces resolve to opaque `--p31-surface` |
| Text | secondary/tertiary collapse to full contrast; spoons 0 bumps base weight to 500 |
| Decoration | `svg.decorative`, `.decorative` hidden |
| Focus | hard 2px outline in full text color, glow shadows stripped |
| Overlays | modal overlay 85% black, panels lose blur, borders go strong |
| Chrome | topbar/bottom-nav/sidebars/nav hidden at spoons=0 (legacy sheet) |
| Breathing | only `.breath-circle` + exit control visible |

## Exit

CrisisOverlay composition renders the breathing panel + "I'm ready" / Escape exit,
dispatching `ready` (WC) or calling `onExit` (React). Exiting sets spoons ≥1 via host app.

## Testing

- `tests/unit/crisis.test.ts` asserts the generated ladder + accessibility rules exist.
- Playwright screenshots at spoons 0 are part of the visual matrix.
