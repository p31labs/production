# 04 — Modes & progressive disclosure

Modes are privacy + capability tiers, not skin variants.

| Mode | Intended for | Default roles | Typical surface |
|---|---|---|---|
| **spark** | 5–11 (and guests, calm modes) | child, senior | street + treat; craft/workshop **locked** |
| **maker** | 11–16, hands-on | teen | + craft, chat groundwork |
| **workshop** | caregivers, builders | adult, caregiver | + workshop, mesh readout, hatch to design.p31ca.org, Studio (artifact studio) |

## Rules (`src/lib/passports.ts`)

- `MODE_RANK: spark 0 < maker 1 < workshop 2`.
- `ROLE_DEFAULT_MODE`: child/senior → spark, teen → maker, adult/caregiver → workshop.
- `canAccess(passportId, route)`: a route requires `mode ≥ route.minMode`.
- `/craft` minMode maker; `/workshop` minMode workshop.
- `clampSpoons(n)`: energy never leaves 0–5; non-finite → 3 (the neutral middle).

The `/workshop` hub hosts the absorbed design workbench (tokens, recipes, component
catalog, Intent/Opus gates, brands, APCA contrast) — every tab is a `workshop`-gated
sub-route, so spark and maker sessions are held at the PIN (docs/05).

## Enforcement path (this is the security model)

1. Person under rank navigates to a higher route (`BottomNav` may even hide the lock
   glyph for spark, but the guard is the real gate).
2. `ModeGuard` → `modeGateMachine`: `checking` → `prompt`.
3. `PinDialog` collects 4 digits with shake-on-error; correct `caregiverPin`
   (persisted) → `setMode(required)` (session-only) → children reveal,
   protected route mounts.
4. Dismiss/cancel → `redirecting` → `#/street`.

Tests (`src/__tests__/mode-locks.test.tsx`): spark behind a maker route renders
**zero** workshop/craft children; correct PIN 1234 elevates + reveals; wrong PIN
stays locked. The lock is asserted on DOM, not on labels.

## Conventions

- A surface never declares its own mode — it declares `route.minMode` in
  `src/lib/routes.ts`; the guard decides.
- Elevation is always **session** scope. A toddler inheriting the gherkin device starts at
  their own default; `setPassport` resets mode before anything else matters.
- Voice commands that target a locked surface resolve to the same lock UX (PIN or
  gentle "that needs a grown-up" reply) — never a silent side door.