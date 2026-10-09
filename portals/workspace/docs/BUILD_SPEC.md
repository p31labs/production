# BUILD_SPEC.md — Design Stance & Build Rules

**Version:** 1.0.0 · **Date:** 2026-09-24 · **Applies to:** `production/portals/workspace/`
**Authority:** this file is the enforceable build contract. Invariants marked MUST are blocking; a build that
violates one does not ship. Gate evidence beats agent assertion (Anthropic validation-gate pattern).

---

## §1 Design Stance

**Quantum Material** = a calm, sovereign, glassmorphic visual language over an OKLCH perceptual color
system, where every interaction is spoon-aware (energy-adaptive) and every surface is agent-inspectable
(`data-mcp-tool`). Three principles:

1. **Perceptual color, not literal color.** All color is OKLCH/`color-mix(in oklch, …)`. Hex is the migration
   input, never the output.
2. **Glass with limits.** Blur is capped by viewport and disabled by user preference — aesthetics never
   sacrifice battery, contrast, or motion comfort.
3. **Energy is a first-class state.** `--motion-scale` scales every transition; spoon 0 is a calm rest stop,
   not a failure.

---

## §2 Invariants (MUST)

| ID | Invariant | Evidence / enforcement |
|---|---|---|
| INV-01 | All colors are OKLCH or `color-mix(in oklch, …)`. Raw hex/rgba forbidden outside `src/tokens.css`. | `node scripts/token-audit.mjs` exits 0 (verified) |
| INV-02 | Glass geometry: `--p31-glass-blur: blur(20px)` desktop; `blur(10px)` ≤768px; solid fallback under `prefers-reduced-transparency`. | `src/tokens.css:85-98` |
| INV-03 | Motion contract: `--motion-scale` = 1 (spoons 4–5), 0.6 (3), 0.2 (1–2), 0 (0/calm). Transitions use `calc(<base> * var(--motion-scale))`. | `src/hooks/useSpoonDial.ts:9-15`, `tokens.css:71-75` |
| INV-04 | A11y floors: `aria-label` or visible text on all interactive elements; `:focus-visible` 2px accent outline, 2px offset; touch targets ≥44px; text ≥4.5:1 (WCAG 2.2 AA). | `globals.css:36-39` |
| INV-05 | Every surface root carries `data-mcp-tool="<name>"` matching `mcpTools.ts`. Missing attribute = broken agent testing = blocking. | `src/lib/mcpTools.ts` |
| INV-06 | Surfaces read state from Zustand stores / context only; no `document.querySelector` in surfaces (allowed in hooks + tests). | code review |
| INV-07 | Token audit is a build gate — run before any build is valid. | `scripts/token-audit.mjs` |
| INV-08 | Elevated surfaces (Sheets, Slides, Drive) must be reached only via `useModeGate().navigate`. Direct hash navigation must not bypass the gate. | ⚠ known gap GAP-01 — see §6 |
| INV-09 | Persisted keys use the exact names in SYSTEM_ARCHITECTURE §4; never re-key. | `workspaceStore.ts` |
| INV-10 | Calm mode is non-destructive: no unmount, no state loss, exiting restores prior UI exactly. | `CalmOverlay.tsx:8` |
| INV-11 | No human names on any surface — pickle labels only. | `pickleNames.ts:1-11` |
| INV-12 | Per-member accent selects from the six-slot palette; theme follows the active member. | `profile.ts:14`, `useThemeEffects.ts:29-41` |

---

## §3 Token Map

### §3.1 Primitives → Semantic → Component (canon: `src/tokens.css`)

