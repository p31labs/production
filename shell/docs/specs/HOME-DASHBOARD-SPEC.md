# Home + Dashboard Surface Specification

**Crew:** Home Guardian  
**Date:** 2026-08-08  
**Status:** Final  
**Research Validated:** Yes (SURFACE-REDESIGN-RESEARCH.md)

---

## Executive Summary

**Home** transforms from a simple launcher (63 lines) into a **command center dashboard** — the bridge of the sovereign shell. It surfaces ambient state (spoons, LOVE, mesh, notifications) before quick actions.

**Dashboard** evolves from a 6-card grid (246 lines) into **mission control** — a comprehensive family health overview with aggregated snapshot, care score, and secondary telemetry.

Both surfaces adapt to context (spoon level, time of day) and maintain spatial continuity with the Spaceship Earth dome.

---

## 1. HOME SURFACE SPECIFICATION

### 1.1 Content Inventory

| Element | Data Source | Priority | Display Condition | Height |
|---------|-------------|----------|-------------------|--------|
| **State Snapshot Bar** | `useAppStore`, `useShellStore` | 1 (always visible) | Always | 64px |
| Hero Section | Static | 2 | Always | 120px |
| Quick-Launch Cards | Static + panel triggers | 3 | Always | 200px each |
| Action Buttons | Static | 4 | Always | 48px each |

#### State Snapshot Bar Elements (Priority 1)

| Metric | Data Source | Format | Adaptive Logic |
|--------|-------------|--------|----------------|
| Spoons | `appStore.spoons` (0-5) | `🥄 ${spoons}` with color (red: 0-1, amber: 2-3, green: 4-5) | Show "Resting" hint if 0 |
| LOVE | `appStore.love` (number) | `💚 ${love}` | Pulse animation if recent +/- |
| Mesh | `shellStore.peerCount` | `🌐 ${count} peers` | Gray if 0, green if >0 |
| Unread | `shellStore.unreadCount` | `🔔 ${count}` | Hide if 0 |
| Time Context | System time | `🌅 Morning` / `🌆 Evening` | Changes at 6am/12pm/6pm |

**Rationale:** Research finding — "Agentive overviews reduce perceived fragmentation." The state snapshot gives users a 3-second glance at system health before they take any action.

#### Hero Section (Priority 2)

- P31 tetrahedron icon (96px, centered)
- Title: "Sovereign Shell" (text-2xl font-bold)
- Subtitle: "Your family's digital home" (text-muted-foreground)
- Height: 120px total

#### Quick-Launch Cards (Priority 3)

Current: 4 cards (Willow, BASH, PHOS, BONDING)  
**Decision:** Keep aspirational names but clarify intent

| Card | Label | Subtitle | Click Action | Icon |
|------|-------|----------|--------------|------|
| 1 | Willow | "AI Assistant" | Opens AssistantPanel with PHOS persona | 🌿 |
| 2 | BASH | "Command Palette" | Opens CommandPalette | ⚡ |
| 3 | PHOS | "Identity & Passport" | Opens PassportPanel | ✨ |
| 4 | BONDING | "Rituals & Mesh" | Navigates to Bonding surface | 🔗 |

**Anti-Placeholder Decision:** Keep "Willow/BASH/PHOS" as aspirational labels. They're not misleading — they point to real functionality (AssistantPanel, CommandPalette, PassportPanel). The subtitles clarify intent.

**Layout:** 2×2 grid on desktop, 1-column stack on mobile. Each card: 200×120px with hover lift effect.

#### Action Buttons (Priority 4)

- "Ask the assistant" (opens AssistantPanel)
- "Command palette" (opens CommandPalette)
- "Sensory passport" (opens PassportPanel)

**Decision:** Keep these as secondary actions. They duplicate the quick-launch cards but provide text-based alternatives for accessibility.

### 1.2 Layout Specification

#### Desktop Layout (>768px)

```
┌────────────────────────────────────────────────────┐
│ State Snapshot Bar (64px)                          │
│ 🥄3  💚142  🌐2 peers  🔔4  🌅Morning              │
├────────────────────────────────────────────────────┤
│                                                    │
│              [P31 Tetrahedron Icon]                │
│              Sovereign Shell                       │
│            Your family's digital home              │
│                    (120px)                         │
│                                                    │
├────────────────────────────────────────────────────┤
│                                                    │
│    ┌──────────┬──────────┐                        │
│    │ Willow   │ BASH     │   (200×120px each)     │
│    │ AI Asst  │ Command  │                        │
│    └──────────┴──────────┘                        │
│    ┌──────────┬──────────┐                        │
│    │ PHOS     │ BONDING  │                        │
│    │ Passport │ Rituals  │                        │
│    └──────────┴──────────┘                        │
│                                                    │
├────────────────────────────────────────────────────┤
│           [Ask the assistant]                      │
│           [Command palette]                        │
│           [Sensory passport]                       │
│                 (48px each)                        │
└────────────────────────────────────────────────────┘
```

