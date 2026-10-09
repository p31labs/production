# The Spoon Model: Capacity-Aware Financial Interfaces

*Companion to NEUROINCLUSIVE_DESIGN.md — research-grade artifact written for a
design / HCI venue audience (CHI-style). The implementation described here is
live in the P31 Capital Machine portal; every parameter cited traces to shipped
behavior.*

---

## 1. Abstract

Mainstream financial dashboards optimize for information density: many widgets,
continuous tickers, and an implicit assumption that the operator has abundant,
unlimited attention. This artifact documents a design intervention that instead
treats the operator's available cognitive capacity as a first-class input to the
interface. The P31 Capital Machine portal implements the "spoon model": a
five-level dial (0-5) with which the user states their current energy and
executive capacity. The dial is written to the document as `data-spoons` and
drives a `--motion-scale` custom property, an information-density rule
(progressive disclosure to the top-3 widgets at low capacity, full expansion at
high capacity), and a zero-capacity full-screen rest state. Every metric card
carries an explicit five-state feedback model (loading, live, stale, error,
empty), and revenue is SHA-256 hash-chained with verification shown inline.
The design argues that capacity awareness, not density, is the competitive axis
for financial interfaces; no major consumer financial product is currently
capacity-aware. We formalize the spoon-to-interface mapping, contrast it with
density-first dashboards (Coinbase modular widgets, MetaMask protocol grouping,
Ripple treasury), and lay out an evaluation roadmap with open research
questions.

## 2. The capacity-aware UI thesis

### 2.1 Cognitive load as a first-class input

Financial decisions are consequential, and financial decisions made while
overloaded are bad decisions. The capacity-aware UI thesis holds that the
interface should adapt to how much the operator can safely hold *right now*,
rather than asking the operator to adapt to how much the interface can display.
The portal does not ask "how much information can we fit?" It asks "how much can
this person safely hold, without cost to their well-being?"

Concretely, the spoon level is a user-supplied self-assessment of current
capacity on a 0-5 dial, rendered in the topbar beside a "Calm" button. It is
treated as real input with real, specifiable consequences: motion intensity,
information density, and progressive disclosure all respond to it. The value is
broadcast as `data-spoons` on both `html` and `body`, making it available to
every style rule, component, and media query — one value, one source of truth.

### 2.2 Why this is finance-specific

Finance interfaces carry a distinctive burden. Numbers go stale and stale
numbers are hazards. Pending, failed, and empty states are easy to confuse, and
confusing them is how bad financial decisions happen. Money decisions are made
under pressure, at arbitrary hours, by people whose capacity varies hour to
hour. The failure mode of a density-first dashboard is therefore not merely
aesthetic clutter; it is a decision made on a stale or misread number at a
moment of depleted capacity.

### 2.3 Scale of the problem

Disability is not a niche concern. Approximately 1.3 billion people — about 16
percent of the global population — live with a significant disability, and the
majority of that population is not reached by mainstream financial products.
Adaptive, capacity-aware interfaces are consequently a reach argument as well
as a safety argument. Industry research is converging on the same conclusion:
analyst coverage frames adaptive interfaces as the competitive advantage in
financial UX, and accessibility is moving from compliance obligation to product
differentiation.

## 3. The spoon model formalization

The dial is five levels (0-5), broadcast as `data-spoons` on both `html` and
`body`. From this single value the interface derives three coupled responses:
motion intensity, information density, and progressive disclosure.

### 3.1 Mapping spoon level to motion

Spoon level drives a CSS custom property, `--motion-scale`, which scales the
intensity of all animation across the portal. The mapping is:

| Spoon level | `--motion-scale` | Effect |
| ----------- | ---------------- | ------ |
| 4-5         | 1                | Full motion |
| 3           | 0.6              | Reduced motion |
| 1-2         | 0.2              | Minimal motion |
| 0           | 0                | No motion |

