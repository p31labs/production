# Onboarding Narrative — Design Doc

## Overview

Commit 5 adds the narrative layer to the existing four-step onboarding flow
(`OnboardingFlow.tsx`) and a post-entry checklist (`PostEntryChecklist.tsx`).
The mechanics were already action-first: choose a shelf → set a label → pick a
hue → claim. Commit 5 is the *language* on top — no new wizard.

## Principles (2026 research)

1. **Action-first.** Show a visible consequence for every answer. Every step
   echoes what it changed in one tertiary line (`aria-live="polite"`).
2. **Say the hard part early, plainly, once.** DID key-loss anxiety is the #1
   usability barrier in self-sovereign identity. Key-loss copy appears
   *before* the claim action, never after.
3. **Barely-there celebration.** One static badge on the all-done transition.
   No confetti. Honours `prefers-reduced-motion` and the store's
   `reduceMotion` flag.
4. **Conditions, not sequence.** The checklist is data-driven. Each item
   auto-checks off a real store/milestone condition — nothing is faked, and
   completed work is never re-asked.
5. **Compliance ordering is preserved.** Consent surfaces (caregiver PIN, mode
   gates) precede identity collection. The narrative copy never flips that
   order.

## Files

- `src/pages/you/onboarding-copy.ts` — `ONBOARDING_STEPS` lookup table
  (eyebrow/heading/body/consequence per step) + `KEY_LOSS_COPY`.
  No family names in any copy (test-locked).
- `src/pages/you/OnboardingFlow.tsx` — renders copy from the table, adds
  consequence lines, and leads with key-loss copy on the claim step.
- `src/components/PostEntryChecklist.tsx` + `post-entry-checklist.css` —
  3-item checklist with SVG progress ring, dismiss button, and an all-done
  celebration (static in reduced-motion).
- `src/store/useQpjStore.ts` — persisted `meshSeen`, `hasUnlockedMode`, `badgeDone`,
  `onboardingChecklistDismissed`; `setMode` marks unlock when a passport
  elevates past its default rank; `initMesh` success marks `meshSeen`.
- `src/hooks/useSBT.ts` — exports `MILESTONE_CLAIMED_SPACE` so the checklist
  shares the same milestone key (no duplicated literals).
- `src/pages/YouPage.tsx` — mounts the checklist after `SBTGallery`, and the
  mesh `<details>` summary now reads "Mesh · N/4 present".

## Checklist item conditions

| Item | Auto-check when |
|---|---|
| Claim your pickle badge | `badgeDone` (set when `claimed_space` mints) or the milestone exists at mount |
| Meet the mesh | `meshSeen` (set when the mesh goes online) |
| Unlock your first mode | `hasUnlockedMode` (set when a mode past the default rank is reached) |

The checklist is collapsible (dismissible, persisted), auto-hides when all
three are done, and never re-asks completed work.