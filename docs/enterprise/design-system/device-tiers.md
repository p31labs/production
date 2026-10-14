<!-- P31-HEADER
id: p31_device_tiers_20261012_v1.0
type: research
component: packages/design-core
status: live
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# Device tiers — window-size classes, fluid type, container queries, embedded

W4 of the marketplace human-simplification plan (research principles 4/5).
Canon token surface: `p31.device.*` (new group), `--p31-fluid-*` (new clamp
pairs). Everything here is **additive** — no pre-existing `p31.*` path or
value changed (the parity/vocabulary gates enforce this).

## The three adaptation axes (pick by question)

| Question | Axis | Mechanism | Layer |
|---|---|---|---|
| Which machine? | **Device tiers** | window-size class + pointer type | `p31.device.*` tokens + `src/css/device.css` media queries |
| How smooth? | **Fluid tokens** | `clamp()` between rem bounds | `--p31-fluid-*` (canon `:root`) |
| Which parent? | **Container queries** | `@container` + `cqi` units | `src/css/container.css` utilities |

They stack: a component can use a container-scoped `cqi` clamp **inside** a
page that remaps tier slots by window-size class. `device.css` ships the
coexistence rule (`[data-device-adaptive] [data-container-adaptive]` →
fluid wins inside the container).

## 1. Device tiers — `p31.device.*`

New DTCG group (canon `SEMANTIC_MAP`), theme-agnostic literals, emitted as
`--p31-device-<tier>-<axis>-<step>` custom properties and nested
`p31.device.<tier>.<axis>.<step>` DTCG nodes.

### Window-size-class thresholds

| Token (DTCG) | CSS var | Value |
|---|---|---|
| `device.phone.max` | `--p31-device-phone-max` | 600px |
| `device.chromebook.min` / `.max` | `--p31-device-chromebook-min` / `-max` | 601px / 1280px |
| `device.desktop.min` | `--p31-device-desktop-min` | 1281px |
| `device.embedded.max` | `--p31-device-embedded-max` | 480px |

The thresholds are **tokens for JS** (`matchMedia`), because CSS cannot read
custom properties inside `@media` conditions. `src/css/device.css` mirrors
the same numbers in its media queries.

### Pointer-capability hints (1 = primary/available, 0 = not)

| Tier | coarse | fine | Meaning |
|---|---|---|---|
| phone | 1 | 0 | touch-first |
| chromebook | 1 | 1 | convertible — touch + trackpad |
| desktop | 0 | 1 | mouse/trackpad |
| embedded | 1 | 0 | panel touch (Node Zero default; set per build) |

### Per-tier spacing / type / radius

- Spacing 3 steps: `device.<tier>.spacing.xs|sm|md`
  (phone 4/8/12, chromebook 4/8/16, desktop 4/8/16, embedded 2/4/8 px)
- Type 3 steps: `device.<tier>.type.base|sm|lg`
  (phone 16/14/20, chromebook 15/13/20, desktop 17/15/22, embedded 14/12/18 px)
- Radius 2 steps: `device.<tier>.radius.sm|md`
  (phone 8/12, chromebook 8/16, desktop 8/16, embedded 4/8 px)

Usage: `[data-device-adaptive]` remaps three **new slot tokens**
(`--p31-tier-spacing`, `--p31-tier-type`, `--p31-tier-radius`) per tier;
components consume the slots, never the tier tokens directly. The embedded
tier is **explicit opt-in** (`<html data-device="embedded">`) — a 320×480
viewport is indistinguishable from a phone browser, so the serving device
sets the attribute.

## 2. Fluid tokens — `--p31-fluid-*`

New canonical clamp pairs (canon `GLOBAL_COMPAT`, emitted once in `:root`):

```css
--p31-fluid-text-base: clamp(0.9375rem, 0.9375rem + 0.5vi, 1.0625rem);
--p31-fluid-space-md:  clamp(0.75rem,  0.625rem + 1.5vi, 1.25rem);
--p31-fluid-radius-md: clamp(0.5rem,   0.5rem + 0.5vi,  1rem);
```

