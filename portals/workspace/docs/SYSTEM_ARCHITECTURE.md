# SYSTEM_ARCHITECTURE.md — P31 Quantum Material Workspace

**Version:** 1.0.0 · **Date:** 2026-09-24 · **Status:** Production (live at workspace.p31ca.org)
**Source of truth:** `production/portals/workspace/` — React 19 + Vite 6 + Zustand 5 SPA.
**Design canon:** `@p31ca/design-core` 2.3.0 (vendored in `vendor/`). This portal is the reference consumer of the design core.

This file is the **architecture contract**. It states what is true. Agents must assume every fact here holds
until a change lands AND the file is updated (Runbook Phase 5 tag-out).

---

## §1 Overview

The P31 Quantum Material Workspace is a sovereign, local-first family productivity suite delivered as a
single-page React application. It provides **eleven progressive-disclosure surfaces** behind a shared
glassmorphic shell, with energy-adaptive interaction (Spoon Dial, levels 0–5), caregiver-gated elevated modes
(`spark` → `maker`), a real per-member sovereign identity layer (Ed25519 `did:key` + hybrid post-quantum
key material), pickle-codename people (never human names), and a deterministic Forge document pipeline.

Two layers are served from one bundle:

| Layer | Hash | Purpose |
|---|---|---|
| Landing (front door) | `#/` or no hash | Marketing / entry, `LandingPage` |
| Workspace app | `#/app`, `#/<surface>`, `#/setup` | The suite; deep-linkable per surface |

Deployment: Cloudflare Pages project **`p31-portal-workspace`**, domain **`workspace.p31ca.org`**, pushed by
`node scripts/deploy.mjs` (`pnpm deploy`). Vars: `FORGE_ORIGIN`,
`LOOM_ORIGIN`, `FORUM_ORIGIN` (see `wrangler.toml`).

Build: Vite 6 → `dist/`, target `es2022`, manual chunks `react-vendor` / `store-vendor` / `vendor`
(`vite.config.ts`). The deployer injects `p31-ui.umd.js` + a `process` shim into `dist/index.html`.

---

## §2 Component Tree (with citations)

Every node resolves to a real source file. Line numbers are the export locations.

```
App (src/App.tsx:70)                          — hash router + shell mount
├── Starfield            src/components/Starfield.tsx:51      [canvas particle bg]
├── NotificationStack    src/components/NotificationStack.tsx:26
├── DevMenu              src/features/dev/DevMenu.tsx:17       [⌘D]
├── Topbar               src/components/Topbar.tsx:7
│   ├── CrownLogo 31     (inline, .p31-crown-logo)
│   ├── SearchTrigger ⌘K (→ CommandPalette)
│   ├── ModeBadge        (spark|maker|workshop)
│   ├── SpoonDialWidget  (src/hooks/useSpoonDial.ts:6)
│   ├── UserProfileAvatar(→ #/profile)
│   └── Journey link     (→ https://p31ca.org/journey)
├── .app-body
│   ├── SidebarNav       src/components/SidebarNav.tsx:5       [gate-aware]
│   └── MainWorkspaceContent
│       └── <Surface />  (SURFACE_COMPONENTS map, App.tsx:34-46)
├── MobileBottomNav      src/components/MobileBottomNav.tsx:13 [≤768px]
├── ModeGateModal        src/components/ModeGateModal.tsx:14   [PIN → PQC token]
├── CommandPalette       src/components/CommandPalette.tsx:6   [⌘K]
└── CalmOverlay          src/components/CalmOverlay.tsx:8      [spoons 0]  ← NOT “Crisis”
```

`SurfaceId` type: `src/types/index.ts:6`. `Mode` / `SpoonLevel`: `src/types/index.ts:20,23`.

---

## §3 Routing Contract

Hash-based (no router library). Parse lives in `App.tsx` (`parseHash`, lines 48–58; hash listener 78–90).

