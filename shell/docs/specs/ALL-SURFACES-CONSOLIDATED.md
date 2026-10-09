# P31 Sovereign Shell — Consolidated Surface Specifications

**Date:** 2026-08-08  
**Status:** Final — Ready for Implementation  
**Research Validated:** Yes (74 sources, SURFACE-REDESIGN-RESEARCH.md)  
**Crew:** All Agents (Home Guardian, Bonding Steward, Crypto Warden, Spaceship Navigator, Sandbox Artisan, Research Curator)  
**Consolidated By:** SOULSAFE Architect

---

## Executive Summary

This document consolidates all surface specifications into a unified navigation graph and implementation plan. All decisions are backed by 2026 research on sovereign OS design, family-centered UX, SSI patterns, spatial UI, and ethical AI.

**Key Architectural Decisions:**

1. **Cockpit as Anchor:** The 3D geodesic dome is the spatial anchor. All surfaces "dock" into it.
2. **Home as Bridge:** Home is the command center — ambient state snapshot + quick actions.
3. **Dome Recedes, Never Disappears:** When navigating to surfaces, dome scales to 25% opacity (top skylight), maintaining spatial continuity.
4. **Age-Adaptive Rituals:** Bonding surface scales for 7-year-olds vs. 17-year-olds vs. adults.
5. **Trust Dashboard:** Profile surface shows visual trust indicators and data flow.
6. **Honest Placeholders:** Justice/Marketplace/SBT get "Coming Soon" states, not fake data.
7. **Premium Vibe-Coding:** Sandbox gets matte-black UI, single accent, custom workspace feel.

---

## 1. SURFACE HIERARCHY & SPATIAL METAPHOR

| Surface | Role | Dome State | Dock Metaphor |
|---------|------|------------|---------------|
| **Cockpit** | Spatial anchor — 3D dome always accessible | 100% viewport, interactive (click ports to dock) | The ship's hull — not a "deck," the vessel itself |
| **Home** | Bridge — command center with ambient state | Dome recedes to 25%, neutral blue starfield | Bridge deck — always part of the hull, you return here |
| **Dashboard** | Mission control — detailed family health | Dome recedes to 25%, health-mapped color (red/amber/green) | Mission control deck — deeper level, dock from Home |
| **Bonding** | Crew deck — rituals, tetrahedron, LOVE economy | Dome recedes to 25%, shows tetrahedron wireframe | Crew deck — lateral from bridge |
| **Profile** | Captain's quarters — DID, keys, credentials, privacy | Dome recedes to 25%, shows identity as glowing core | Captain's quarters — private space |
| **Research** | Observation deck — papers, math visualizations | Dome recedes to 25%, shows visualizations as holograms | Observation deck — library + lab |
| **Sandbox** | Workshop bay — vibe-coding, AI chat, artifacts | Dome recedes to 25%, shows code as holographic projections | Workshop bay — build + experiment |

**Navigation Graph:**

```
         Cockpit (Anchor)
         ↓ dock ↑ undock
         Home (Bridge)
         ↓            ↘
    Dashboard     Bonding
         ↓            ↓
    Profile      Research
         ↓            ↓
    Sandbox    (back to Home)
```

**Spatial Continuity Rule:** The dome is **always visible** at 25% opacity (top skylight) when on any surface except Cockpit. This maintains spatial awareness — users never lose track of "where they are" in the sovereign shell.

---

## 2. HOME SURFACE (Detailed in HOME-DASHBOARD-SPEC.md)

**Role:** Command center dashboard — the bridge of the ship  
**Current:** 63 lines (simple launcher)  
**Target:** Ambient state snapshot + quick actions + context-aware adaptations

**Key Additions:**
- State Snapshot Bar (64px): Spoons, LOVE, Mesh, Unread, Time Context
- Context-aware adaptations (spoon level, time of day)
- "Mission Control →" link to Dashboard

**Dome Integration:** Recedes to 25%, neutral blue starfield

**Estimated Effort:** 6 hours

---

## 3. DASHBOARD SURFACE (Detailed in HOME-DASHBOARD-SPEC.md)

**Role:** Mission control — comprehensive family health overview  
**Current:** 246 lines (6-card grid, care score, spoon tide)  
**Target:** Family Snapshot card + priority-ordered cards + health-mapped dome

**Key Additions:**
- Family Snapshot Card (140px): Aggregated recent events, health trend
- Card priority ordering (urgent cards float to top)
- Family/Individual mode toggle
- Enhanced Care Score tooltip

**Dome Integration:** Recedes to 25%, health-mapped color (red/amber/green gradient)

