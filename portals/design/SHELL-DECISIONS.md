# SHELL-DECISIONS — design portal topbar states (RB-SPINE-001)

The spine's spec. Measured values from the verified production run (2026-10-01,
`tools/design-parity/check-shell.mjs`, 13 routes × 12 widths, 156/156 PASS).

| State | Viewport threshold (this fix) | Container threshold (spine, fill after measuring) | Search | Session button | Actions | Nav |
|-------|-------------------------------|----------------------------------------------------|--------|----------------|---------|-----|
| Wide | > 1200px | ≥ ___px on `.shell-host` | full + kbd hint (510px @1440) | label + icon (gap 293px @1440) | inline | sidebar |
| Medium | 1101–1200px | ___–___px | full, no kbd hint (275px @1200) | label + icon (gap 173px @1200) | inline | sidebar |
| Compact | 769–1100px | ___–___px | full, no kbd hint (254px @1100) | icon only ≤1100px | inline | sidebar |
| Mobile | ≤ 768px | < ___px | hidden (topbar-center hidden) | icon only, badge+spoon hidden | bottom nav (sidebar hidden) | bottom nav |

## Measured search width by viewport (production)

| Viewport | Search width | Session gap | Overlap |
|----------|-------------|-------------|---------|
| 1440 | 510px | 293px | none |
| 1280 | 353px | 213px | none |
| 1200 | 275px | 173px | none |
| 1128 (Spin 713) | 203px | 137px | none |
| 1100 | 254px | 163px | none |
| 769–820 | 26px (collapsed, clipped) | 10px | none |

## Notes

- The 1200/1100/768 values are **viewport** breakpoints today (CSS in
  `workspace.css`). The spine re-expresses them as **container** thresholds on a
  named container; the container column above is left blank until the spine
  migration measures it.
- Search at 769–820px collapses to ~26px (clipped, not overlapping). If the
  Compact state should keep a usable search, add an icon-button search collapse
  around 900px (third state) — decision pending a real consumer on that width.
- Mobile topbar hides badge + spoon-dial + theme-picker label so the session
  button stays reachable at 390px.
- Gate: `BASE_URL=<url> ROUTES=<routes> node tools/design-parity/check-shell.mjs`
  must exit 0 (156/156 on the current 13-route set) before any deploy.