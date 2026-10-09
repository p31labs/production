# Neuroinclusive Design at the P31 Capital Machine

A public design philosophy document for the P31 Capital Machine portal: a
sovereign, neuroinclusive financial dashboard. This is a living specification,
not a marketing artifact. Every claim below traces to shipped, verifiable
behavior in the portal.

---

## 1. Executive summary

Finance interfaces are built for machines: dense tables, endless tickers, and
twelve widgets per screen. They assume the human operator has unlimited
bandwidth, unlimited attention, and a nervous system that never overloads.
That assumption is false for everyone some days, and for many people every day.

The P31 Capital Machine is designed on the opposite premise: the human
operating the dashboard is the most important component in the system, and
their available capacity is a first-class input to the interface. The portal
does not ask "how much information can we fit?" It asks "how much can this
person safely hold, right now, without cost to their well-being?"

The result is a financial dashboard that visibly adapts to its operator:
motion, density, and disclosure all respond to a single control — the spoon
dial — and every piece of state is explicit, so a tired or overloaded user is
never left guessing whether a number is pending, stale, failed, or simply
empty. Cryptographic trust is embedded inline where the money is shown, not
hidden in a settings panel.

Capacity-aware financial UI matters because money decisions made while
overloaded are bad decisions. When a user is at the end of their energy, the
portal does not demand more of them — it shows less, moves less, and makes
the calm path the easy path.

---

## 2. The spoon model

### 2.1 Cognitive load as a first-class input

The portal uses the spoon model: an energy/executive-capacity budget,
rendered as a five-level dial (0–5) in the topbar, alongside a "Calm" button.
The spoon level is the user's own honest assessment of their current capacity.
It is treated as real input, with real, specifiable consequences across the
entire interface.

The spoon level is written to the document as `data-spoons` on both `<html>`
and `<body>`, which makes it available to every style rule, component, and
media query in the system. One value, one source of truth.

### 2.2 Mapping to motion

Spoon level drives a CSS custom property, `--motion-scale`, which controls the
intensity of all animation across the portal:

| Spoons | `--motion-scale` | Effect |
| ------ | ---------------- | ------ |
| 4–5    | 1                | Full motion |
| 3      | 0.6              | Reduced motion |
| 1–2    | 0.2              | Minimal motion |
| 0      | 0                | No motion |

At the lowest levels the interface becomes effectively static. When capacity
is gone, the portal stops asking the nervous system to process change.

### 2.3 Mapping to density and disclosure

Density and information disclosure follow the same dial:

- At spoons ≤ 2, the Home cockpit shows only the top-3 metric widgets.
  Progressive disclosure means the highest-signal information is preserved and
  everything else is deferred.
- At spoons ≥ 5, widgets expand to full size. A user with capacity gets the
  full cockpit; a user without capacity gets a survivable slice.
- At spoons 0, a full-screen CalmOverlay takes over: a resting state with a
  breathing circle, the instruction "Take a breath," and a single, unambiguous
  "Return to the Capital Machine" button. The default action at zero capacity
  is to rest, not to trade.

The design principle is explicit: disclosure is driven by the user's own
capacity, not by the system's desire to show everything.

---

## 3. Design principles

### 3.1 Progressive disclosure driven by the user's own capacity

The portal never hides information behind a hierarchy that punishes low
energy. Instead, at low capacity it deliberately narrows the field of view to
the most decision-relevant metrics (the top 3), and expands when capacity is
available. Withholding is a feature, not a fallback.

### 3.2 Explicit state feedback — no silent placeholders

Every metric card carries a five-state feedback model:

- loading
- live
- stale
- error
- empty

There are no silent "…" placeholders. A user can always tell, at a glance,
whether a value is pending, current, outdated, failed, or genuinely absent.
Pending, failed, and empty are visually distinct, because confusing them is
how bad financial decisions happen.

### 3.3 Data freshness is explicit

Every card shows a LIVE/STALE badge with a last-sync timestamp. Freshness is
not implied by a spinning loader; it is a labeled, timestamped fact on the
surface. A stale number is a hazard, and the portal names it out loud.

### 3.4 Cryptographic trust inline

Trust is not an assertion; it is a verifiable property of the data. Revenue
is hash-chain verified — SHA-256 linked ledger entries, verifiable through
`/audit/verify` — and this verification is shown inline next to each ledger
row. The user does not have to trust the dashboard; they can verify the
ledger from the very surface where they read it.

### 3.5 Sensory defaults that respect the nervous system

The portal respects the user's sensory environment as a first-class concern:

- `prefers-reduced-motion` and `prefers-reduced-transparency` media queries
  are respected, so the portal honors operating-system-level sensory
  preferences even before the user touches the spoon dial.
- Where motion exists, it uses a quantum ease curve — a deliberately smooth,
  non-linear easing that avoids abrupt start/stop jank.
- The design system, "Quantum Material," uses OKLCH perceptual color with a
  hue-270 neutral family and glass surfaces — a muted, low-chroma visual
  language intended to be calm rather than stimulating.