**Estimated Effort:** 8 hours

---

## 4. BONDING SURFACE

**Role:** Crew deck — rituals, tetrahedron, LOVE economy, mesh peers  
**Current:** 313 lines (most complex surface — ritual quests, tetra viz, synthetic peers, LOVE transactions)  
**Target:** Age-adaptive ritual views + real peer data + tetrahedron-mapped dome

### 4.1 Content Inventory

| Element | Data Source | Priority | Height |
|---------|-------------|----------|--------|
| Tetrahedron Visualization | Computed (4 family members as vertices) | 1 | 240px |
| Active Ritual Banner | `bondingStore.activeRituals` | 2 | 80px |
| Ritual Quest Cards | `bondingStore.ritualQuests` | 3 | 200px each |
| LOVE Transaction Log | `bondingStore.loveTransactions` | 4 | 180px |
| Mesh Peer Cards | `shellStore.meshPeers` | 5 | 120px each |

### 4.2 Age-Adaptive Ritual Design

**Research Finding:** "Gamification motivates a 7-year-old and a 17-year-old differently" (kinhold).

**Proposal:**

| Age Group | Ritual View | Example |
|-----------|-------------|---------|
| **7-10 (Child)** | Simple, visual, emoji-heavy | "🌅 Morning Hug Quest! Give 4 hugs to earn ⭐⭐⭐⭐" |
| **11-17 (Teen)** | Medium complexity, progress bars, social | "Morning Connection — 2/4 family members checked in. Keep the streak going! 🔥" |
| **18+ (Adult)** | Full complexity, LOVE economy, analytics | "Morning Ritual — LOVE +5 per participant. Completion rate: 87% (last 30d)." |

**Implementation:**

1. Add `age` field to user profile (stored in `appStore.userAge`)
2. Ritual cards render different templates based on age:
   - `<RitualCardChild>` (emojis, stars, simple language)
   - `<RitualCardTeen>` (progress bars, streaks, social proof)
   - `<RitualCardAdult>` (LOVE economy, analytics, full data)

**Anti-Placeholder Decision:**

| Element | Current State | Decision |
|---------|---------------|----------|
| Peer DIDs | Synthetic (`did:mesh:peer-1`, etc.) | Accept as MVP — real peer DIDs require full mesh deployment. Add note "Demo peers" in dev mode. |
| LOVE transactions | Hardcoded demo transactions | Accept as MVP — replace with real transactions from `bondingStore` when available. |
| Tetrahedron vertices | Hardcoded 4 family members | Accept as MVP — make vertices dynamic when real family roster exists. |

### 4.3 Layout Specification

#### Desktop Layout

```
┌────────────────────────────────────────────────────┐
│ Tetrahedron Visualization (240px, interactive)     │
│ [Rotate, click vertices to see member details]     │
├────────────────────────────────────────────────────┤
│ Active Ritual: "Morning Connection"               │
│ 2/4 participants • LOVE +10 pending                │ 80px
├────────────────────────────────────────────────────┤
│ ┌──────────┬──────────┬──────────┐                │
│ │ Ritual 1 │ Ritual 2 │ Ritual 3 │   (200px each) │
│ └──────────┴──────────┴──────────┘                │
├────────────────────────────────────────────────────┤
│ LOVE Transaction Log (last 10 transactions)       │ 180px
├────────────────────────────────────────────────────┤
│ ┌──────────┬──────────┐                           │
│ │ Peer 1   │ Peer 2   │   (120px each)            │
│ └──────────┴──────────┘                           │
└────────────────────────────────────────────────────┘
```

#### Mobile Layout

Stack all elements vertically:
1. Tetrahedron (180px, smaller)
2. Active Ritual (80px)
3. Ritual cards (1 column, 160px each)
4. LOVE Log (180px)
5. Peer cards (1 column, 100px each)

### 4.4 Surface Connections

**Outbound:**
- Dashboard (via LOVE transaction link — "See impact on Care Score")
- Profile (via peer card click — "View peer identity")
- Cockpit (via tetrahedron "View in 3D" button — dome shows tetra in full 3D)

**Inbound:**
- Home (via "BONDING" quick-launch card)
- HeaderDrawer (via "Bonding 🔗" nav button)

### 4.5 Spaceship Earth Integration

**Dome State:** Recedes to 25%, shows tetrahedron wireframe (rotating slowly). The dome becomes a "miniature" of the full tetrahedron visualization.

**Transition:** From Bonding → Cockpit, the dome's tetrahedron wireframe scales up to full 3D interactive model.

