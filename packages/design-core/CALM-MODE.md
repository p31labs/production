# CALM MODE — The Regulation Instrument (canon spec)

**Owner:** P31 Labs — Design Systems / Platform Engineering
**Status:** LOCKED (2026-09-30) — research-validated, human-approved design direction
**Supersedes:** the legacy modal CalmOverlay (calm-circle + "Take a breath." + "Return to the workspace")
**Applies to:** `@p31ca/design-core` (CalmOverlay + CSS), `@p31/p31ca-ambient` (LED breathing), all portals consuming canon chrome

---

## 1. The design principle

Calm is **subtraction, not a modal.** The legacy overlay *added* a card, text, and a
decision ("Return to the workspace") on top of a dysregulated user. The research is
unanimous that this is the wrong shape:

- Calm UX: *"fewer decisions per screen, predictable interaction patterns, slower and
  more intentional pacing"* (Dented Feels, 2025)
- Calm Technology: capture attention only when necessary, live in the periphery, move
  center ↔ periphery freely (Weiser & Brown)
- Standard biofeedback "lacks the engagement and personal relevance needed to sustain
  long-term use," acutely for users with interoception difficulties (auto-adaptive
  biofeedback literature)

**The calm instrument removes everything except the ambient.** The dome, starfield, and
molecular heart are the calm visual. The LED ring is the breathing guide. There is no
text, no button, no decision.

---

## 2. Locked decisions

| # | Decision | Locked | Evidence |
|---|----------|--------|----------|
| 1 | Pattern | **Two-phase: physiological sigh (60s) → 6 BPM coherence** | Balban et al. 2023 (*Cell Reports Medicine*): cyclic sighing → highest positive-affect gain + largest respiratory-rate drop. 0.1 Hz resonance → maximal HRV coherence (Shaffer, Lehrer; ERS review) |
| 2 | Exit | **Esc + tap LED chip + spoon-restore. No button.** | Calm Technology: peripheral, decision-free. Esc/tap is the safety valve |
| 3 | Haptic | **Yes, haptic primary / visual secondary** | Dobrushina, Maimon, Amedi 2024: haptic (not visual) heartbeat feedback increased interoceptive accuracy + confidence |
| 4 | Forge scope | **Simplified: chrome-hiding + forge's own breathing circle** | Forge has no ambient package (570KB); the mode controller + `data-calm` is portable, the dome is not |
| 5 | Trigger | **spoons === 0** (explicit gesture deferred) | Predictable entry; gesture can be layered later |
| 6 | Reduced motion | **Opacity-based guide only** | WCAG 2.3.3 + accessible-motion: opacity fades safe; translation/scale/rotation are triggers |
| 7 | Metric | **Recovery time across sessions, NOT "felt calm"** | Garfinkel et al. 2016: autistic interoception shows high confidence/low accuracy dissociation. "Felt calm is a poor measure for a body with atypical interoception" |
| 8 | Resonance freq | **6 BPM population default**; future per-session calibration when HRV hardware lands | RF varies per person AND per session (changed in 66.7% of test/retest, 2021). No HRV sensor today → default only |

## 3. Safety guardrails (non-negotiable)

- **No breath holds.** Holds can trigger hyperarousal in anxiety/panic states
  (ClinicAlly Trained 2025; trauma-informed breathwork consensus).
- **No forced deep breathing.** Volitional control of breathing frequently leads to
  excessive ventilation → hypocapnia (low CO₂) → dizziness/anxiety, *especially* at
  paced 0.1 Hz (Bright & Murphy; 2019 paced-breathing trials). The sigh's extended
  exhale prioritizes exhale over inhale, mitigating this.
- **Gentle start, lengthened exhale.** Ramp the exhale 4:6 → 4:7 → 4:8 over the first
  60s. Do not cold-start at 4:8 (progressive-protocol consensus for dysregulated users).
- **Esc/tap always exits.** The user can end the session at any moment; no session
  exceeds ~30 min without a gentle ambient suggestion.
- **No contraindication gate** in v1 (pre-production, adult, non-clinical). The design
  avoids the flagged patterns entirely (no holds, no hyperventilation styles, no
  kapalabhati/bhastrika-class intensities).

## 4. Interaction model

```
ENTER (spoons === 0)
  document.documentElement.dataset.calm = 'true'
  chrome hidden: .topbar, .sidebar, .bottom-nav, nav, .decorative
  ambient KEPT: .starfield-bg, .molecular-heart, the dome
  LED ring: calm preset (breath, slow, blue #7a8fff) — peripheral, bottom-right
  haptic: double pulse (inhale), long fade (exhale) — if supported

PHASE 1 — ACUTE (0–60s): the physiological sigh
  LED ring: double pulse (deep inhale + top-off), long fade (extended exhale)
  exhale ramp: 4:6 → 4:7 → 4:8 over 60s
  no text, no buttons, no decisions

PHASE 2 — SUSTAINED (after 60s): coherence
  LED ring settles to a steady ~6 BPM cycle (5.5s in / 5.5s out → 5:5 at resonance)
  haptic syncs at 0.1 Hz
  the user rests as long as needed (≤30 min soft cap)

EXIT (Esc / tap LED chip / spoon-restore)
  delete data-calm; chrome returns; LED preset restored to the pre-calm state
```

