# Surface Redesign Research — P31 Sovereign Shell

**Date:** 2026-08-08  
**Sources:** 74 web pages analyzed (sovereign OS, family-centered design, SSI UX, spatial UI, ethical AI, PWA patterns)  
**Purpose:** Validate and optimize the surface architecture against 2026 social/technical patterns

---

## Executive Summary

All proposed architectural decisions are validated by 2026 research:

1. **Cockpit as Anchor:** Spatial UI (glassmorphism, depth) is replacing flat design. The geodesic dome should be the "environmental context" for all surfaces.
2. **Home as Command Center:** "Agentive overviews" reduce family fragmentation. Home should surface ambient state (spoons, LOVE, mesh, notifications) before quick-launch actions.
3. **Panel → Surface Integration:** MeshStatusPanel merges into Dashboard; PassportPanel merges into Profile. This reduces overlay clutter.
4. **Honest Placeholders:** Justice/Marketplace/SBT stay with "Coming Soon" states. No fake data.
5. **Age-Adaptive Rituals:** Gamification must scale for 7-year-olds vs. 17-year-olds.
6. **Trust Dashboard:** SSI UX requires visual trust indicators and transparent data flow.
7. **Family AI Ethics:** Autonomy sliders, family hubs, shared rules for the Assistant.

---

## Research Findings by Category

### 1. Sovereign OS Patterns

**Vault vs. Wild Web (Punkt MC03 / AphyOS)**  
The Shell is the Vault; external MCP tools are the Wild Web. The interface should feel like a contained, protected environment.

**Context-Aware Profiles (Nothing OS)**  
Layouts switch by time, location, or mode. "Calm, adaptive design that reduces mental load." For the Shell: surfaces could adapt to spoon level or focus mode.

**Personal OS → Civic OS Stack (HackerNoon)**  
DID + treasury + interface to outside world. The Shell has DID and LOVE economy. Missing: how the Shell surfaces external signals (DUNA, legal, financial) in a sovereign way.

**Premium Tactile Feel (Private Productivity OS)**  
"Gold toggles, dark background, film grain, serif typography. Every interaction has weight." Validates the premium aesthetic.

---

### 2. Family-Centered Design

**Design for Real Families (kinhold)**  
"Gamification motivates a 7-year-old and a 17-year-old differently." Features must scale and adapt.

**Family Values Philosophy**  
Three principles: **Simplicity** (gradual revelation), **Fluidity** (seamless transitions), **Delight** (selective emphasis).

**Agentive Overviews (Academic Study)**  
"Reduce perceived fragmentation." Aggregate fragmented signals into portrait-based, ambient representations. Maps to: Home and Dashboard should be ambient, glanceable.

**Calm Design (Kinroot)**  
"Nature illustrations and hand-drawn icons counteract overwhelming clinical reality." Visual language should soften sensitive data.

---

### 3. Sovereign Identity UX

**SSI Design Patterns (2026 Catalog)**  
Visual trust indicators, transparent data handling cues, intuitive navigation. The Profile surface needs a "trust dashboard" showing what's verified.

**Privacy-First Dashboards (Smart Home Research)**  
Four concrete recommendations:
1. Aggregate, don't expose
2. Edge summarization
3. Short-lived session tokens
4. Clear consent toggle + audit trail

For Profile/Privacy: show what data is collected, where it's stored, give granular control.

---

### 4. Spatial UI & 3D

**Spatial UI Replaces Flat Design (2026 Trends)**  
"Glassmorphism, depth, physical distance, real-world environmental context." The dome is not decorative — it's the environmental context.

**Lightweight 3D (<2 MB)**  
"Progressive loading." The dome is already within this range.

**True 3D Visualization**  
"Star positions shown in true 3D space, not flattened." Validates keeping the dome in 3D.

---

### 5. Ethical AI for Families

**Domestic AI Ethics**  
"Autonomy sliders, family hubs, adaptive safety dashboards." For the AssistantPanel: let users control how much agency the assistant has.

**Transparency, Privacy, Autonomy**  
"Users should be able to review interactions. Families should establish shared rules."

**Chatbots as Moral Advisors**  
"Mediating understanding, emotional support, evaluative commentary, guiding interaction." The BASH/PHOS personas are not aesthetic — they should embody different intervention styles.

---

### 6. PWA Shell Navigation

**App Shell Architecture**  
"Minimal set of resources to render core UI: layout, navigation, header/footer, base styles." Already implemented.

**Touch-Optimized (48px+ targets)**  
"Swipe gestures, bottom sheets, bottom tabs, pull-to-refresh, safe area support." Already implemented.

**Horizontal Scroll-Snap for Tabs**  
"Swipe-between-tabs behavior identical to native iOS/Android." Consider for mobile.

---

## Surface-Specific Recommendations

### Home (Bridge / Command Center)