At the lowest levels the interface becomes effectively static. When capacity is
gone, the portal stops asking the nervous system to process change. The mapping
is monotonic and coarse-grained: the user is never asked to make fine-grained
judgments about motion, only to state an honest capacity level.

### 3.2 Mapping spoon level to density and disclosure

Density and progressive disclosure follow the same dial, with explicit
thresholds:

- At spoons at or below 2, the Home cockpit shows only the top-3 metric
  widgets. Progressive disclosure means the highest-signal information is
  preserved and everything else is deferred. Withholding is a feature, not a
  fallback.
- At spoons at or above 5, widgets expand to full size. A user with capacity
  gets the full cockpit; a user without capacity gets a survivable slice.
- At spoons 0, a full-screen CalmOverlay takes over: a resting state with a
  breathing circle, the instruction "Take a breath," and a single unambiguous
  "Return to the Capital Machine" button. The default action at zero capacity
  is to rest, not to trade.

The formalization is deliberately simple. Two disclosure thresholds (top-3 at
spoons 2 and below; full expansion at 5 and above), one zero-state overlay, and
a four-step motion ramp. Simplicity is itself an accessibility property: the
rules can be stated in a table, verified in a test suite, and trusted by the
user.

### 3.3 Design principles that follow

- Progressive disclosure is driven by the user's own capacity, not by the
  system's desire to show everything.
- The "best" state is not a single maximally-informative layout; it is the
  layout that matches current capacity — sometimes three widgets, sometimes the
  full cockpit, sometimes a single breathing circle and a button to come back.
- The system never hides information behind a hierarchy that punishes low
  energy; at low capacity it narrows the field of view to the most
  decision-relevant metrics and expands when capacity is available.

## 4. Design affordances

### 4.1 Explicit five-state data feedback

Every metric card carries a five-state feedback model: loading, live, stale,
error, empty. There are no silent "..." placeholders. A user can always tell,
at a glance, whether a value is pending, current, outdated, failed, or
genuinely absent. The states are not communicated by color alone; each carries
textual and structural signals. Every card also shows a LIVE/STALE badge with a
last-sync timestamp, so freshness is a labeled, timestamped fact on the surface
rather than an implied property of a spinner. A stale number is a hazard, and
the interface names it out loud.

The five-state model is the concrete mechanism by which the interface defends
against the finance-specific failure of Section 2.2: at any capacity level, and
especially at low capacity, the user never has to infer data freshness.

### 4.2 Sensory defaults that respect the nervous system

Sensory preferences are honored before the user touches the dial:

- `prefers-reduced-motion` is respected, so operating-system-level motion
  preferences propagate even at high spoon levels.
- `prefers-reduced-transparency` is respected; glass surfaces in the Quantum
  Material design system give way rather than fight the user's system
  preference.
- Where motion exists, it uses a deliberately smooth quantum ease curve that
  avoids abrupt start/stop jank.
- The visual language is low-chroma and calm: OKLCH perceptual color with a
  hue-270 neutral family and muted glass surfaces.

The dial and the media queries are complementary, not redundant: the media
queries honor the operating system, and the dial honors the user's stated
state, which can vary within a single session.

### 4.3 Cryptographic trust inline

Trust is a verifiable property of the data, not an assertion. Revenue is
recorded in a SHA-256 hash-chained ledger in which each entry binds to the
previous block's hash, so the chain is provably ordered and any tamper attempt
breaks it. Verification runs inline: each ledger row is shown with its
verification, and the full chain can be checked via `/audit/verify`. The user
does not have to trust the dashboard; they can verify the ledger from the very
surface where they read it. Placing cryptographic verification beside the money
reduces the number of separate mental steps a low-capacity user must perform to
establish trust.

## 5. Contrast with density-first dashboards

Mainstream modular dashboards — of the Coinbase and MetaMask variety — are
optimized for information density. They expose many modules, many charts, and
many actions on a single screen, and they assume a power user with abundant
attention.

- **Coinbase** organizes a dense, extensible set of modular widgets; the value
  proposition is "see more, do more, faster." Modules are added to fill
  available space.