**Total height:** 64 + 120 + 440 + 168 = 792px (fits in viewport)

#### Mobile Layout (<768px)

```
┌─────────────────────────┐
│ State Snapshot          │
│ (horizontal scroll)     │
│ 🥄3 💚142 🌐2 🔔4 🌅    │ 64px
├─────────────────────────┤
│   [P31 Icon]            │
│ Sovereign Shell         │
│ (compact, no subtitle)  │ 80px
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ Willow (AI Asst)    │ │ 100px
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ BASH (Command)      │ │ 100px
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ PHOS (Passport)     │ │ 100px
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ BONDING (Rituals)   │ │ 100px
│ └─────────────────────┘ │
├─────────────────────────┤
│ [Ask the assistant]     │ 48px
│ [Command palette]       │ 48px
│ [Sensory passport]      │ 48px
└─────────────────────────┘
```

**Adaptation:** Cards stack vertically, hero shrinks, state snapshot scrolls horizontally if needed.

### 1.3 Context-Aware Adaptations

**Spoon Level Adaptation:**

| Spoon Level | State Snapshot Color | Hero Subtitle | Quick-Launch Emphasis |
|-------------|---------------------|---------------|----------------------|
| 0 | Red | "Resting mode — take care" | Willow card glows (suggest assistant) |
| 1-2 | Amber | "Low energy — gentle actions" | All cards de-emphasized |
| 3-5 | Green | "Your family's digital home" | Normal emphasis |

**Time-of-Day Adaptation:**

| Time | Icon | State Snapshot Label | Hero Subtitle |
|------|------|---------------------|---------------|
| 6am-12pm | 🌅 | "Morning" | "Start your day with intention" |
| 12pm-6pm | ☀️ | "Afternoon" | "Your family's digital home" |
| 6pm-10pm | 🌆 | "Evening" | "Reflect and restore" |
| 10pm-6am | 🌙 | "Night" | "Rest well" |

**Rationale:** Research finding — "Context-aware home screen profiles reduce mental load" (Nothing OS). Home should adapt to the user's state, not remain static.

### 1.4 Surface Connections

**Outbound Links:**

| Destination | Trigger | Visual Transition |
|-------------|---------|-------------------|
| Bonding | "BONDING" card | Dome recedes, Bonding slides in from right |
| AssistantPanel | "Willow" card / "Ask the assistant" button | Panel slides in from right (overlay) |
| CommandPalette | "BASH" card / "Command palette" button | Palette fades in (overlay) |
| PassportPanel | "PHOS" card / "Sensory passport" button | Panel slides in from right (overlay) |
| Dashboard | (add link in State Snapshot?) | Dome recedes, Dashboard slides in from bottom |

**Inbound Links:**

- All surfaces (via Topbar brand icon "Ⓟ31" → navigates to Home)
- HeaderDrawer (via "Home 🏠" nav button)

**Spatial Relationship:**

- Home is the **bridge** of the ship — the default view, the place you return to
- Dashboard is **mission control** (deeper, more detailed)
- Bonding is a **crew deck** (lateral move)
- Cockpit is the **viewport** (spatial anchor)

**Recommendation:** Add a "Mission Control →" link in the State Snapshot bar that navigates to Dashboard. This makes Dashboard discoverable from Home.

### 1.5 Spaceship Earth Integration

**Dome State When Home Is Active:**

**Option B (Recommended):** Dome recedes to top 25% of viewport (becomes a "skylight" or "bridge viewport"), surface fills bottom 75%.

**Transition Animation:**

- **From Cockpit → Home:** Dome scales down from 100% → 25%, fades to 30% opacity, Home surface slides up from bottom (300ms, ease-out)
- **From Home → Other Surface:** Dome stays at 25% opacity, new surface slides in from appropriate direction (300ms)
- **From Home → Cockpit:** Dome scales up from 25% → 100%, fades to 100% opacity, Home slides down (300ms, ease-in)

**Dock Metaphor:**

Home is the **bridge deck** — it's always part of the ship's hull. You don't "dock" into Home; you **return** to it. The dome is always visible as a skylight when you're on the bridge.