**Estimated Effort:** 6 hours (age-adaptive views: 3h, dome integration: 2h, layout polish: 1h)

---

## 5. PROFILE / IDENTITY SURFACE

**Role:** Captain's quarters — DID, PQC keys, KEL chain, credentials, privacy controls  
**Current:** 386 lines (dense, complete — DID display, KEL chain viewer, PQC key display, credentials, export/erase)  
**Target:** Trust dashboard + data flow visualization + identity-mapped dome

### 5.1 Content Inventory

| Element | Data Source | Priority | Height |
|---------|-------------|----------|--------|
| DID Display | `identityStore.did` | 1 | 80px |
| Trust Dashboard (NEW) | Computed from KEL, credentials, peer attestations | 2 | 140px |
| KEL Chain Viewer | `identityStore.kelEvents` | 3 | 200px |
| PQC Key Display | `identityStore.currentKeys` | 4 | 120px |
| Credentials | `identityStore.credentials` | 5 | 180px |
| Data Flow Visualization (NEW) | Computed from local storage, shared data | 6 | 160px |
| Privacy Controls | Actions (export, erase) | 7 | 100px |

### 5.2 Trust Dashboard Design

**Research Finding:** "SSI UX requires visual trust indicators showing what's verified" (2026 Catalog).

**Proposal:**

```
┌──────────────────────────────────────────────────┐
│ Trust Dashboard                                  │
│ ┌────────┬────────┬────────┬────────┐           │
│ │ Chain  │ Keys   │ Creds  │ Peers  │           │
│ │ ✓ Valid│ ✓ Fresh│ 3/5    │ 2 attest│          │
│ └────────┴────────┴────────┴────────┘           │
│ Overall Trust: HIGH                              │
│ Last verified: 2 hours ago                       │
└──────────────────────────────────────────────────┘
```

**Metrics:**

| Indicator | Status | Calculation |
|-----------|--------|-------------|
| Chain | ✓ Valid / ⚠ Warning / ✗ Invalid | KEL integrity check |
| Keys | ✓ Fresh / ⚠ Rotate Soon / ✗ Expired | PQC key rotation age |
| Credentials | N/M verified | Count of verified credentials |
| Peer Attestations | N peers | Count of peers who've attested to this DID |

**Overall Trust Score:**

- HIGH: All green, 3+ credentials, 2+ peer attestations
- MEDIUM: 1-2 warnings, 1-2 credentials, 1 peer
- LOW: 1+ errors, 0 credentials, 0 peers

### 5.3 Data Flow Visualization

**Research Finding:** "Transparent data handling cues showing what data is stored locally vs. shared externally" (Privacy-First Dashboards).

**Proposal:**

```
┌──────────────────────────────────────────────────┐
│ Data Flow                                        │
│                                                  │
│ [Device] ──────┐                                │
│                │                                │
│           [Local Storage] ← 🔒 All identity data│
│                │                                │
│                └──→ [Shared with 2 peers]       │
│                     └─ Peer 1: DID only         │
│                     └─ Peer 2: DID + 1 credential│
│                                                  │
│ Nothing sent to cloud ✓                         │
└──────────────────────────────────────────────────┘
```

**Implementation:** Parse `identityStore` and `shellStore` to determine:
1. What data is stored locally (DID, keys, KEL, credentials)
2. What data has been shared (via mesh, attestations, credential presentations)
3. What data has been sent to external services (should be zero for sovereign shell)

### 5.4 Layout Specification

#### Desktop Layout

```
┌────────────────────────────────────────────────────┐
│ DID: did:key:z6Mk... (80px)                       │
├────────────────────────────────────────────────────┤
│ Trust Dashboard (140px)                            │
│ Chain ✓ | Keys ✓ | Creds 3/5 | Peers 2            │
│ Overall Trust: HIGH                                │
├────────────────────────────────────────────────────┤
│ KEL Chain Viewer (200px, scrollable)              │
├────────────────────────────────────────────────────┤
│ PQC Key Display (120px)                           │
│ Current: SPHINCS+ | Rotated: 45d ago              │
├────────────────────────────────────────────────────┤
│ Credentials (180px)                                │
│ ┌─────────┬─────────┬─────────┐                  │
│ │ Cred 1  │ Cred 2  │ Cred 3  │                  │
│ └─────────┴─────────┴─────────┘                  │
├────────────────────────────────────────────────────┤
│ Data Flow Visualization (160px)                   │
│ [Device] → [Local] → [Shared with 2 peers]        │
├────────────────────────────────────────────────────┤
│ Privacy Controls (100px)                          │
│ [Export Identity] [Erase All Data]                │
└────────────────────────────────────────────────────┘
```