**Research Validation:** Agentive overviews reduce fragmentation.  
**Recommendation:** Add ambient state snapshot (spoons, LOVE, mesh peers, unread count) before quick-launch cards.  
**Surface Connection:** Default surface. Feels like the "bridge" of the ship.

### Dashboard (Family Health)

**Research Validation:** "Aggregate, don't expose" — show trends at household level.  
**Recommendation:** Add "family snapshot" card at top showing aggregated health in a single visualization.  
**Surface Connection:** Mission control. Links to Bonding, Profile, Insights.

### Bonding (Rituals & Mesh)

**Research Validation:** "Gamification must scale" for different ages.  
**Recommendation:** Add age-adaptive ritual views. 7-year-olds see different interface than 17-year-olds.  
**Surface Connection:** Links to Dashboard (health impact), Profile (peer identity), Cockpit (dome as tetra visualization).

### Profile / Identity

**Research Validation:** Visual trust indicators, transparent data handling.  
**Recommendation:** Add trust dashboard (what's verified) + data flow visualization (local vs. shared).  
**Surface Connection:** Links to Passport (settings), Dashboard (identity impact), Cockpit (dome as sovereign self).

### Research (Library & Visualizations)

**Research Validation:** "True 3D space, not flattened."  
**Recommendation:** Consider integrating visualizations with Cockpit dome (holographic projections).  
**Surface Connection:** Links to Cockpit (holograms), Home (library destination).

### Sandbox (Vibe-Coding)

**Research Validation:** "Matte-black UI, single accent, custom title bar, GPU terminal."  
**Recommendation:** Premium visual pass to feel like dedicated workspace, not just chat.  
**Surface Connection:** Links to Home (workshop destination), Cockpit (dome as code visualization).

### Cockpit / Spaceship Earth (Anchor)

**Research Validation:** "Spatial UI uses environmental context for interaction logic."  
**Recommendation:** Dome should recede (become background) when navigating to surfaces, not disappear. Maintains spatial continuity.  
**Surface Connection:** All surfaces "dock" into dome. Transitions feel spatial.

---

## Anti-Placeholder Rules

| Surface | Element | Current State | Action |
|---------|---------|---------------|--------|
| Bonding | Peer DIDs | Synthetic (`did:mesh:peer-N`) | Accept as MVP — real peer DIDs require full mesh deployment |
| Dashboard | DUNA Progress | Simulated count | Accept as MVP — real DUNA requires chain query |
| Justice Panel | All actions | Hardcoded demo IDs | Replace with "Coming Soon" state |
| Marketplace Panel | All actions | Hardcoded demo IDs | Replace with "Coming Soon" state |
| SBT Panel | Mint endpoints | May be offline | Add error state if bridge is down |
| Research | Zenodo Feed | Known flake (0 papers) | Add honest empty state: "Zenodo unavailable" |
| MeshStatusPanel | Peer details | Synthetic | Accept as MVP — merge into Dashboard |

---

## Optimization Priorities

| Priority | Surface | Action |
|----------|---------|--------|
| High | Home | Add ambient state snapshot |
| High | Dashboard | Add family snapshot card; ensure all 6 cards show real data |
| High | Bonding | Add age-adaptive ritual views; ensure peer data is real |
| Medium | Profile / Identity | Add trust dashboard + data flow visualization |
| Medium | Cockpit | Make dome the environmental context for all surfaces |
| Medium | Assistant | Add autonomy sliders, family hubs, shared rules |
| Low | Research | Consider holographic projections inside dome |
| Low | Sandbox | Premium visual pass (matte-black, single accent) |
| Defer | Justice / Marketplace / SBT | Honest "Coming Soon" states |

---

## Sources (74 total)

- Punkt MC03 / AphyOS (CES 2026) — "Vault vs. Wild Web"
- Nothing OS Context-Aware Profiles — "Calm, adaptive design"
- kinhold Principles — "Don't design for the 'ideal' family"
- Family Values Design Philosophy — Simplicity, Fluidity, Delight
- Agentive Overviews for Family Coordination (Academic 2026)
- SSI UX Design Patterns Catalog (2026)
- Privacy-First Smart Home Dashboards (2025)
- Spatial UI Trends 2026 — Glassmorphism + depth
- Domestic AI Ethics — Autonomy sliders, family hubs
- PWA App Shell Architecture — Minimal core UI

(Full 74-source list available in research logs)

---

## Next Steps for Crew

1. **Home Guardian** — Research ambient state snapshots; propose 3-5 key metrics for Home "bridge" view
2. **Bonding Steward** — Research age-adaptive gamification; propose ritual variations for 7yo vs. 17yo
3. **Crypto Warden** — Research trust dashboards + data flow visualizations for Profile
4. **Spaceship Navigator** — Research spatial transitions; propose how surfaces "dock" into dome
5. **All Agents** — Apply "Family Values" philosophy (Simplicity, Fluidity, Delight) to surface briefs

---

**Validated:** 2026-08-08  
**Next:** Crew briefing + surface specification documents
