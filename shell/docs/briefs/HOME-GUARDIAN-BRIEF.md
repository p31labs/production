# Home Guardian — Surface Specification Brief

**Agent:** Home Guardian  
**Surfaces:** Home (Bridge / Command Center) + Dashboard (Family Health Mission Control)  
**Co-Agent:** SOULSAFE Architect (review + consolidation)  
**Deliverable:** Complete content/layout specification for Home and Dashboard surfaces  
**Deadline:** This session  
**Context:** Research validation complete (SURFACE-REDESIGN-RESEARCH.md). All architectural decisions backed by 2026 patterns.

---

## Your Mission

Define exactly what content and layout Home and Dashboard will have. No stubs. No placeholders. No filler. Real layouts that connect to the Spaceship Earth dome and other surfaces.

---

## Research Context (Applied to Your Surfaces)

### Home Surface

**Current State (Audit):**
- 63 lines total
- Hero section with P31 tetrahedron icon + title/subtitle
- 3 action buttons (assistant, command palette, sensory passport)
- 4 surface cards (Willow, BASH, PHOS, BONDING)
- Conditional "resting" hint when spoons = 0

**Research Finding:** "Agentive overviews reduce perceived fragmentation and provide a calmer understanding of family coordination" (Academic 2026). Home should be an **ambient surface** — always-on, glanceable, reducing the need to dig for information.

**Design Principle:** "Simplicity (gradual revelation), Fluidity (seamless transitions), Delight (selective emphasis)" — Family Values philosophy.

**Your Task:** Transform Home from a simple launcher into a **command center dashboard** that surfaces key metrics (spoons, LOVE, mesh status, recent notifications, active rituals) with quick actions. It should be the first thing users see and give them a snapshot of the system's health.

**Questions to Answer:**
1. What 3-5 key metrics should be visible on Home before the user takes any action?
2. Should Home adapt to spoon level (e.g., show different layouts at spoons=0 vs. spoons=5)?
3. Should Home adapt to time of day (morning: rituals ahead; evening: spoon forecast)?
4. What's the visual hierarchy? Metrics at top, actions below? Or side-by-side grid?
5. What does Home show when the user first opens the shell after being offline for 8 hours?

**Spaceship Earth Integration:**
- When Home is active, what does the dome show? Options: (a) full ambient starfield, (b) dome recedes to background with 50% opacity, (c) dome transforms into a "bridge viewport" showing external status.

### Dashboard Surface

**Current State (Audit):**
- 246 lines total
- Care Score gauge (0-100%)
- 6 cards: Spoons, Mesh Peers, LOVE Balance, DUNA Progress, Notifications, Insights
- Secondary section: Spoon tide (7d chart), Spoon budget (gauge), Zone sensing (BLE scanner)
- Modals: Morning assessment, Visitor mindset

**Research Finding:** "Aggregate, don't expose — show trends at household level rather than individual event streams" (Privacy-First Dashboard Research 2026). The Care Score is a perfect example of this.

**Design Principle:** "Calm, adaptive design that reduces mental load" (Context-Aware Profiles, Nothing OS).

**Your Task:** Define the full layout and card ordering for Dashboard. The current 6-card grid is good, but needs a **family snapshot** card at the top showing aggregated health (spoons, LOVE, mesh, rituals) in a single, calm visualization.

**Questions to Answer:**
1. Should Dashboard show a timeline of recent events (e.g., "LOVE +5 from ritual," "Spoons dropped 5→3 at 2pm")?
2. What's the priority order of the 6 cards? Should Spoons always be top-left, or should the most "urgent" card float to the top?
3. Should Dashboard have a "family mode" vs. "individual mode" toggle?
4. What does Dashboard show when all metrics are healthy (spoons=5, LOVE>100, mesh connected, no notifications)?
5. What does Dashboard show when everything is in crisis (spoons=0, LOVE=0, mesh offline, 20 unread)?