#### Mobile Layout

Stack all elements vertically (same order, narrower widths).

### 5.5 Surface Connections

**Outbound:**
- PassportPanel (via settings link — merge PassportPanel into Profile as a section?)
- Dashboard (via "See identity impact on Care Score" link)
- Cockpit (via "View identity as 3D core" button)

**Inbound:**
- HeaderDrawer (via "Profile 👤" nav button)
- Bonding (via peer card click)

### 5.6 Spaceship Earth Integration

**Dome State:** Recedes to 25%, shows identity as a **glowing core** (pulsing sphere at center of dome). The core's color reflects Trust Score (green: HIGH, amber: MEDIUM, red: LOW).

**Transition:** From Profile → Cockpit, the glowing core expands to fill the dome, then transforms back into the full geodesic starfield.

**Estimated Effort:** 7 hours (trust dashboard: 3h, data flow viz: 2h, dome integration: 2h)

---

## 6. COCKPIT / SPACESHIP EARTH SURFACE

**Role:** Spatial anchor — 3D geodesic dome, always accessible  
**Current:** 17 lines (just title + SpaceshipEarth component)  
**Target:** The dome IS the surface. Add optional HUD overlay with surface quick-links.

### 6.1 Content Inventory

| Element | Data Source | Priority | Display Condition |
|---------|-------------|----------|-------------------|
| 3D Geodesic Dome | `<SpaceshipEarth>` component | 1 | Always (100% viewport) |
| HUD Overlay (NEW) | Static | 2 | Optional (toggle with 'H' key) |
| Port Labels | Static (12 ports around dome) | 3 | Show on hover |
| Navigation Hints | Static | 4 | Show on first visit |

### 6.2 HUD Overlay Design

**Proposal:** Add a minimal heads-up display (HUD) overlay with quick-links to all surfaces.

```
┌────────────────────────────────────────────────────┐
│ P31 Sovereign Shell              🏠 Home  ⚙ Settings│ (Top bar, 40px)
│                                                    │
│               [3D Geodesic Dome]                   │
│                                                    │
│                                                    │
│                                                    │
│ Quick Dock:                                        │ (Bottom bar, 60px)
│ [Home] [Dashboard] [Bonding] [Profile] [Research] [Sandbox]
└────────────────────────────────────────────────────┘
```

**HUD Toggle:** Press 'H' to hide/show HUD. First-time users see HUD by default. Power users can hide it for full immersive dome.

**Port Labels:** When hovering over a port on the dome, show label: "Home," "Dashboard," "Bonding," etc.

### 6.3 Docking Mechanism

**Current:** Click a port on the dome to "dock" into that surface.

**Enhancement:** Add visual feedback:
1. Port glows on hover (blue outline)
2. Port pulses on click (expanding ring animation)
3. Dome scales down to 25%, surface slides in (300ms transition)

**Undocking:** Click Topbar "Ⓟ31" brand icon or press 'Esc' to undock from any surface back to Cockpit.

### 6.4 Surface Connections

**Outbound:** All surfaces (via port clicks or HUD quick-links)

**Inbound:** All surfaces (via "Ⓟ31" brand icon or 'Esc' key)

### 6.5 Dome State Transformations

**Research Finding:** "Spatial UI uses environmental context for interaction logic" (2026 Trends).

**Proposal:** The dome transforms to reflect the active surface's context:

| Active Surface | Dome Transformation (when at 25%) |
|----------------|-----------------------------------|
| Home | Neutral blue starfield (slow rotation) |
| Dashboard | Health-mapped starfield (red/amber/green gradient) |
| Bonding | Tetrahedron wireframe overlay (rotating) |
| Profile | Glowing core at center (color = trust score) |
| Research | Holographic projections of papers/visualizations orbiting dome |
| Sandbox | Code fragments as holographic text floating inside dome |
| Cockpit | Full 100% viewport, interactive, neutral starfield |

**Spatial Continuity:** Users always see the dome at 25% opacity (top skylight) when on any surface. This maintains awareness of "where they are" in the sovereign shell.

**Estimated Effort:** 4 hours (HUD overlay: 2h, port labels: 1h, dome transformations: 1h)

---

## 7. RESEARCH SURFACE

**Role:** Observation deck — papers, math visualizations, interactive models  
**Current:** 191 lines (Zenodo feed, math visualizations)  
**Target:** Holographic projections + honest empty states + dome-integrated visualizations

### 7.1 Content Inventory