## 5. Component contract — `CalmOverlay` (design-core)

```ts
export interface CalmOverlayProps {
  /** Current spoon level; calm activates at 0. */
  spoons: number;
  /** Called when the user exits calm (Esc, tap, gesture). */
  onExit: () => void;
  /** Optional hook fired on entry — the ambient consumer applies the LED calm preset. */
  onEnterCalm?: () => void;
  /** Physiological sigh first, then coherence (default true). */
  sighFirst?: boolean;
}

export function CalmOverlay({ spoons, onExit, onEnterCalm, sighFirst = true }: CalmOverlayProps): null
```

Renders **nothing**. Sets/clears `document.documentElement.dataset.calm` and, during
phase 1, `data-calm-phase="sigh"` → `"coherence"` after 60s. `onExit` is bound to an
`Escape` keydown listener while active. The ambient visual is the calm visual.

## 6. CSS — `recipes.css` (design-core)

```css
/* chrome-hiding — keep the ambient */
html[data-calm] .topbar,
html[data-calm] .sidebar,
html[data-calm] .bottom-nav,
html[data-calm] .mobile-nav,
html[data-calm] nav:not(.led-controller),
html[data-calm] .decorative,
html[data-calm] .route-skeleton {
  display: none !important;
}
html[data-calm] .starfield-bg,
html[data-calm] .molecular-heart,
html[data-calm] .dome-surface {
  display: block !important;
}

/* breathing guide — opacity only (WCAG 2.3.3 / reduced motion) */
html[data-calm] .led-ring,
html[data-calm] .calm-breathe {
  animation: calm-breathe 10s ease-in-out infinite;
}
@keyframes calm-breathe { 0%,100% { opacity: .3 } 50% { opacity: .8 } }
@media (prefers-reduced-motion: reduce) {
  html[data-calm] .led-ring,
  html[data-calm] .calm-breathe {
    animation: calm-breathe 14s ease-in-out infinite;
  }
  @keyframes calm-breathe { 0%,100% { opacity: .45 } 50% { opacity: .6 } }
}
```

## 7. Ambient contract — LED breathing (`@p31/p31ca-ambient`)

- `ledStore` gains a `'sigh'` mode (double pulse + long fade) alongside the existing
  `'breath'` mode, and a `CALM_BREATH` timeline
  (`sigh {pulse1, pulse2, exhale}` → `coherence {inhale 5.5s, exhale 5.5s}`).
- `useEffectsStore.calm` already exists and Starfield/MolecularHeart already calm at
  `calm || spoons <= 1` — no change needed there.
- `LedController`: while `calm` is true, force the calm preset (`LED_PRESETS.calm`) and
  drive the sigh→coherence timeline; restore the prior mode on exit.

## 8. Recovery metric (surfaced OUTSIDE the overlay)

```ts
interface CalmSession {
  startedAt: number; endedAt: number;
  spoonsAtEntry: number; spoonsAtExit: number; durationMs: number;
}
```

**Implemented (canon):** `CalmOverlay` fires `onSessionEnd(session)` once per calm
session; the host persists it. The trend (recovery time shortening across sessions)
is the outcome signal — surfaced in a session summary/workspace view, never inside
the calm surface. The user is never asked "do you feel calmer?".

**Pure phase logic is unit-tested:** `calmPhaseAt(elapsedMs)` (sigh → coherence at
60s) is exported and covered by `tests/calm-overlay.spec.ts` (vitest).

## 9. Scope + governance

- **Cross-portal:** design portal (full: LED + dome), forge (simplified: controller +
  breathing circle). Both calm baselines change → `snapshots:guarded` + human baseline
  review (§9.2 of FORGE-AGENTS-001).
- **Canon commit must pass:** token-audit, canon-purity, typecheck, before re-pack.
- **Verification:** structural layout gate (all routes), vision diagnostic, `parity_chrome`
  where baselines exist, full Playwright suite.
- The legacy `.calm-overlay` modal CSS is deleted from portal forks (dead fork-side CSS).

## 10. Unresolvable-from-here (documented, not blocked)

- **Individual resonance frequency:** needs HRV hardware (future Phenix Navigator
  calibration). Population default 6 BPM stands.
- **CO₂ measurement:** 6 BPM carries mild hypocapnia risk; mitigated by the
  exhale-emphasized ramp + Esc safety valve. Assumes the user exits on dizziness.
- **Forge ambient adoption:** deferred (570KB chunk, no dome surface in the forge).