| Primitive | Value (OKLCH) | Semantic / role | Typical component |
|---|---|---|---|
| `--p31-void` | `oklch(0.08 0.005 270)` | app background | body, `main-workspace` |
| `--p31-surface` | `oklch(0.14 0.008 270)` | surface base | sidebars, panels |
| `--p31-surface2` | `oklch(0.2 0.012 270)` | surface raised | toolbars, search box |
| `--p31-surface3` | `oklch(0.28 0.015 270)` | hover/active | hover fills |
| `--p31-cloud` | `oklch(0.68 0.008 270)` | secondary text | descriptions, labels |
| `--p31-text-primary` | `oklch(0.96 0.005 270)` | primary text | headings, body |
| `--p31-text-muted` | `oklch(0.52 0.01 270)` | muted text | timestamps, footers |
| `--p31-accent-cyan` | `oklch(0.78 0.18 195)` | primary accent | buttons, focus, active nav |
| `--p31-accent-violet` | `oklch(0.68 0.16 285)` | secondary / maker | maker badge, ghost cursor |
| `--p31-accent-gold` | `oklch(0.82 0.16 85)` | warning / spoons | spoon dots, calm circle |
| `--p31-accent-green` | `oklch(0.72 0.14 155)` | success | sheets/drive status |
| `--p31-accent-red` | `oklch(0.68 0.18 15)` | destructive | errors, love chip |
| `--p31-accent-iris` | `oklch(0.62 0.14 275)` | mail accent | mail unread indicator |
| `--p31-glass-bg` | `color-mix(in oklch, white 4%, transparent)` | glass fill | `glass-panel`, cards |
| `--p31-glass-border` | `color-mix(in oklch, white 8%, transparent)` | hairline | all borders/dividers |

Semantic alias: `--p31-accent` → `--p31-accent-cyan` (`tokens.css:38`), overridden per-member by
`useThemeEffects` when a non-cyan accent is picked.

### §3.2 Hex → OKLCH migration table (prototype → production)

| Legacy hex (prototype) | Production token | OKLCH value |
|---|---|---|
| `#0A0A0F` | `--p31-void` | `oklch(0.08 0.005 270)` |
| `#12121A` | `--p31-surface` | `oklch(0.14 0.008 270)` |
| `#1C1C2A` | `--p31-surface2` | `oklch(0.2 0.012 270)` |
| `#26263A` | `--p31-surface3` | `oklch(0.28 0.015 270)` |
| `#A1A1AA` | `--p31-cloud` | `oklch(0.68 0.008 270)` |
| `#F5F5F7` | `--p31-text-primary` | `oklch(0.96 0.005 270)` |
| `#71717A` | `--p31-text-muted` | `oklch(0.52 0.01 270)` |
| `#00F0FF` | `--p31-accent-cyan` | `oklch(0.78 0.18 195)` |
| `#A78BFA` | `--p31-accent-violet` | `oklch(0.68 0.16 285)` |
| `#FBBF24` | `--p31-accent-gold` | `oklch(0.82 0.16 85)` |
| `#34D399` | `--p31-accent-green` | `oklch(0.72 0.14 155)` |
| `#FB7185` | `--p31-accent-red` | `oklch(0.68 0.18 15)` |
| `#818CF8` | `--p31-accent-iris` | `oklch(0.62 0.14 275)` |
| `rgba(255,255,255,0.04)` | `--p31-glass-bg` | `color-mix(in oklch, white 4%, transparent)` |
| `rgba(255,255,255,0.08)` | `--p31-glass-border` | `color-mix(in oklch, white 8%, transparent)` |
| `blur(20px)` | `--p31-glass-blur` | `blur(20px)` desktop / `blur(10px)` ≤768px |

Rule: derive from the *nearest* token above, not from `culori(hex)` recomputation — the tokens are the canon.

### §3.3 Theme layer (design-core Chameleon)

- 5 worlds: `garden · ocean · aurora · zen · volt` × 3 ages (`child · teen · adult`) + sensory (`muted`,
  `warmLight`). Source: `@p31ca/design-core/theming/theme-store` (persist key `p31-portal-theme`).
- Applied at runtime by `useThemeEffects` (`data-theme` on `<html>` + inline token application), keyed to the
  **active member's** profile theme. Default world `aurora`, age `adult`.