| Element | Data Source | Priority | Height |
|---------|-------------|----------|--------|
| Zenodo Feed | API (`/api/zenodo/recent`) | 1 | 400px (3 papers) |
| Math Visualizations | Static (placeholders) | 2 | 240px each |
| Interactive Models | Static (future) | 3 | 300px |

### 7.2 Holographic Projection Concept

**Research Finding:** "Star positions shown in true 3D space, not flattened" (Stellarium article).

**Proposal:** Instead of a flat 2D panel, Research visualizations appear as **holographic projections** inside the dome.

**Implementation:**

1. Research surface shows a 2D grid of papers/visualizations (current layout)
2. Each paper/visualization has a "View in Dome" button
3. Clicking "View in Dome" navigates to Cockpit, where the paper/visualization appears as a 3D hologram inside the dome
4. User can rotate the dome to view the hologram from different angles

**Example:**

- Paper: "Quantum-Resistant KEL Chains" → In dome: Floating text blocks with abstract, authors, key figures
- Math visualization: "Tetrahedron Rotation Matrix" → In dome: Animated 3D tetrahedron rotating

**Rationale:** This makes Research feel like an "observatory" — you're not just reading papers, you're immersed in them.

### 7.3 Honest Empty States

**Current Issue:** Zenodo feed is flaky (sometimes returns 0 papers). Current UI shows empty grid with no explanation.

**Proposal:**

```
┌────────────────────────────────────────────────────┐
│ Research Library                                   │
├────────────────────────────────────────────────────┤
│ Zenodo Feed                                        │
│                                                    │
│ [Empty state illustration]                         │
│                                                    │
│ No papers available                                │
│ Zenodo service may be offline or rate-limited.     │
│ Try again later or explore visualizations below.   │
│                                                    │
│ [Retry] [Explore Visualizations]                   │
└────────────────────────────────────────────────────┘
```

**Anti-Placeholder Decision:**

| Element | Current State | Decision |
|---------|---------------|----------|
| Zenodo feed | Flaky (sometimes 0 papers) | Add honest empty state: "Zenodo unavailable. Try again later." |
| Math visualizations | Static placeholders | Replace with real visualizations (D3.js, Three.js) or remove if not ready |

### 7.4 Layout Specification

#### Desktop Layout

```
┌────────────────────────────────────────────────────┐
│ Zenodo Feed (400px)                                │
│ ┌───────┬───────┬───────┐                         │
│ │Paper 1│Paper 2│Paper 3│ [View in Dome] buttons  │
│ └───────┴───────┴───────┘                         │
├────────────────────────────────────────────────────┤
│ Math Visualizations (240px each)                   │
│ ┌──────────────┬──────────────┐                   │
│ │ Tetrahedron  │ KEL Chain    │ [View in Dome]    │
│ └──────────────┴──────────────┘                   │
└────────────────────────────────────────────────────┘
```

#### Mobile Layout

Stack vertically:
1. Zenodo papers (1 column, 150px each)
2. Math visualizations (1 column, 200px each)

### 7.5 Surface Connections

**Outbound:**
- Cockpit (via "View in Dome" button — shows paper/viz as hologram)
- Home (via "Back to Home" link)

**Inbound:**
- HeaderDrawer (via "Research 📚" nav button)
- Dashboard (via Insights card link?)

### 7.6 Spaceship Earth Integration

**Dome State:** Recedes to 25%, shows **holographic projections** of papers/visualizations orbiting the dome (like satellites).

**Transition:** From Research → Cockpit (via "View in Dome"), the selected visualization scales up from miniature hologram (25% dome) to full 3D interactive model (100% dome).

**Estimated Effort:** 6 hours (holographic projection system: 3h, honest empty states: 1h, dome integration: 2h)

---

## 8. SANDBOX SURFACE

**Role:** Workshop bay — vibe-coding, AI chat, artifact generation  
**Current:** 112 lines (thin wrapper around Chat + ArtifactRenderer)  
**Target:** Premium workspace feel + matte-black UI + code-mapped dome

### 8.1 Content Inventory

| Element | Data Source | Priority | Height |
|---------|-------------|----------|--------|
| Chat Interface | `<Chat>` component | 1 | 50% viewport |
| Artifact Renderer | `<ArtifactRenderer>` component | 2 | 50% viewport |
| Pop-out Toggle | Action button | 3 | 40px |

### 8.2 Premium Visual Pass

**Research Finding:** "Matte-black UI, single accent, custom title bar, GPU terminal" (Forze IDE).

**Current Issue:** Sandbox looks like a chat interface. It should feel like a **dedicated workspace** — a sovereign code studio.

**Proposal:**