**Spaceship Earth Integration:**
- When Dashboard is active, what does the dome show? Options: (a) health-mapped dome (colors change based on care score), (b) dome shows mesh peers as nodes, (c) dome fades to background.

---

## Content Inventory Template

For each surface, list every piece of content in priority order:

### Home Surface

| Element | Data Source | Priority | Display Condition |
|---------|-------------|----------|-------------------|
| State snapshot | useAppStore (spoons, LOVE), useShellStore (mesh, unread) | 1 (always visible) | Always |
| Quick-launch cards | Static (Willow, BASH, PHOS, BONDING) | 2 | Always |
| Action buttons | Static (assistant, palette, passport) | 3 | Always |
| ... | ... | ... | ... |

### Dashboard Surface

| Element | Data Source | Priority | Display Condition |
|---------|-------------|----------|-------------------|
| Family snapshot card | Aggregated from all stores | 1 (always visible) | Always |
| Care Score gauge | Computed (spoons 40%, LOVE 30%, mesh 20%, rituals 10%) | 2 | Always |
| Spoons card | useAppStore | 3 | Always |
| ... | ... | ... | ... |

---

## Layout Specification Template

For each surface, define the visual hierarchy:

### Home Surface

**Desktop Layout (>768px):**
```
┌─────────────────────────────────────┐
│ State Snapshot (ambient metrics)     │ ← Always visible, 48px height
├─────────────────────────────────────┤
│ Hero Section                         │ ← P31 icon + title, 120px height
├─────────────────────────────────────┤
│ Quick-Launch Cards (2×2 grid)        │ ← 4 cards, 200px each
├─────────────────────────────────────┤
│ Action Buttons (centered)            │ ← 3 buttons, 40px each
└─────────────────────────────────────┘
```

**Mobile Layout (<768px):**
```
┌───────────────────┐
│ State Snapshot    │ ← Scrollable horizontal if needed
├───────────────────┤
│ Hero (compact)    │ ← Smaller icon, no subtitle
├───────────────────┤
│ Cards (1 column)  │ ← Stack vertically
├───────────────────┤
│ Actions (stack)   │ ← Stack vertically
└───────────────────┘
```

### Dashboard Surface