**Visual Indicator:**

When Home is active, the dome shows ambient starfield with slow rotation. No interaction (clicking ports) available — the dome is decorative context, not interactive.

---

## 2. DASHBOARD SURFACE SPECIFICATION

### 2.1 Content Inventory

| Element | Data Source | Priority | Display Condition | Height |
|---------|-------------|----------|-------------------|--------|
| **Family Snapshot Card** (NEW) | Aggregated from all stores | 1 (always visible) | Always | 140px |
| Care Score Gauge | Computed (40% spoons, 30% LOVE, 20% mesh, 10% rituals) | 2 | Always | 180px |
| 6-Card Grid | Various stores | 3 | Always | 400px (2 rows) |
| Spoon Tide Chart | `appStore.spoonHistory` (7d) | 4 | Always | 200px |
| Secondary Grid (2 cards) | `appStore`, zone scanner | 5 | Always | 180px |

#### Family Snapshot Card (Priority 1 — NEW)

**Research Finding:** "Aggregate, don't expose — show trends at household level" (Privacy-First Dashboards). The Care Score is good, but it's just a gauge. The Family Snapshot aggregates **recent events** into a calm, glanceable narrative.

**Content:**

| Metric | Data Source | Visualization | Format |
|--------|-------------|---------------|--------|
| Current State | Computed | 4-quadrant mini-grid | Spoons (🥄3) / LOVE (💚142) / Mesh (🌐2) / Rituals (🔗1 active) |
| Recent Event | Last 8h of activity | Single-line summary | "LOVE +5 from breakfast ritual • Spoons refreshed 5h ago • 2 peers online" |
| Health Trend | 7-day comparison | Sparkline + arrow | "↗ Health improving (Care Score +8% this week)" |

**Layout (140px height):**

```
┌──────────────────────────────────────────────────┐
│ Family Snapshot                                  │
│ ┌────┬────┐  "LOVE +5 from breakfast ritual     │
│ │🥄3 │💚142│   Spoons refreshed 5h ago            │
│ ├────┼────┤   2 peers online"                   │
│ │🌐2 │🔗1 │                                      │
│ └────┴────┘  ↗ Health improving (+8% this week) │
└──────────────────────────────────────────────────┘
```

**Rationale:** This card answers "How is my family doing right now?" in 3 seconds. It reduces the need to scan all 6 cards below.

#### Care Score Gauge (Priority 2)

Current: 0-100% gauge computed from:
- Spoons: 40%
- LOVE: 30%
- Mesh: 20%
- Rituals: 10%

**Keep as-is.** This is already well-designed and matches the research (aggregated household metric).

**Enhancement:** Add tooltip on hover showing the breakdown:
```
Care Score: 78%
├─ Spoons: 32/40 (3/5 current)
├─ LOVE: 28/30 (142 balance)
├─ Mesh: 16/20 (2 peers online)
└─ Rituals: 2/10 (1 active today)
```

#### 6-Card Grid (Priority 3)

Current cards:
1. Spoons (current level, budget, next refresh)
2. Mesh Peers (count, status)
3. LOVE Balance (current, recent transactions)
4. DUNA Progress (member count, chain status)
5. Notifications (unread count, priority breakdown)
6. Insights (trends, predictions)

**Card Priority Order:**

**Decision:** Cards should float to the top based on urgency, not remain static.

| Priority | Card | Condition | Rationale |
|----------|------|-----------|-----------|
| 1 | Spoons | If spoons ≤ 2 | Critical health metric |
| 2 | Notifications | If unread > 5 | Requires attention |
| 3 | Care Score | Always | Primary health gauge |
| 4 | LOVE Balance | If recent transaction (last 1h) | Recent activity |
| 5 | Mesh Peers | If peer count changed (last 1h) | Recent activity |
| 6 | DUNA Progress | Always | Steady-state metric |
| 7 | Insights | Always | Background context |

**Layout:** 3-column grid on desktop, 1-column stack on mobile. Each card: 180px height.

**Anti-Placeholder Decisions:**

| Element | Current State | Decision |
|---------|---------------|----------|
| DUNA member count | Simulated (not live chain query) | Accept as MVP — add footnote "Demo data" in dev mode |
| Care Score | Computed from real stores | ✅ Keep as-is |
| All other cards | Real data from stores | ✅ Keep as-is |

#### Spoon Tide Chart (Priority 4)

Current: 7-day line chart showing spoon level over time.

**Keep as-is.** This is already a good implementation of "show trends, not just current state."