1. **Matte-black background** (`bg-black` instead of `bg-card`)
2. **Single accent color** (cyan: `#00FFFF` for active elements)
3. **Custom title bar** (replace generic "Sandbox" with "Workshop Bay — Vibe-Coding Studio")
4. **Monospace font** for all text (chat messages, artifact code)
5. **Glow effects** on active artifact (subtle cyan glow around renderer)
6. **Code highlighting** in chat (syntax-highlighted code blocks)

**Visual Mockup:**

```
┌────────────────────────────────────────────────────┐
│ Workshop Bay — Vibe-Coding Studio          [Pop-out]│ (Custom title bar, 40px)
├────────────────────────────────────────────────────┤
│ CHAT (50% height)                                  │
│ ┌────────────────────────────────────────────────┐ │
│ │ > Build a React counter component             │ │
│ │                                                │ │
│ │ [Assistant] Here's your counter:              │ │
│ │ ```jsx                                         │ │
│ │ const Counter = () => { ... }                  │ │
│ │ ```                                            │ │
│ │ [Artifact generated: counter-demo]             │ │
│ └────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────┤
│ ARTIFACT (50% height, glowing cyan border)         │
│ ┌────────────────────────────────────────────────┐ │
│ │ [Live React counter component rendering]      │ │
│ │ Count: 5   [+] [-]                             │ │
│ └────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

**Color Palette:**

- Background: `#000000` (matte black)
- Text: `#E0E0E0` (light gray)
- Accent: `#00FFFF` (cyan)
- Code blocks: `#1E1E1E` (dark gray) with syntax highlighting
- Artifact glow: `0 0 10px rgba(0, 255, 255, 0.5)` (cyan glow)

### 8.3 Layout Specification

#### Desktop Layout

Split 50/50 vertical:
- Top: Chat interface (scrollable)
- Bottom: Artifact renderer (live preview)

#### Mobile Layout

Split 60/40 vertical:
- Top: Chat (60%)
- Bottom: Artifact (40%, smaller preview)

**Pop-out Mode:** Artifact renderer opens in a separate window (native browser window or modal overlay). Chat stays in main Sandbox surface.

### 8.4 Surface Connections

**Outbound:**
- Home (via "Back to Home" link)
- AssistantPanel (via chat integration — chat messages sync with AssistantPanel?)

**Inbound:**
- Home (via "Sandbox 🛠" link — add to quick-launch cards?)
- HeaderDrawer (via "Sandbox 🛠" nav button)

### 8.5 Spaceship Earth Integration

**Dome State:** Recedes to 25%, shows **code fragments** as holographic text floating inside the dome. The code fragments are snippets from the active artifact.

**Transition:** From Sandbox → Cockpit (via "View Code in Dome"), the code fragments expand to fill the dome as a 3D code visualization (matrix-style cascading text or AST tree).

**Estimated Effort:** 5 hours (premium visual pass: 3h, dome integration: 2h)

---

## 9. ASSISTANT PANEL (Global Overlay)

**Role:** AI personas (PHOS/BASH) — tool calling, voice, engines  
**Current:** Well-implemented (personas, tool calling, voice toggle)  
**Target:** Ethical AI features (autonomy sliders, family hubs, review capability)

### 9.1 Ethical AI Enhancements

**Research Findings:**

1. **Autonomy sliders:** Let users control how much agency the assistant has
2. **Family hubs:** Shared space for family rules
3. **Review capability:** History of assistant interactions
4. **Personas as moral advisors:** BASH = evaluative/guiding, PHOS = supportive/empathetic

**Proposal:**

#### 9.1.1 Autonomy Slider

Add slider to AssistantPanel settings:

```
┌────────────────────────────────────────────────────┐
│ Assistant Autonomy                                 │
│ ┌────────────────────────────────────────────────┐ │
│ │ Manual        Confirm        Auto               │ │
│ │ ●─────────────────────────────────────○        │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ Current: Confirm before acting                     │
│                                                    │
│ Manual: You control every action                   │
│ Confirm: Assistant suggests, you approve           │
│ Auto: Assistant acts independently                 │
└────────────────────────────────────────────────────┘
```

**Implementation:** Store in `shellStore.assistantAutonomy` (`manual` | `confirm` | `auto`). Tool calls check this setting before executing.

#### 9.1.2 Family Hub

Add "Family Rules" section to AssistantPanel:

```
┌────────────────────────────────────────────────────┐
│ Family Rules for AI Assistant                      │
│                                                    │
│ ☑ Never share DID externally                      │
│ ☑ Require confirmation for LOVE transactions > 10 │
│ ☐ Auto-suggest rituals at 9am daily               │
│ ☐ Limit assistant usage after 10pm                │
│                                                    │
│ [Add Rule] [Save]                                  │
└────────────────────────────────────────────────────┘
```