---

## 4. Accessibility claims

These are the accessibility targets the portal is built against.

- WCAG 2.2 AA conformance is the baseline target for color, contrast,
  text, and interaction.
- 48px touch targets for interactive elements (buttons, controls, the spoon
  dial, the Calm button, the Return to the Capital Machine button).
- Reduced motion is honored two ways: the `prefers-reduced-motion` media
  query, and the spoon-driven `--motion-scale` (which reaches 0 at spoons 0).
- Reduced transparency is honored via `prefers-reduced-transparency`; glass
  surfaces in Quantum Material give way rather than fight the user's system
  preference.
- State is never communicated by color alone: loading / live / stale / error
  / empty are distinguishable states with textual and structural signals
  (LIVE/STALE badges, timestamps), not just color changes.
- A full-screen calm rest state is reachable at zero capacity, giving an
  explicit, low-demand recovery path rather than a wall of motion.

No claim here implies that this document, by itself, is a certification. AA
is a target; conformance is verified in the test suite, not asserted in prose.

---

## 5. How this differs from Coinbase and MetaMask modular dashboards

Mainstream modular dashboards — of the Coinbase and MetaMask variety — are
optimized for information density. They expose many modules, many charts, and
many actions on a single screen, and they assume the operator is a power user
with abundant attention. The value proposition is: see more, do more, faster.

The P31 Capital Machine makes a different optimization. It optimizes for the
human operating it, not for the information displayed.

Where a modular dashboard adds modules to fill available space, P31 removes
widgets at low capacity. Where a modular dashboard treats "more" as the
default, P31 treats "enough" as the target. Where a modular dashboard leaves
data freshness to a spinner, P31 labels stale data explicitly. Where a modular
dashboard stores trust off-screen, P31 places cryptographic verification
inline with every ledger row. Where a modular dashboard assumes a fixed
operator, P31 accepts a dial input for how much the operator can hold today.

This is not a rejection of density. At spoons 4–5 the cockpit is fully
expanded and information-rich. It is a rejection of density as the only axis.
The P31 design space has two axes: information density and operator capacity,
and the interface moves along both of them in response to the spoon dial.

A consequence of this difference: the "best" dashboard state is not a single
maximally-informative layout. It is the layout that matches the operator's
current capacity — sometimes three widgets, sometimes the full cockpit, and
sometimes a single breathing circle and a button to come back.

---

## 6. Governance — a living spec

This document is a living specification, not a frozen artifact.

- **Source of truth.** Every behavior described here maps to implemented,
  verified behavior in the portal: the spoon dial (0–5) and Calm button in the
  topbar, the `--motion-scale` custom property, `data-spoons` on `<html>` and
  `<body>`, the top-3 widget cockpit at spoons ≤ 2, full-size widgets at
  spoons ≥ 5, the CalmOverlay at spoons 0, the five-state card feedback, the
  LIVE/STALE badges with last-sync timestamps, the SHA-256 hash-chained
  ledger verification shown inline, and the Quantum Material token system
  (OKLCH, hue-270 neutral family, glass surfaces).
- **No new claims by prose.** This document may not be extended by argument
  alone. Any new principle, metric, or claim must be accompanied by the
  shipped implementation that makes it true, or it must be marked aspirational
  and tracked as such.
- **Contradiction policy.** If a change to the portal contradicts anything in
  this document, the document must be updated in the same change — the spec
  and the code are not allowed to drift.
- **Review cadence.** The document is re-read whenever the spoon model,
  disclosure rules, state model, or design tokens change, so that "living"
  means "kept in sync," not "allowed to rot."
- **Scope.** This governs the public design philosophy of the Capital Machine
  portal. It does not govern the incentive, cryptographic, or ledger
  mechanisms themselves, which are specified elsewhere.

---

## Appendix: the behavior matrix

A compact restatement of the verified behaviors, for reviewers.

| Concern | Mechanism |
| ------- | --------- |
| Capacity input | Spoon dial (0–5) plus "Calm" button in the topbar |
| State broadcast | `data-spoons` on `<html>` and `<body>` |
| Motion intensity | `--motion-scale` custom property (1 / 0.6 / 0.2 / 0) |
| Low-capacity view | Top-3 metric widgets only at spoons ≤ 2 |
| Full-capacity view | Full-size widgets at spoons ≥ 5 |
| Zero-capacity view | CalmOverlay: breathing circle, "Take a breath," return button |
| Card state | Five states: loading / live / stale / error / empty |
| Freshness | LIVE/STALE badge plus last-sync timestamp on every card |
| Motion respect | `prefers-reduced-motion`; quantum ease curve |
| Transparency respect | `prefers-reduced-transparency` |
| Visual language | Quantum Material: OKLCH, hue-270 neutrals, glass surfaces |
| Ledger trust | SHA-256 hash-chained revenue, verifiable via `/audit/verify`, inline |
| Accessibility | WCAG 2.2 AA targets; 48px touch targets |