**Desktop Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Family Snapshot (full width)                        │ ← New card, 120px
├──────────────────┬──────────────────┬───────────────┤
│ Care Score       │ Spoons           │ Mesh Peers    │ ← 3-col grid
├──────────────────┼──────────────────┼───────────────┤
│ LOVE Balance     │ DUNA Progress    │ Notifications │ ← 3-col grid
├──────────────────┴──────────────────┴───────────────┤
│ Spoon Tide (7d chart, full width)                   │ ← Secondary
├──────────────────┬──────────────────────────────────┤
│ Spoon Budget     │ Zone Sensing                     │ ← 2-col grid
└──────────────────┴──────────────────────────────────┘
```

**Mobile Layout:**
```
(Same content, 1-column stack)
```

---

## Surface Connections Template

For each surface, define:

### Home Surface

**Outbound Links (What surfaces can be reached from Home?):**
- Bonding (via "BONDING" card)
- AssistantPanel (via "Willow" card or "Ask the assistant" button)
- CommandPalette (via "BASH" card or "Command palette" button)
- AkinatorPanel (via "PHOS" card)
- PassportPanel (via "Sensory passport" button)
- Dashboard (via... what? Should there be a "Dashboard" quick-link in the state snapshot?)

**Inbound Links (What surfaces link back to Home?):**
- All surfaces (via Topbar brand icon "Ⓟ31")
- HeaderDrawer (via "Home 🏠" nav button)

**Spatial Relationship to Other Surfaces:**
- Home is the "bridge" of the ship
- Dashboard is the "mission control" (deeper, more detailed)
- Bonding is a "deck" (lateral move)
- Cockpit is the "viewport" (spatial anchor)

### Dashboard Surface

**Outbound Links:**
- Bonding (via Mesh Peers card or rituals mention)
- Profile (via... what?)
- Insights (via Insights card)
- MeshStatusPanel (via Mesh Peers card click)
- MemberDashboard (via DUNA Progress card click)
- NotificationHub (via Notifications card click)

**Inbound Links:**
- HeaderDrawer (via "Dashboard 📊" nav button)
- Home (via... what? State snapshot link?)

**Spatial Relationship:**
- Dashboard is "mission control" — more detailed than Home
- Home is the "bridge" — glanceable overview
- Dashboard links laterally to Bonding, Profile, Research

---

## Spaceship Earth Integration Template

For each surface, define:

### Home Surface

**Dome State When Home Is Active:**
- Option A: Full ambient starfield (dome fades to 30% opacity, surface overlays)
- Option B: Dome recedes to top 20% of viewport (surface fills bottom 80%)
- Option C: Dome transforms into "bridge viewport" showing external status (mesh topology, peer count)

**Transition Animation:**
- From Home → Other Surface: Dome animates from background to [specify state]
- From Other Surface → Home: Dome animates from [state] to background

**Dock Metaphor:**
- Is Home a "deck" you dock into, or is it the "bridge" that's always part of the ship's hull?

### Dashboard Surface

**Dome State When Dashboard Is Active:**
- Option A: Health-mapped dome (colors shift based on care score — green=healthy, amber=warning, red=crisis)
- Option B: Dome shows mesh peers as glowing nodes on the geodesic vertices
- Option C: Dome fades to background (same as Home)

**Transition Animation:**
- From Dashboard → Other Surface: Dome animates from [state] to [state]

**Dock Metaphor:**
- Is Dashboard a "mission control deck" you dock into?

---

## Anti-Placeholder Rule

For every element that currently shows a stub, hardcoded ID, or synthetic value:

### Home Surface

| Element | Current State | Action |
|---------|---------------|--------|
| "Willow" card label | Aspirational name, not backed by distinct UI | (a) Keep as aspirational label pointing to AssistantPanel with PHOS persona, OR (b) Rename to "Assistant" |
| "BASH" card label | Aspirational name, not backed by distinct UI | (a) Keep as aspirational label pointing to CommandPalette, OR (b) Rename to "Command Palette" |
| "PHOS" card label | Aspirational name, not backed by distinct UI | (a) Keep as aspirational label pointing to AkinatorPanel, OR (b) Rename to "Passport" |

### Dashboard Surface

| Element | Current State | Action |
|---------|---------------|--------|
| DUNA member count | Simulated (not live chain query) | Accept as MVP — add note "Demo data" or "Estimated" if transparency is required |
| Care Score | Computed from real stores | ✅ Keep as-is |

---

## Your Deliverables

1. **Content Inventory** for Home and Dashboard (use templates above)
2. **Layout Specification** for Home and Dashboard (desktop + mobile mockups)
3. **Surface Connections Map** (what links to what, spatial relationships)
4. **Spaceship Earth Integration Spec** (dome state when surface is active, transition animations, dock metaphor)
5. **Anti-Placeholder Decisions** (keep/rename/cut for each stub)
6. **3-5 Key Metrics for Home "State Snapshot"** (your recommendation with rationale)
7. **"Family Snapshot" Card Design for Dashboard** (what aggregated metrics, how visualized)

---

## Format

Write your deliverables as structured markdown with clear headings. Be specific — use exact pixel heights, exact card orderings, exact data sources. No vague language like "could" or "might" — state what it **will be**.

---

## Handoff

Once complete, your brief will be reviewed by SOULSAFE Architect and consolidated with the other crew briefs (Bonding Steward, Crypto Warden, Spaceship Navigator, etc.) into a unified navigation graph.

Then the specs will be implemented in code.

---

**Begin your research and specification work. Report back with the full deliverable.**