**Implementation:** Store rules in `shellStore.assistantRules` (array of rule objects). Assistant checks rules before suggesting actions.

#### 9.1.3 Review Capability

Add "Assistant History" tab to AssistantPanel:

```
┌────────────────────────────────────────────────────┐
│ Assistant History (last 24h)                       │
│                                                    │
│ 2h ago: Suggested morning ritual (approved)        │
│ 4h ago: Checked LOVE balance (auto)                │
│ 6h ago: Helped with ritual quest (manual)          │
│                                                    │
│ [View Full History] [Clear History]                │
└────────────────────────────────────────────────────┘
```

**Implementation:** Store interactions in `shellStore.assistantHistory` (array of interaction objects with timestamp, action, result).

### 9.2 Personas as Intervention Styles

**Research Finding:** "Chatbots positioned as moral advisors that evaluate communicative appropriateness and exercise varying degrees of moral authority."

**Proposal:** Refine BASH and PHOS personas to embody different intervention styles:

| Persona | Intervention Style | Example Interaction |
|---------|-------------------|---------------------|
| **PHOS** | Supportive/Empathetic | "You seem low on spoons. Would you like me to suggest a gentle ritual to help you recharge?" |
| **BASH** | Evaluative/Guiding | "Spoons are at 1. You have 3 pending tasks. I recommend canceling 2 and resting before attempting the third." |

**Implementation:** Adjust system prompts:
- PHOS: "You are a supportive, empathetic assistant. Offer emotional support and gentle suggestions."
- BASH: "You are an evaluative, guiding assistant. Provide clear recommendations and actionable plans."

**Estimated Effort:** 4 hours (autonomy slider: 1h, family rules: 2h, history: 1h)

---

## 10. NOTIFICATION HUB (Global Overlay)

**Role:** Alert taxonomy, routing, focus-mode filtering  
**Current:** Well-implemented (notification list, priority badges, filters)  
**Target:** Alert taxonomy + focus-mode integration

**Enhancements:**

1. **Alert Taxonomy:** Categorize notifications (health, social, system, urgent)
2. **Focus-Mode Filtering:** When spoons ≤ 1, suppress non-urgent notifications
3. **Routing:** Route notifications to appropriate surfaces (health → Dashboard, social → Bonding, etc.)

**Estimated Effort:** 2 hours

---

## 11. PASSPORT PANEL → MERGE INTO PROFILE

**Decision:** Move PassportPanel into Profile surface as a "Settings" section.