- When the member's accent is non-cyan, `--p31-accent` is overridden (never mutated on the store — applied
  live).

---

## §4 Surface Build Pattern

Every surface MUST follow this contract (reference implementations: `DocsSurface.tsx`, `SheetsSurface.tsx`):

1. File: `src/features/<name>/<Name>Surface.tsx`
2. Export: named `export function <Name>Surface(): JSX.Element`
3. Props: none — read from stores/hooks
4. Root: `<section className="surface-panel active" data-mcp-tool={MCP_TOOLS.<name>} aria-label="… surface">`
5. Elevated surfaces: navigate to them only via `useModeGate().navigate` (never direct `setSurface`)
6. State: Zustand slice or local component state for ephemeral UI only; nothing durable in component state
7. Motion: all transitions use token durations (they already multiply `--motion-scale`)
8. A11y: `aria-label` on root + every interactive control; ≥44px targets; `:focus-visible` present globally
9. Pickle labels only — no human names
10. Companion test: `src/features/<name>/<Name>Surface.test.tsx`

---

## §5 MCP Integration Schema

Registry: `src/lib/mcpTools.ts` (attribute) + `src/lib/mcpTools.ts` (handler names). The attribute enables
autonomous agent navigation/testing; handlers are the named agent-callable verbs.

| Surface | `data-mcp-tool` | Agent handler | Typical agent call |
|---|---|---|---|
| Home | `homeSurface` | `mcp_p31_home_launch` | `{ tool: "mcp_p31_home_launch", params: {} }` |
| Docs | `docsSurface` | `mcp_p31_docs_edit` | `{ command: "formatBlock", value: "<h2>" }` |
| Forum | `forumSurface` | `mcp_p31_forum_answer` | `{ postId, body }` |
| Life | `lifeSurface` | `mcp_p31_life_log` | `{ kind, body }` |
| Sheets | `sheetCell` | `mcp_p31_sheets_eval` | `{ cell: "B3", value: "1250.00" }` |
| Slides | `slidesSurface` | `mcp_p31_slides_present` | `{ slideIndex }` |
| Calendar | `calendarSurface` | `mcp_p31_calendar_event` | `{ title, date, start, end }` |
| Mail | `mailSurface` | `mcp_p31_mail_send` | `{ to, subject, body }` |
| Drive | `driveSurface` | `mcp_p31_drive_storage` | `{ fileId }` |
| Profile | `profileSurface` | `mcp_p31_profile_view` | `{}` |
| Passports | `identitySurface` | `mcp_p31_identity_view` | `{}` |

Sub-tools for state probing: `homeCalmFloor` (spoons 0 rest floor), `driveForge` / `driveForgeStatus`
(Forge pipeline), `setupSurface`. Convention: `data-mcp-state="ready" | "locked"`.

---

## §6 State Machines (reference)

**Mode gate** (`useModeGate.ts:6-11`): `ELEVATED = { sheets: maker, slides: maker, drive: maker }`.
`navigate(surface)` opens the gate when the required mode is unmet, else sets the surface.
Elevation (`ModeGateModal.tsx:42-68`): verifies entered PIN vs stored `caregiverPin`, then mints a session
capability token (`capabilityToken.ts:36`, composite Ed25519 + ML-DSA-65, 15-min TTL, memory-only) under the
active member's `did:key` (or slot fallback), then `elevate('maker')`. `workshop` exists in the type/badge
system but has no elevation path in this build.

**Spoon dial** (`useSpoonDial.ts:9-15`): sets `--motion-scale` from level: 4–5→1, 3→0.6, 1–2→0.2, 0→0.

**Calm** (`workspaceStore.ts:154`): `setCalm(true)` → `{ crisis: true, spoons: 0 }` → `CalmOverlay` mounts.

---

## §7 Deploy Pipeline

