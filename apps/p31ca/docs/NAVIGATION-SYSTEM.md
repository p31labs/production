<!-- P31-HEADER
id: p31_report_p31ca_navigation_system_20261012_v1.0
type: research
component: apps/p31ca
status: live
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# p31ca.org Navigation System — Detailed Report

**Scope:** the entire topbar layout, the Act I/II/III system, the Journey
system, the tier-2 product row, and their interactions. Every claim cites the
live implementation (files under `apps/p31ca/src`).

## 1. The three navigation systems at a glance

p31ca.org runs three overlapping navigation systems, layered per the
two-tier pattern:

| System | Files | Job |
|---|---|---|
| **Act nav** (Tier 1) | `lib/nav.ts`, `islands/CanonTopbar.tsx` | The three-act story: Invitation → Immersion → Action; every page belongs to an act |
| **Journey system** | `lib/portalRouter.ts`, `islands/JourneyNav.tsx`, `pages/journey.astro`, `islands/JourneyHub.tsx`, `islands/JourneyWizard.tsx` | Cross-portal travel: six "doors" + a 5-step family onboarding wizard |
| **Product row** (Tier 2) | `components/ProductRow.astro` | One click to any of 7 product surfaces, from anywhere in the hub |

Governed by the nav contract (`docs/SITE_MAP_AND_OWNERSHIP.md`): three
destinations are always reachable — p31ca.org, phosphorus31.org, GitHub.

## 2. The topbar layout — full map

The topbar is `CanonTopbar` (`posner-topbar`, sticky, `height:
var(--p31-header-height, 4rem)`, z-50) plus the tier-2 `ProductRow` directly
beneath it (sticky at `top: var(--p31-header-height)`, z-49, 2.5rem).

### 2.1 Desktop (≥900px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ posner-topbar (sticky, 4rem)                                                 │
│ ┌───────────┐   ┌─────────────────────────────┐   ┌────────────────────────┐ │
│ │ brand     │   │ posner-acts                 │   │ posner-utils           │ │
│ │ [31] P31  │   │ ┌─────────┐┌─────────┐┌────────┐│ │ [⎇ GitHub]             │ │
│ │   LABS ●  │   │ │Act I    ││Act II   ││Act III ││ │ [🔑 0x…ab] or [Sign In]│ │
│ │  (theme   │   │ │Invitation││Immersion││Action  ││ │ [🧭 Journey ▾]        │ │
│ │   cycle)  │   │ │   ▾     ││   ▾    ││   ▾   ││ │ [⋯ More ▾]             │ │
│ └───────────┘   │ └─────────┘└─────────┘└────────┘│ └────────────────────────┘ │
│                 │  (dropdown panel per act)      │                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ p31-productrow (sticky, 2.5rem)                                              │
│ PRODUCTS · Marketplace · Design · Workspace · PHOS · Bonding · Nonprofit ·   │
│ Status   (horizontally scrolls internally on small screens)                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Dropdown panels** (absolute, `top: calc(100% + 10px)`, min-width 220px):

```
Act I — Invitation        Act II — Immersion        Act III — Action
 Home                      LOVE (/journey)           Tools (/apps/loom)
 About                     Research                  Ask (/apps/lumi)
 Team                      Docs                      Scene (/apps/spaceship-earth)
 Stack (/enterprise)                                 Donate
 FAQ                                                Ways to Give
 CLI (/apps/cli)
```

**Overflow (⋯) menu:** ThemePicker (9 worlds) · **Spoons** radiogroup 1–5 +
🧘 sensory-rest (persists to `localStorage p31:spoons`) · System
(/apps/governance) · Lab items (Treasury, Financials, Annual Report, Press,
Security, Compliance, Arcade — from `LAB_ITEMS`).

**Journey menu:** Hub (p31ca.org/journey) + the six `DESTINATIONS`
(Workspace, QPJ, Arcade, Chat, Tetra, Passports) with live-dot badges,
access badges (`open`/`caregiver`), external-tab flags.

### 2.2 Tablet (640–900px)

- Brand name hides ≤640px (mark + dot remain).
- Act triggers compress (padding 8×10, 12px type) ≤720px.
- GitHub label hides <900px (icon chip remains).
- ProductRow scrolls internally (no body overflow).

### 2.3 Mobile (≤640px)

- Brand: `31` mark only.
- Acts: three compressed triggers remain visible (the disclosure pattern
  degrades gracefully); the utils row keeps identity + Journey + ⋯.
- ProductRow: internal horizontal scroll.

### 2.4 Spoon-aware states

- **Spoons 0 or 1** (`data-spoons` on `<html>`): the entire topbar hides
  (`display:none !important`) and the ProductRow takes the top edge
  (`top: 0`) — sensory-rest mode collapses the chrome.
- Spoons 2–5: normal chrome; theme dot reflects the active theme.

