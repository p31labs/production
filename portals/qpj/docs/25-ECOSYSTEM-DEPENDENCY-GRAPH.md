# 25 — Ecosystem Dependency Graph

Full family portal system (9 portals), verified from source, 2026-09-14.

## Summary

The ecosystem has two architectural paradigms and five @p31 shared packages. Not all portals use all packages. Three portals (QPJ, chat, meatspace) have dormant or missing dependency usage relative to the family pattern.

## The five @p31 shared packages

| Package | Purpose | Canonical source |
|---|---|---|
| `@p31/design-core` | Tokens, compositions, recipes, MCP data, agentic pipeline, starfield, crisis overlay, theming | `P31-local-workspace/packages/design-core` (v2.3.0) |
| `@p31/sovereign-core` | Identity, profile, tetrahedron, SBT, mesh, love, crypto state | `P31-local-workspace/packages/sovereign-core` (v0.1.0) |
| `@p31/game-engine` | Jitterbug geometry, geodesic primitives, spoon-gated game runtime, Roblox adapter | `P31-local-workspace/packages/game-engine` (v0.2.0-alpha.0) |
| `@p31/gamification` | Sound, confetti, haptics, achievements, growth rings, voice feedback, economy store | `P31-local-workspace/packages/gamification` (v1.0.0) |
| `@p31/ui` | Starfield, adaptive/GreyRock/NeuroAdapter, webmcp, passport templates, chrome, layout templates | `P31-local-workspace/packages/ui` (v1.3.1) |

Additional @p31 packages used outside the portal SPAs: `@p31/shell-chrome`, `@p31/shared-identity` (p31ca only), `@p31/shared` (p31ca Tailwind preset).

## Dependency matrix — declared vs imported

| Package | QPJ | chat | design | children | teen | meatspace | parent | p31ca | phos |
|---|---|---|---|---|---|---|---|---|---|
| `@p31/design-core` | ✅ 2.3.0 | ✅ 2.3.0 | ✅ 2.3.0 | ✅ 2.2.0 | ✅ 2.2.0 | ❌ NOT USED | ✅ 2.2.0 | ❌ | ❌ |
| `@p31/sovereign-core` | ✅ 0.1.0 | ✅ 0.1.0 | ❌ | ❌ | ❌ | ✅ 0.1.0 | ❌ | ❌ | ❌ |
| `@p31/game-engine` | 🔴 dormant | ❌ | ❌ | ✅ | ✅ | 🔴 dormant | ✅ | ❌ | ❌ |
| `@p31/gamification` | 🔴 dormant | ❌ | ❌ | ✅ | ✅ | 🔴 dormant | ✅ | ❌ | ❌ |
| `@p31/ui` | 🔴 dormant | 🔴 dormant | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

✅ = declared and imported in source | 🔴 = declared but never imported (needs rejuvenation per family rule) | ❌ = not declared

## Per-portal detail

### QPJ (@p31/portals-qpj)

**Paradigm**: React SPA, hash routing, Vite, zustand, XState v5

| Package | Status | Subpaths imported | Files |
|---|---|---|---|
| @p31/design-core | ✅ used | /compositions, /theming/theme-store, /mcp/data, /agentic, /css/all.css, /css/container.css | ~25 |
| @p31/sovereign-core | ✅ used | root (getProfile, updateTetrahedronVertex, addSBTMilestone, computeTetrahedronHash, hasSBTMilestone, types) | ~6 |
| @p31/game-engine | 🔴 dormant | — | 0 |
| @p31/gamification | 🔴 dormant | — | 0 |
| @p31/ui | 🔴 dormant | — | 0 |

**External deps**: react, react-dom, zustand, xstate, @xstate/react, ethers, peerjs, sentry, @tanstack/react-virtual, dompurify
**Design tokens**: var(--p31-*) in OKLCH from src/index.css (layered over @p31/design-core/css/all.css + container.css)
**Vendor tarballs**: p31-design-core-2.3.0.tgz, p31-sovereign-core-0.1.0.tgz, p31-ui-1.3.1.tgz (all in vendor/)
**v:gate**: asserts @p31/design-core @ 2.3.0 + @p31/ui @ 1.3.1