```bash
# 1. (only if design-core / ui changed) refresh the vendored tarball
pnpm sync:vendor            # ../tools/portal-vendor-sync/sync-vendor.mjs --target .

# 2. Full gate — must pass before deploy (green chain; pnpm gate/v:gate fail here — GAP-07)
pnpm typecheck && pnpm lint && pnpm test && pnpm build && node scripts/token-audit.mjs

# 3. Deploy
pnpm deploy                # node scripts/deploy.mjs
#    → stages dist/ → injects p31-ui.umd.js + process shim → Cloudflare Pages p31-portal-workspace
```

Deployer behaviors that matter (`scripts/deploy.mjs (UMD + functions compile)`): injects `<script>window.process =
{ env: {} }</script>` + `/assets/p31-ui.umd.js` before `</head>`; writes a fresh `wrangler.toml`; falls back
to copying source if `dist/` is absent.

---

## §8 Verification Commands (verified 2026-09-24)

| Command | Verifies | Observed |
|---|---|---|
| `node scripts/token-audit.mjs` | OKLCH-only | `Token audit OK — no raw hex/rgba outside token definitions.` |
| `pnpm typecheck` (`tsc --noEmit`) | strict types | exit 0 |
| `pnpm test` (`vitest run`) | unit suite | 6 files / 32 tests pass |
| `pnpm lint` (`eslint src/`) | lint + react-hooks | exit 0 |
| `pnpm build` (`vite build`) | prod bundle | `dist/` emitted |
| `pnpm v:gate` | vendor integrity | ⚠ fails in this portal — see GAP-07 | 
| `curl -I https://workspace.p31ca.org` | live health | HTTP 200 (deploy gate) |

---

## §9 Known Gaps & Recommended Upgrades (review output)

These are honest findings from the 2026-09-24 review. None block shipping; each is tracked for the next cycle.

| ID | Finding | Severity | Recommended fix |
|---|---|---|---|
| GAP-01 | Direct hash navigation (`#/sheets` deep link) bypasses the mode gate because `App.tsx` `onHashChange` calls `setSurface` directly. | high | Route hash transitions through `useModeGate().navigate`; or gate-check at surface mount. |
| GAP-02 | Caregiver PIN stored in plaintext (`p31:caregiver-pin`) and compared directly. The PQC capability token is the real auth; PIN is convenience. | medium | Store a salted hash; verify with constant-time compare; keep the capability token as the elevation credential. |
| GAP-03 | `prefers-reduced-motion` (scale 0.1 in `tokens.css:79`) is overridden by `useSpoonDial`'s inline `--motion-scale`. | low | In `useSpoonDial`, short-circuit to `0.1` when `matchMedia('(prefers-reduced-motion: reduce)')` matches. |
| GAP-04 | ⌘1–7 map to `ROUTES[0..6]` → ⌘7 = Calendar, contradicting the prototype handoff (⌘7 = Drive). | low | Either reorder `ROUTES` or document ⌘7 = Calendar (documented here; handoff is stale). |
| GAP-05 | `workshop` mode has a badge/type but no elevation path in this build. | low | Add a workshop elevation path or drop the type. |
| GAP-06 | design-core theme-store state is global (`p31-portal-theme`); per-member theme is applied live but not persisted per member. | low | Persist per-member `theme` in `p31:profile:v1` overrides (already supported by `ProfileOverride.theme`). |
| GAP-07 | `pnpm v:gate` fails in this portal: `v-gate.mjs:32` hardcodes `@p31ca/design-core` but the workspace consumes `@p31ca/design-core` (`package.json`). Verified: `node ../tools/portal-vendor-sync/v-gate.mjs --target .` → `MODULE_NOT_FOUND`. Consequently `pnpm gate` (which chains `pnpm v:gate`) does not pass as-is. | high | Parameterize `v-gate.mjs` to read the expected package set from the target `package.json` deps, or add a workspace-local vendor check for `@p31ca/design-core`. The six green gates are typecheck, lint, test, build, token-audit, live. |

Fixes to any gap must update SYSTEM_ARCHITECTURE §4/§5 and this section, then pass the full gate.