### 2.5 Interaction model

- Acts open on **hover (100ms) AND click AND focus**; single-open discipline
  via `menuStore` (opening Journey closes acts + overflow).
- Escape closes; outside-click closes; ARIA Disclosure pattern
  (`aria-expanded`/`aria-controls`/`aria-haspopup`), not `role="menu"`.
- Active act highlights when the current route's atom lives in that act
  (`actHasActiveAtom` → accent text, bold).

## 3. Act I / II / III — the narrative navigation

`lib/nav.ts` is the single source of truth:

| Act | Id | Name | Atoms (label → route) |
|---|---|---|---|
| **Act I** | `to` | Invitation | Home · About · Team · Stack · FAQ · CLI |
| **Act II** | `in` | Immersion | LOVE (/journey) · Research · Docs |
| **Act III** | `through` | Action | Tools · Ask · Scene · Donate · Ways to Give |

Semantics: **Invitation** = who we are and how to start (the front door);
**Immersion** = live in it (LOVE, research, docs); **Action** = do something
real (tools, ask, scene, give). The act names are the hub's narrative
grammar — kilo.ai's "plan before you build" mapped to a care economy.

Every atom resolves to a real route (the comment in `nav.ts` records the
phantom-path rule: no SPA catch-all traps).

## 4. The Journey system

### 4.1 JourneyNav (the cross-portal dropdown)

Self-contained, inline-styled, `menuStore`-registered. Lists Hub +
`DESTINATIONS` from `portalRouter.ts` — each with icon, label, live-dot
(verified reachable at build time), access badge, external flag. This is the
"leave the hub" control: from any page, one click to Workspace/QPJ/Arcade/
Chat/Tetra/Passports.

### 4.2 /journey page

- `JourneyHub` — the six doors as cards (icon, one-liner, live dot, access
  badge, arrow) + headline "Where will your family build today?"
- `JourneyWizard` — the **5-step family onboarding flow**:
  1. **Welcome** — "Two minutes — a passport for every member."
  2. **Who's this?** — pick the family member
  3. **Claim your space** — mint a sovereign did:key
  4. **Your passport** — DID, session, LOVE balance
  5. **Where to?** — pick a door
  With progress pips, focus-on-transition, `aria-live` step announcements,
  and step persistence (reload resumes).

## 5. Header-height contract

`MarketingShell.astro` defines `--p31-header-height: 4rem` +
`--p31-productrow-height: 2.5rem`; `html { scroll-padding-top: header +
productrow + 0.5rem }`; every `[id]` gets matching `scroll-margin-top`. The
topbar is **sticky, never fixed** — the overlap fix. Verified by Playwright
geometry checks (25/25): first content clears the 64px bar, anchors land
below the 104px header stack, content column centered at 80rem.

## 6. Known gaps (from the kilo.ai runbook lens)

1. **Act labels are narrative jargon** — "Invitation / Immersion / Action"
   reads poetic but is unlabeled for a first-time visitor; the runbook's
   plain-language standard would pair each act with a one-line
   "what's in here" hint in the panel header.
2. **Two "journey" surfaces** — the JourneyNav dropdown and the /journey
   wizard overlap conceptually (travel vs onboarding); a future pass could
   merge them (JourneyNav opens the wizard's "Where to?" step directly).
3. **Mobile tier-2 is invisible-by-default** — the ProductRow scrolls but
   nothing signals more items exist; a left-edge fade/arrow would help.
4. **Spoon controls are buried** — spoons live in the ⋯ overflow; the
   canon v2 SettingsSheet pattern (Energy / Reduce motion in one sheet)
   would consolidate ThemePicker + Spoons.
5. **Two icon vocabularies** — emoji (🧭 📄 💬 🔑 🧘) vs SVG (GitHub) vs
   p31-icon-pack (portal); the runbook's icon-set decision applies here
   too.
6. **Act panels have no descriptions** — kilo-docs' NavSection pattern
   pairs each item with a description; `NAV_ATOMS` has only labels.

## 7. Files map

| Concern | File |
|---|---|
| Acts + atoms (SSOT) | `src/lib/nav.ts` |
| Tier-1 topbar | `src/components/islands/CanonTopbar.tsx` |
| Journey dropdown | `src/components/islands/JourneyNav.tsx` |
| Journey destinations (SSOT) | `src/lib/portalRouter.ts` |
| Journey page | `src/pages/journey.astro` + `islands/JourneyHub.tsx` + `islands/JourneyWizard.tsx` |
| Tier-2 product row | `src/components/ProductRow.astro` |
| Shell + header contract | `src/layouts/MarketingShell.astro` |
| Single-open menus | `src/stores/menuStore.ts` |
| Theme + spoons | `@p31ca/shell-chrome/stores` + `islands/ThemePicker.tsx` |