- **MetaMask** groups protocols and activities for navigational clarity, but
  the grouping is a taxonomy of information, not an adaptation to the operator's
  state.
- **Ripple treasury** surfaces a full financial picture to institutions;
  density is the point, capacity is not an input.

None of these products is capacity-aware: none accepts a capacity input, none
changes motion, density, or disclosure in response to operator state, and none
makes freshness and trust explicit at low capacity. Where a modular dashboard
adds modules to fill space, the spoon model removes widgets at low capacity;
where it treats "more" as the default, the spoon model treats "enough" as the
target; where it leaves data freshness to a spinner, the spoon model labels
stale data explicitly; where it stores trust off-screen, the spoon model places
cryptographic verification inline; where it assumes a fixed operator, the spoon
model accepts a dial input for how much the operator can hold today.

The closest existing precedent is CI&T's Project Nemo, which ships a "Calm
mode" as a sensory-reduction affordance. Nemo demonstrates commercial appetite
for calmer financial interfaces, but Calm mode is a toggle, not a capacity
model: it does not formalize a multi-level dial, couple motion and density to a
single input, or expose explicit five-state data feedback. The spoon model is
the formalization step beyond the toggle.

## 6. Evaluation roadmap

The claims in this artifact are implementation claims; whether they deliver the
intended human outcomes is an empirical question. We propose a roadmap for
evaluating the spoon model against density-first baselines.

### 6.1 Metrics

- **Task completion.** Percentage of users completing representative portfolio
  tasks (check balance, confirm a stale figure, verify revenue, execute a
  decision) under controlled spoon conditions.
- **Error rate.** Misreads of stale versus live data, missed state transitions,
  and incorrect trust judgments, measured against the five-state model.
- **Perceived cognitive load.** Subjective load instruments (e.g., NASA-TLX
  style rating) administered at each spoon level.
- **Spoon-reported versus observed.** Agreement between the user's stated spoon
  level and task behavior (e.g., a user who reports 0 but completes a dense
  workflow successfully). Disagreement in either direction is diagnostic: the
  dial may be underused, or the interface may not be adapting enough.

### 6.2 Study design

- Within-subjects comparison of the capacity-aware cockpit against a matched
  density-first layout at fixed spoon levels, counterbalanced.
- Induction of capacity states (fatigue, distraction) versus free self-report,
  to test whether the dial captures real variation.
- Low-capacity stress tests: task completion and error rate at spoons 0-2,
  where the top-3 disclosure and the CalmOverlay are active.
- Longitudinal capture of spoon-level distributions to test whether the dial
  tracks natural within-day and between-day variation.

### 6.3 Open research questions

- Does adaptive disclosure reduce error rate in overloaded users, or does it
  merely move errors elsewhere?
- What is the correct granularity of the dial? The current model uses five
  levels and four motion steps; a finer or coarser dial may trade learnability
  against expressiveness.
- Does the explicit five-state feedback model reduce the "stale number" error
  class more than timestamp-only baselines?
- Does inline cryptographic verification change trust behavior, or is it
  neutral for users who already trust the product?
- Is the spoon model generalizable to non-financial dense interfaces, or is
  the finance-specific failure mode (stale, consequential numbers) load-bearing?
- What happens when self-report and observed capacity diverge at scale? Should
  the interface ever infer capacity, and at what privacy cost?

## 7. References

- 11:FS. *Accessibility in finance*. 2026. Analyst research concluding that
  adaptive interfaces are the competitive advantage in financial UX.
- Lyhme, N. S., et al. *Navigating Financial Lives: How Autistic Adults Adapt
  Financial Technologies*. CHI, 2026. Proceedings of the ACM CHI conference on
  human factors in computing systems.
- Banking Curated. *Neuroinclusive Financial Systems — Review*. 2026.
  Industry review of neuroinclusive design patterns across financial systems.
- CI&T. *Project Nemo*. Product documentation describing a "Calm mode"
  sensory-reduction interface for financial services.