| Hash | Result |
|---|---|
| `#/` , `#`, or none | Landing page (`LandingPage`) |
| `#/app` | Workspace, surface = `home` |
| `#/<surface>` | Workspace, surface = that surface (deep link) |
| `#/setup` | Caregiver setup + integration (`SettingsSurface`) |
| anything else | Landing page (unknown hashes are NOT surfaces) |

`APP_HASHES = { app, home, docs, forum, life, sheets, slides, calendar, mail, drive, profile, identity, setup }`
(`App.tsx:48`). Surface label/icon/route metadata: `src/lib/routes.ts:12` (`ROUTES`).

**Known gap GAP-01 (review finding):** `onHashChange` calls `setSurface` directly, bypassing
`useModeGate().navigate`. A deep link such as `#/sheets` opens the surface even in `spark` mode without the
gate. Fix recipe: Runbook §6 (Route hash transitions through `navigate`). Do not fix without updating this file.

---

## §4 State & Persistence Contract

State is Zustand. Persisted keys (exact — do not re-key):

| localStorage key | Shape | Owner | Notes |
|---|---|---|---|
| `p31:caregiver-pin` | `{ pin: string, set: boolean }` | `workspaceStore.ts:5,49` | Default `1234`. ⚠ plaintext at rest (GAP-02) |
| `p31:starfield-config` | `StarfieldConfig` | `workspaceStore.ts:6,23` | Default: count 140, seed 182332 |
| `p31:profile:v1` | `ProfileMap` (per-member overrides) | `workspaceStore.ts:7,59` | Only customized fields |
| `p31:active-member:v1` | `string` | `workspaceStore.ts:8,69` | Default `caregiver-one` |
| `p31-portal-theme` | design-core theme-store state | `@p31ca/design-core/theming/theme-store.ts:269` | Global world×age×sensory |
| `p31:identity:<memberId>` | `Identity` public record | `src/lib/identity.ts:16,130` | `did:key`, pickleName, accent |
| IndexedDB `p31-workspace-keys` | AES-GCM-256 device key (`p31:device-key`) | `identity.ts:55-88` | Non-extractable; wraps private keys |

In-memory only (never persisted): session PQC capability token (`capabilityToken.ts:36`) — 15-min TTL,
self-contained composite Ed25519 + ML-DSA-65, memory-only credential, verified fail-closed.

Store: `src/store/workspaceStore.ts:129`. Profile resolution: `src/lib/profile.ts:50`. Roster + pickle
codenames: `src/lib/pickleNames.ts:57,68` (slots `caregiver-one`, `caregiver-two`, `young-one`).

---

## §5 Surface Inventory

Route metadata + MCP handles (`src/lib/routes.ts`, `src/lib/mcpTools.ts`).

| Surface | Hash | MCP tool attr | Handler | Gate | ⌘ | File |
|---|---|---|---|---|---|---|
| Home / Launcher | `#/home` | `homeSurface` | `mcp_p31_home_launch` | — | ⌘1 | `features/home/HomeSurface.tsx:22` |
| Docs | `#/docs` | `docsSurface` | `mcp_p31_docs_edit` | — | ⌘2 | `features/docs/DocsSurface.tsx:24` |
| Forum | `#/forum` | `forumSurface` | `mcp_p31_forum_answer` | — | ⌘3 | `features/forum/ForumSurface.tsx:38` |
| Life | `#/life` | `lifeSurface` | `mcp_p31_life_log` | — | ⌘4 | `features/life/LifeSurface.tsx:33` |
| Sheets | `#/sheets` | `sheetCell` | `mcp_p31_sheets_eval` | maker | ⌘5 | `features/sheets/SheetsSurface.tsx:18` |
| Slides | `#/slides` | `slidesSurface` | `mcp_p31_slides_present` | maker | ⌘6 | `features/slides/SlidesSurface.tsx:16` |
| Calendar | `#/calendar` | `calendarSurface` | `mcp_p31_calendar_event` | — | ⌘7 | `features/calendar/CalendarSurface.tsx:23` |
| Mail | `#/mail` | `mailSurface` | `mcp_p31_mail_send` | — | — | `features/mail/MailSurface.tsx:21` |
| Drive | `#/drive` | `driveSurface` | `mcp_p31_drive_storage` | maker | — | `features/drive/DriveSurface.tsx:29` |
| Profile | `#/profile` | `profileSurface` | `mcp_p31_profile_view` | — | — | `features/profile/ProfileSurface.tsx:31` |
| Passports | `#/identity` | `identitySurface` | `mcp_p31_identity_view` | — | — | `features/identity/IdentitySurface.tsx:20` |