**Enhancement:** Add time-of-day markers (morning/afternoon/evening) to correlate spoon drops with activities.

#### Secondary Grid (Priority 5)

Current:
1. Spoon Budget (gauge showing consumption vs. capacity)
2. Zone Sensing (BLE scanner showing nearby devices)

**Keep as-is.** These are advanced telemetry — good for power users.

**Enhancement:** Add toggle to hide secondary section (reduce visual clutter for casual users).

### 2.2 Layout Specification

#### Desktop Layout (>768px)

```
┌───────────────────────────────────────────────────────────────┐
│ Family Snapshot (full width, 140px)                           │
│ ┌────┬────┐  Recent: LOVE +5, Spoons refreshed, 2 peers      │
│ │🥄3 │💚142│  ↗ Health improving (+8% this week)              │
│ │🌐2 │🔗1 │                                                   │
│ └────┴────┘                                                   │
├──────────────────┬──────────────────┬─────────────────────────┤
│ Care Score       │ Spoons           │ Mesh Peers              │
│ (180px)          │ (180px)          │ (180px)                 │
├──────────────────┼──────────────────┼─────────────────────────┤
│ LOVE Balance     │ DUNA Progress    │ Notifications           │
│ (180px)          │ (180px)          │ (180px)                 │
├──────────────────┴──────────────────┴─────────────────────────┤
│ Insights (full width, 180px)                                  │
├────────────────────────────────────────────────────────────────┤
│ Spoon Tide — 7-day chart (full width, 200px)                  │
├──────────────────┬─────────────────────────────────────────────┤
│ Spoon Budget     │ Zone Sensing                                │
│ (180px)          │ (180px)                                     │
└──────────────────┴─────────────────────────────────────────────┘
```

**Total height:** 140 + 360 + 180 + 200 + 180 = 1060px (scrollable on smaller viewports)

#### Mobile Layout (<768px)

Stack all cards vertically:
1. Family Snapshot (140px)
2. Care Score (180px)
3. Spoons (180px)
4. Mesh Peers (180px)
5. LOVE Balance (180px)
6. DUNA Progress (180px)
7. Notifications (180px)
8. Insights (180px)
9. Spoon Tide (200px)
10. Spoon Budget (180px)
11. Zone Sensing (180px)