**Dormant dependency detail**:
- game-engine: Family uses JitterbugGame (children/teen/parent). QPJ has spoons and energy but no game mechanics. Decision needed.
- gamification: Family uses sound/confetti/haptic/growth-rings. QPJ has Confetti + voice (partial). Decision needed.
- ui: Family uses passport/*, starfield, adaptive. QPJ has custom Starfield, MeshBridge, ModeGuard. Decision needed.

### chat (@p31-portals/chat)

**Paradigm**: React SPA, hash routing, Vite, zustand

| Package | Status | Subpaths imported | Files |
|---|---|---|---|
| @p31/design-core | ✅ used | /compositions, /mcp/data | ~10 |
| @p31/sovereign-core | ✅ used | root | ~3 |
| @p31/ui | 🔴 dormant | — | 0 |
| @p31/game-engine | ❌ not declared | — | — |
| @p31/gamification | ❌ not declared | — | — |

**External deps**: react, react-dom, zustand, @tanstack/react-virtual, dompurify
**Vendor tarballs**: p31-design-core-2.3.0.tgz, p31-ui-1.3.1.tgz (declared in package.json, vendored)
**No game-engine, no gamification**: Chat deliberately omits arcade features. This is a product decision, not drift.

### design (@p31-portals/design)

**Paradigm**: React SPA, react-router-dom v6, Vite, zustand, Tailwind v4

| Package | Status | Subpaths imported | Files |
|---|---|---|---|
| @p31/design-core | ✅ used | /compositions, /theming/theme-store, /mcp/data, /agentic, /css/chrome.css, /css/theme-*.css, /starfield/jitterbug, /crisis-overlay | ~25 |
| @p31/ui | ✅ used | /adaptive/GreyRock, /adaptive/NeuroAdapter | 2 |
| @p31/sovereign-core | ❌ not declared | — | — |
| @p31/game-engine | ❌ not declared | — | — |
| @p31/gamification | ❌ not declared | — | — |

**External deps**: react, react-dom, react-router-dom, zustand, yaml, @tailwindcss/vite, culori
**Design-core subpaths used**: theme-store, mcp/data, agentic, compositions, starfield/jitterbug, crisis-overlay, chrome.css, theme-CSS files. This portal is the design system's own showcase — it uses the widest design-core surface area of any portal.

### children (@p31-portals/children)

**Paradigm**: React SPA, hash routing, Vite, zustand, template-based

| Package | Status | Subpaths imported | Files |
|---|---|---|---|
| @p31/design-core | ✅ used | /compositions (Button, ChatShell, SpoonDial, etc.) | ~8 |
| @p31/sovereign-core | ✅ used | root | ~3 |
| @p31/game-engine | ✅ used | JitterbugGame.tsx (geometry, types) | 1 |
| @p31/gamification | ✅ used | /sound, /confetti, /haptic, /growth-rings | 2 |
| @p31/ui | ✅ used | root, /passport, /passport/backup, /passport/pqc, /passport/did-document, /passport/eudi, starfield, types | ~7 |

**Template**: extends ../template/package.json (which declares design-core@2.3.0, game-engine, gamification, sovereign-core, ui)
**Vendor divergence**: vendored design-core is 2.2.0 despite template declaring 2.3.0
**External deps**: react, react-dom, zustand, ethers, peerjs, sentry

### teen (@p31-portals/teen)

**Paradigm**: React SPA, hash routing, Vite, zustand, template-based

**Identical @p31 usage pattern to children** (template-sourced):
| Package | Status | Subpaths imported |
|---|---|---|
| @p31/design-core | ✅ used | compositions |
| @p31/sovereign-core | ✅ used | root |
| @p31/game-engine | ✅ used | JitterbugGame.tsx |
| @p31/gamification | ✅ used | sound, confetti, haptic, growth-rings |
| @p31/ui | ✅ used | root, passport/*, starfield, types |

**Vendor divergence**: design-core 2.2.0 (vs template 2.3.0)

### meatspace (@p31-portals/meatspace)

**Paradigm**: React SPA, hash routing, Vite, zustand, template-based

**⚠️ MOST MISALIGNED PORTAL IN THE FAMILY**

| Package | Status | Subpaths imported | Files |
|---|---|---|---|
| @p31/design-core | ❌ NOT USED | — | 0 |
| @p31/sovereign-core | ✅ used | root, configure, createSovereignStore, types | ~4 |
| @p31/game-engine | 🔴 dormant | — | 0 |
| @p31/gamification | 🔴 dormant | — | 0 |
| @p31/ui | ✅ used | root, /passport, /passport/backup, /passport/pqc, /passport/did-document, /passport/eudi, starfield, types | ~8 |

** declares but doesn't use**: @p31/design-core (v2.2.0 in package.json, zero imports), @p31/game-engine, @p31/gamification
**External deps**: react, react-dom, zustand, ethers, peerjs, sentry
**Template-based** (extends ../template/package.json) but diverges from template by not using design-core at all. This means meatspace's surfaces have NO design-core token layer — they rely on @p31/ui's internal styling or inline styles.

### parent (@p31-portals/parent)

**Paradigm**: React SPA, hash routing, Vite, zustand, template-based

**Identical @p31 usage pattern to children/teen**:
| Package | Status | Subpaths imported |
|---|---|---|
| @p31/design-core | ✅ used | compositions |
| @p31/sovereign-core | ✅ used | root |
| @p31/game-engine | ✅ used | JitterbugGame.tsx |
| @p31/gamification | ✅ used | sound, confetti, haptic, growth-rings |
| @p31/ui | ✅ used | root, passport/*, starfield, types |

**Vendor divergence**: design-core 2.2.0 (vs template 2.3.0)

### p31ca (apps/p31ca)

**Paradigm**: Astro 5, react-router-dom v7, Tailwind v3, static/SSR, Cloudflare Pages

| Package | Status | Subpaths imported | Files |
|---|---|---|---|
| @p31/design-core | ❌ | — | 0 |
| @p31/sovereign-core | ❌ | — | 0 |
| @p31/game-engine | ❌ | — | 0 |
| @p31/gamification | ❌ | — | 0 |
| @p31/ui | ✅ | /chrome, /webmcp | 2 |
| @p31/shell-chrome | ✅ | stores, components | ~6 |
| @p31/shared-identity | ✅ | ensureIdentity, registerIdentity, loadIdentity | 3 |
| @p31/shared | ✅ | theme/tailwind-preset | 1 (tailwind config) |

**Design token path**: p31ca does NOT use @p31/design-core CSS tokens. Instead, its Tailwind config extends `@p31/shared/theme/tailwind-preset`, which provides Tailwind-compatible design tokens. This is a separate design token pipeline from the SPA portals.
**Tailwind config**: uses @p31/shared/theme/tailwind-preset preset, extends with quantum.violet (#A78BFA) and hub-specific colors (hubRose, hubNav)
**No vendor tarballs**: uses workspace:* for @p31 packages (P31-local-workspace monorepo resolution)
**Purpose**: Dev portal (kilo.ai equivalent), marketing + documentation + product showcase

### phosphorus31.org/planetary-planet

**Paradigm**: Astro 5, react-router-dom v7, Tailwind v4, static/SSR, Cloudflare Pages

| Package | Status |
|---|---|
| All @p31 packages | ❌ NOT DECLARED, NOT USED |

**Design token path**: Pure Tailwind with hardcoded hex colors in tailwind.config.mjs:
- cloud: '#F0EEE9' (Warm Cloud)
- espresso: '#264653' (Espresso Teal)
- teal-600: '#2A9D8F' (Transformative Teal)
- coral-500: '#E76F51' (Soft Coral)
- butter: '#E9C46A' (Butter Yellow)
- lavender: '#C9B1FF' (Soft Lavender)
**No @p31 packages at all**: phosphorus31 is completely independent of the @p31 ecosystem. It is the institutional marketing site.
**Purpose**: Cleaner, warmer institutional version of the P31 brand identity

## Cross-portal alignment analysis

### Design-core version split

| Version | Portals |
|---|---|
| 2.3.0 | QPJ, chat, design |
| 2.2.0 | children, teen, parent, meatspace (declared but meatspace doesn't use it) |
| Template | 2.3.0 (template declares 2.3.0; children/teen/parent vendored 2.2.0) |

### @p31/ui adoption pattern

| Tier | Portals | Pattern |
|---|---|---|
| Heavy use (passport/*) | children, teen, meatspace, parent | Identical pattern: passport/backup, passport/pqc, passport/did-document, passport/eudi, starfield, types |
| Partial use | design, p31ca | design: adaptive/GreyRock, NeuroAdapter; p31ca: chrome, webmcp |
| Dormant | QPJ, chat | Declared, vendored, never imported |

### Game-engine / gamification family pattern

| Tier | Portals |
|---|---|
| Active use | children, teen, parent (JitterbugGame + sound/confetti/haptic/growth-rings) |
| Dormant | QPJ, meatspace (both template-based but neither imports game-engine or gamification) |
| Not declared | chat, design |

### Architectural paradigm split

| Paradigm | Portals | State management | Routing | Styling |
|---|---|---|---|---|
| React SPA | QPJ, chat, design, children, teen, meatspace, parent | zustand | hash (useHashRoute) | @p31/design-core CSS + var(--p31-*) |
| Astro static | p31ca, phosphorus31 | nano-stores / none | react-router | Tailwind (custom or @p31/shared preset) |

### Critical misalignment: meatspace

meatspace is the outlier. It:
1. Declares @p31/design-core but doesn't use it — zero design-core tokens or compositions
2. Declares @p31/game-engine and @p31/gamification but doesn't use them
3. Uses @p31/ui heavily (passport, starfield, types) — unlike QPJ which doesn't
4. Uses @p31/sovereign-core — like QPJ
5. Its surfaces have no design-core token layer, meaning no var(--p31-*) styling, no design-core compositions, no token governance

This means meatspace's surfaces are either styled by @p31/ui internally or by raw Tailwind/inline styles — neither of which is governed by the design-core token system.

## Shared packages outside portals

| Package | Used by | Purpose |
|---|---|---|
| @p31/shared | p31ca | Tailwind theme preset (design tokens for Tailwind) |
| @p31/shell-chrome | p31ca | Topbar, nav, theme stores for Astro shell |
| @p31/shared-identity | p31ca | DID identity, registration, profile |

These packages are the bridge between the Astro marketing sites and the P31 design system. p31ca uses all three; phosphorus31 uses none.