Full set: `text-sm|base|lg|xl|display`, `space-xs|sm|md|lg|xl`,
`radius-md`.

### The clamp formula

```
clamp(MIN, MIN + slope × vi, MAX)      slope = (MAX − MIN) ÷ Δvi
```

- **MIN / MAX are rem-based.** Browser zoom (WCAG 1.4.4 — 200% text resize
  without loss) scales `rem` linearly, so the whole range rides the zoom.
  Never clamp text with px-only bounds.
- **The ideal leg uses `vi`** (viewport-inline, 1vi = 1% of the inline
  axis). `vi` reads the *inline* axis, so it behaves under writing-mode
  and is Baseline since Aug 2025 — same maturity window as `cqi`.
- **Swap `vi` → `cqi`** (1% of the query container's inline size) when the
  component is scoped to a container, not the viewport. Same formula.
- Keep the **slope shallow** (text: ≤ 4vi over the range; spacing: ≤ 4vi)
  so the middle leg never outruns the bounds on extreme aspect ratios.

Fluid values are CSS-function values — the DTCG export drops them (not
portable), the CSS emit keeps them. Same convention as the existing
`--p31-type-*` clamps; the parity gate reports them as CSS-only.

## 3. Container queries + `cqi` — component-scoped adaptation

`@container` + container query units are Baseline since Aug 2025. Use them
when the adaptation question is **the parent, not the viewport** (a card in
a 300px sidebar inside a 1440px page).

Existing utilities (`src/css/container.css`):

- `[data-container]` — marks an element as an `inline-size` container.
- `[data-container-adaptive]` — cqi-scoped fluid slots
  (`--p31-container-font/padding/gap`).
- `[data-container-grid]` — 2-col auto grid collapsing to 1 col under
  400px and expanding to 3 over 800px, driven by `@container`.

Decision guide:

| Situation | Use |
|---|---|
| Whole page adapts to the machine (topbar, nav, grid) | device tiers (`p31.device.*` + `[data-device-adaptive]`) |
| Smooth scaling across a range | fluid tokens (`--p31-fluid-*`) |
| A component adapts to its slot (sidebar vs main, dashboard cell) | `@container` + `cqi` |
| Both | stack: container fluid inside tier remap |

## 4. Embedded tier — ESP-32 Node Zero

`packages/design-core/scripts/emit-embedded-shell.mjs` (plain node, zero
deps) emits a minimal subset of the canon token set into
`packages/design-core/dist/embedded/`:

- **25 tokens**: surface/text/accent/status colors, radius sm/md/lg,
  spacing inline sm/md/lg, one font stack, the embedded-tier adjustments
  (`device.embedded.*`), `--p31-base` — plus one focus ring rule built from
  the accent token.
- **Budget**: raw < 20 KB, gzip < 8 KB (measured: ~1.6 KB raw,
  ~0.7 KB gzipped) — far inside the plan's < 100 KB web-UI budget on a
  512 KB LittleFS.
- `--check` enforces the budget (exit 1 when over). `--self-test` is the
  negative control: it injects a fake oversized token and proves the check
  fails (and that the real subset passes).

### LittleFS `.gz` naming convention

- Keep the **same base name, `.gz` suffix**: `p31-embedded.css.gz` sits
  beside `p31-embedded.css`. Never rename the compressed file
  (e.g. not `p31-embedded.min.gz`).
- Serve the `.gz` body with `Content-Encoding: gzip`. With
  `esp_http_server`, set the header on the URI handler explicitly; newer
  IDF file-server examples detect the `.gz` sibling automatically —
  verify against your IDF version.
- Never gzip on the ESP-32 at runtime; the `.gz` on LittleFS **is** the
  served body.
- Keep the raw sibling for clients that do not send
  `Accept-Encoding: gzip`.

## Threshold sync

The `600/601/1280/1281` numbers live in **two places on purpose**:
`p31.device.*` threshold tokens (JS-readable) and `src/css/device.css`
media queries (CSS needs literals). When a threshold changes, change both
and re-run `pnpm -F @p31ca/design-core test` (the device-tier spec pins the
emitted token values).