**Total height:** ~2,000px (long scroll, but that's acceptable for mission control)

### 2.3 "Family Mode" vs "Individual Mode" Toggle

**Research Finding:** "Parent-child apps need different views — control/structure for parents, simple/focused for kids."

**Proposal:** Add toggle at top of Dashboard (next to title):

| Mode | View |
|------|------|
| Family (default) | Shows aggregated metrics (Care Score, household LOVE, total mesh peers) |
| Individual | Shows personal metrics (my spoons, my LOVE transactions, my rituals) |

**Implementation:** Store mode in `shellStore.dashboardMode` (family | individual). Filter data accordingly.

**Enhancement (deferred to Phase 2):** Individual mode could show different cards for different family members (7-year-old sees simplified rituals, 17-year-old sees full LOVE economy).

### 2.4 Surface Connections

**Outbound Links:**

| Destination | Trigger | Visual Transition |
|-------------|---------|-------------------|
| Bonding | Mesh Peers card / Rituals mention | Dome stays at 25%, Bonding slides in from right |
| Profile | (add link in Care Score tooltip?) | Dome stays at 25%, Profile slides in from left |
| Insights Panel | Insights card | Panel slides in from right (overlay) |
| MemberDashboard | DUNA Progress card | Panel slides in from right (overlay) |
| NotificationHub | Notifications card | Panel slides in from right (overlay) |
| MeshStatusPanel | Mesh Peers card | Panel slides in from right (overlay) |

**Inbound Links:**

- HeaderDrawer (via "Dashboard 📊" nav button)
- Home (via "Mission Control →" link in State Snapshot — recommended addition)

**Spatial Relationship:**

- Dashboard is **mission control** — more detailed than Home
- Home is the **bridge** — glanceable overview
- Dashboard links laterally to Bonding, Profile, Research

### 2.5 Spaceship Earth Integration

**Dome State When Dashboard Is Active:**

**Option A (Recommended):** Health-mapped dome — colors shift based on Care Score:
- 0-40%: Red gradient (crisis)
- 41-70%: Amber gradient (warning)
- 71-100%: Green gradient (healthy)

The dome recedes to top 25% of viewport, same as Home, but the starfield color shifts to reflect family health.

**Transition Animation:**

- **From Home → Dashboard:** Dome color shifts from neutral blue → health-mapped color (500ms gradient transition), Dashboard slides up from bottom (300ms)
- **From Dashboard → Other Surface:** Dome color fades back to neutral blue (300ms)
- **From Dashboard → Cockpit:** Dome scales up from 25% → 100%, color fades to neutral (300ms)

**Dock Metaphor:**

Dashboard is **mission control deck** — a deeper level than the bridge (Home). You dock into it from Home. The dome becomes a "status indicator" showing health via color.

---

## 3. SHARED SPECIFICATIONS

### 3.1 Family Values Design Philosophy

Both surfaces apply:

1. **Simplicity (Gradual Revelation):** Don't show all controls at once. Home shows state snapshot first, then quick-launch cards. Dashboard shows Family Snapshot first, then detailed cards.

2. **Fluidity (Seamless Transitions):** Surface-to-surface transitions feel like docking, not page reloads. The dome maintains spatial continuity (always visible at 25% opacity).

3. **Delight (Selective Emphasis):** Home and Dashboard are "louder" than other surfaces. They use color, animation, and visual hierarchy to draw attention to critical metrics.

### 3.2 Touch Optimization (Mobile)

- All interactive elements: **48px+ tap targets**
- State Snapshot bar: Horizontal scroll if needed (snap to each metric)
- Quick-launch cards: 100px height on mobile (down from 120px desktop)
- Dashboard cards: Full-width on mobile (no side-by-side grid)

### 3.3 Accessibility

- State Snapshot metrics: ARIA labels ("Spoon level: 3 out of 5")
- Quick-launch cards: ARIA labels ("Willow — AI Assistant")
- Dashboard cards: ARIA labels + keyboard navigation (tab through cards)
- Care Score gauge: ARIA label ("Care Score: 78 percent — Good health")

### 3.4 Loading States

**Home:**
- State Snapshot: Skeleton loaders for each metric (4 gray rectangles, 300ms fade-in when data loads)
- Hero: Static (no loading state)
- Quick-launch cards: Static (no loading state)

**Dashboard:**
- Family Snapshot: Skeleton loader (gray rectangle, 500ms fade-in)
- All cards: Skeleton loaders (gray rectangles, staggered fade-in — card 1 at 0ms, card 2 at 100ms, etc.)
- Charts: Gray placeholder with "Loading..." text

### 3.5 Error States

**Home:**
- If `appStore` fails to load: State Snapshot shows "Unable to load status" with retry button
- All other elements: Static (no error states)

**Dashboard:**
- If any card fails to load: Show error boundary with "Unable to load [Card Name]" + retry button
- If Zenodo feed fails (Insights card): Show "Zenodo unavailable" (honest empty state)

---

## 4. IMPLEMENTATION PRIORITIES

| Priority | Task | Estimated Effort |
|----------|------|------------------|
| High | Add State Snapshot Bar to Home | 2h |
| High | Add Family Snapshot Card to Dashboard | 3h |
| High | Context-aware Home adaptations (spoon/time) | 2h |
| High | Health-mapped dome for Dashboard | 2h |
| Medium | Card priority ordering in Dashboard | 2h |
| Medium | Family/Individual mode toggle | 3h |
| Medium | Dome transition animations | 2h |
| Low | Enhanced Care Score tooltip | 1h |
| Low | Spoon Tide time-of-day markers | 1h |

**Total Estimated Effort:** 18 hours

---

## 5. SUCCESS METRICS

**Home:**
- Users can glance at State Snapshot and know system health in <3 seconds
- Quick-launch cards reduce clicks to common actions (AssistantPanel, CommandPalette, Bonding)
- Context-aware adaptations reduce cognitive load (different views at different spoon levels)

**Dashboard:**
- Family Snapshot reduces need to scan all 6 cards (users get health overview in <5 seconds)
- Care Score tooltip provides transparency (users understand how score is computed)
- Card priority ordering surfaces urgent items first (spoons at 0 floats to top)

---

## 6. OPEN QUESTIONS

1. Should Home have a "Recent Activity" timeline (last 5 events)? Or is the State Snapshot sufficient?
2. Should Dashboard have a "Quick Actions" section (e.g., "Start a ritual," "Check in," "View insights")?
3. Should the dome show different visualizations for different surfaces, or should it always be a starfield?
4. Should the Family Snapshot card be collapsible (hide it once users are familiar with the system)?

---

**Specification Complete.**  
**Next:** Consolidate with other surface specs (Bonding, Profile, Cockpit, Sandbox, Research) into unified navigation graph.