**Rationale:** PassportPanel contains theme, sensory, effects, accessibility settings. These are identity/preference settings — they belong in Profile (Captain's Quarters), not a standalone overlay.

**Implementation:**

1. Add "Settings" tab to ProfilePage (alongside "Identity," "Credentials," "Privacy")
2. Move PassportPanel content into `<ProfileSettings>` component
3. Remove PassportPanel from global overlays
4. Update "PHOS" quick-launch card to navigate to ProfilePage (Settings tab)

**Estimated Effort:** 2 hours

---

## 12. STUBBED PANELS — HONEST "COMING SOON" STATES

**Decision:** Keep Justice, Marketplace, SBT, MCP panels but mark them "Coming Soon."

**Implementation:**

```
┌────────────────────────────────────────────────────┐
│ Justice Portal                                     │
│                                                    │
│ [Illustration: Scales icon]                        │
│                                                    │
│ Coming Soon                                        │
│                                                    │
│ The Justice Portal will provide sovereign legal    │
│ coordination and dispute resolution. This feature  │
│ is under construction.                             │
│                                                    │
│ [Learn More] [Back to Home]                        │
└────────────────────────────────────────────────────┘
```

**Estimated Effort:** 1 hour (all 4 panels)

---

## 13. CONSOLIDATED NAVIGATION GRAPH

```
                    Cockpit (100% dome, interactive)
                         ↓ dock ↑ undock
                    Home (Bridge, 25% dome)
                    ↓           ↓
              Dashboard   →   Bonding
              (25% health)    (25% tetra)
                    ↓           ↓
              Profile    →   Research
              (25% core)     (25% holograms)
                    ↓
              Sandbox
              (25% code)

Global Overlays (accessible from all surfaces):
- AssistantPanel (right sidebar)
- CommandPalette (center overlay)
- NotificationHub (right sidebar)
- MeshStatusPanel (right sidebar)
- IdentityPanel (right sidebar)
- AkinatorPanel (right sidebar)
- MemberDashboard (right sidebar)
- InsightsPanel (right sidebar)
- JusticePanel (coming soon)
- MarketplacePanel (coming soon)
- SBTPanel (coming soon)
- MCPPanel (right sidebar)
```

**Navigation Rules:**

1. **Topbar "Ⓟ31" brand icon:** Always returns to Home (or Cockpit if user prefers)
2. **HeaderDrawer nav buttons:** Navigate to surfaces (Home, Dashboard, Bonding, Profile, Research, Sandbox, Cockpit)
3. **Surface quick-links:** Navigate between related surfaces (Dashboard → Bonding, Profile → Dashboard, etc.)
4. **Dome port clicks:** In Cockpit, click ports to dock into surfaces
5. **Esc key:** Undock from any surface back to Cockpit

---

## 14. IMPLEMENTATION PRIORITIES

### Phase 1: Core Surfaces (14 hours)

| Priority | Task | Effort | Owner |
|----------|------|--------|-------|
| High | Home: State Snapshot Bar | 2h | Home Guardian |
| High | Dashboard: Family Snapshot Card | 3h | Home Guardian |
| High | Cockpit: HUD Overlay + Port Labels | 2h | Spaceship Navigator |
| High | Profile: Trust Dashboard | 3h | Crypto Warden |
| High | Bonding: Age-Adaptive Rituals | 3h | Bonding Steward |
| High | Sandbox: Premium Visual Pass | 3h | Sandbox Artisan |

### Phase 2: Dome Integrations (10 hours)

| Priority | Task | Effort | Owner |
|----------|------|--------|-------|
| High | Home: Dome recedes to 25% (neutral blue) | 2h | Spaceship Navigator |
| High | Dashboard: Health-mapped dome | 2h | Spaceship Navigator |
| High | Bonding: Tetrahedron-mapped dome | 2h | Spaceship Navigator |
| Medium | Profile: Identity core dome | 2h | Spaceship Navigator |
| Medium | Research: Holographic projections | 2h | Research Curator |

### Phase 3: Ethical AI & UX Polish (8 hours)

| Priority | Task | Effort | Owner |
|----------|------|--------|-------|
| Medium | AssistantPanel: Autonomy slider | 1h | Sandbox Artisan |
| Medium | AssistantPanel: Family rules | 2h | Sandbox Artisan |
| Medium | AssistantPanel: History | 1h | Sandbox Artisan |
| Medium | PassportPanel → Profile Settings | 2h | Crypto Warden |
| Low | Stubbed Panels: Coming Soon states | 1h | All |
| Low | NotificationHub: Alert taxonomy | 1h | Home Guardian |

**Total Estimated Effort:** 32 hours

---

## 15. SUCCESS METRICS

**Home:**
- Users glance at State Snapshot and know system health in <3 seconds
- Context-aware adaptations reduce cognitive load (different views at different spoon levels)

**Dashboard:**
- Family Snapshot reduces need to scan all 6 cards (<5 seconds to understand health)
- Health-mapped dome provides ambient awareness of family state

**Bonding:**
- Age-adaptive rituals engage all family members (7yo to adult)
- Tetrahedron-mapped dome reinforces spatial metaphor of family as interconnected vertices

**Profile:**
- Trust Dashboard provides transparency (users understand verification status at a glance)
- Data Flow Visualization builds confidence (users see what data is local vs. shared)

**Cockpit:**
- Dome is the spatial anchor (users always know "where they are" via 25% skylight)
- HUD quick-links reduce clicks to common surfaces

**Research:**
- Holographic projections make papers feel immersive (not just flat text)
- Honest empty states build trust (no pretending when Zenodo is down)

**Sandbox:**
- Premium workspace feel makes coding sessions more focused
- Code-mapped dome reinforces "workshop bay" metaphor

**AssistantPanel:**
- Autonomy slider gives users control (manual/confirm/auto)
- Family rules build trust (shared governance of AI behavior)

---

## 16. OPEN QUESTIONS

1. Should Home have a "Recent Activity" timeline, or is State Snapshot sufficient?
2. Should Dashboard have "Quick Actions" (e.g., "Start a ritual," "Check in")?
3. Should Research visualizations always be holographic, or only on demand (via "View in Dome")?
4. Should the dome show different starfield colors for different surfaces, or always neutral blue?
5. Should PassportPanel settings be merged into Profile, or kept as a standalone overlay?

---

**Consolidated Specification Complete.**  
**Ready for Implementation.**  
**Next:** Begin Phase 1 (Core Surfaces, 14 hours).