Sub-tools: `homeCalmFloor`, `driveForge`, `driveForgeStatus` (`DriveSurface.tsx:86,102`), `setupSurface`
(`HomeSurface.tsx:130`).

**Shortcut truth (review finding):** `useKeyboardShortcuts.ts:31-35` maps ⌘1–⌘7 to `ROUTES[0..6]` →
home, docs, forum, life, sheets, slides, **calendar**. ⌘7 is Calendar, not Drive (a delta from the original
prototype handoff, which claimed ⌘7 = Drive). The palette (`CommandPalette.tsx:58`) renders per-filter-index
kbd hints.

---

## §6 Dependencies & Vendored Packages

| Package | Version | Source | Role |
|---|---|---|---|
| `@p31ca/design-core` | 2.3.0 | `vendor/p31-design-core-2.3.0.tgz` | Tokens, Chameleon theming, compositions, MCP server |
| `@p31ca/ui` | 1.3.1 | `vendor/p31-ui-1.3.1.tgz` | Shared UI (UMD injected at deploy) |
| `@p31ca/sovereign-primitives` | 0.0.1 | `vendor/p31-sovereign-primitives-0.0.1.tgz` | Composite Ed25519+ML-DSA-65, capability tokens |
| `@p31ca/sovereign-core` | 0.1.0 | `vendor/p31-sovereign-core-0.1.0.tgz` | Sovereign core (profile prefix `shell:` consumer config) |
| react / react-dom | 19.2.4 | npm | UI runtime |
| zustand | 5.0.14 | npm | State |

Package manifest: `package.json`. Vite chunks: `vite.config.ts:14-21`. Vendor integrity gate: `v:gate`
(⚠ currently fails in this portal — BUILD_SPEC GAP-07; vendor checks use `pnpm sync:vendor` + SHA512).

---

## §7 Deltas from the Original Prototype

The prototype in the React-port handoff was a single-file HTML reference. Production diverges deliberately:

| Aspect | Prototype | Production (this portal) |
|---|---|---|
| Color system | Raw hex (`#0A0A0F` …) | OKLCH + `color-mix` only (`src/tokens.css`, enforced by `token-audit.mjs`) |
| Surfaces | 7 (Home, Docs, Sheets, Slides, Calendar, Mail, Drive) | 11 + landing + setup |
| Mode gate PIN | Any 4-digit code | Verified against stored caregiver PIN; on success mints a PQC capability token |
| Crisis UI | `CrisisOverlay` ("crisis") | `CalmOverlay` ("calm") — calm is a mode, not a modal |
| Routing | none (JS `switchSurface`) | Hash routing with deep links |
| Identity | none | Pickle codenames, Ed25519 `did:key`, PQC keys, SBT gallery |
| People | Hardcoded "Alex / Sam / Maya" | Pickle labels only; roster slots |
| Docs forge | none | Forge pipeline (`features/kernel/kernel.ts`) → `.docx` download |
| Keyboard | ⌘K only | ⌘K, ⌘1–7, ⌘D, Esc |
| Theme | single accent | design-core Chameleon (5 worlds × 3 ages + muted/warmLight) |

---

## §8 Relationship to the Design Canon

- **Canonical design source:** `@p31ca/design-core` (tokens, primitives, compositions, theme-store). Never
  edit vendored tarballs — edit the source package, `pnpm sync:vendor`.
- **This portal is the reference consumer.** Any design-core token/component change must be validated here.
- Design portal (canon): `production/portals/design/` (see its `RUNBOOK.md`). This workspace runbook is the
  operational counterpart for the reference consumer.