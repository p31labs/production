# QPJ Portal — Agent & Contributor Guide

The Quantum Pickle Jar ("qpj", sub-brand **Lantern**) is the unified family-first
gateway portal. It converges the old per-persona portals (children/teen/meatspace/
parent/chat/design) into one codebase with progressive-disclosure "modes".

## Golden rules

1. **Design-core is canonical.** Use `@p31/design-core` compositions (esp.
   `ChatShell`, `SpoonDial`, `Button`) for every surface — never reimplement chat
   or chrome. The shell styles against its tokens, it doesn't own them.
2. **Zero hardcoded colors.** No hex, no rgb. Everything via `var(--p31-*)` in
   OKLCH from `src/index.css`, which layers over `@p31/design-core/css/all.css`
   + `container.css` (see `src/main.tsx` import order — that ordering is what
   makes the warm Lantern look win).
3. **Progressive disclosure is a security posture, not a nav label.** A person's
   mode is their privacy boundary. `spark` must never reach a `workshop` surface
   without the caregiver PIN elevation (`setMode` + XState `modeGate`). Tests must
   assert the lock, not just the label.
4. **Per-person isolation is memory hygiene.** Switching passport tears down the
   mesh and clears session state (`talkMessages`), resets spoons, and picks the
   mode library default. Session state is never persisted across persons.
5. **Workspace shielding.** Each portal is its own pnpm workspace via a local
   `pnpm-workspace.yaml`. The bare `/home/p31/pnpm-workspace.yaml` makes the whole
   home tree a workspace — never run `pnpm install` from a portal without its own
   workspace file, or you get a silent no-op.

## Required gate (run before merging)

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint src/ (0 warnings exit-clean)
pnpm test        # vitest run — 201 tests across 24 files
pnpm build       # vite build; prebuild writes public/routes.json
pnpm v:gate      # asserts @p31/design-core @ 2.3.0 + @p31/ui @ 1.3.1 from vendor tarballs
```

`pnpm run build` also runs `prebuild` (`scripts/emit-route-list.mjs`) which writes
`public/routes.json` from `src/lib/routes.ts` — keep that script green.

## Key files

- `src/machines/modeGate.ts` — XState v5 gate machine (idle → checking → ok/prompt/redirecting)
- `src/store/useQpjStore.ts` — zustand persist store (see `docs/02-STATE.md`)
- `src/store/useAppStore.ts` — session toast shim (sandboxed artifact studio proxies through it)
- `src/lib/workers.ts` — env-configured worker endpoints (`VITE_SANDBOX_*`)
- `src/pages/workshop/Studio.tsx` — PIN-gated artifact studio at `#/workshop/studio`
- `src/features/sandbox/` — sandboxed studio sources + 4 test suites
- `src/voice/useVoice.ts` + `src/voice/voiceSupport.ts` — Web Speech layer (see `docs/03-VOICE.md`)
- `src/lib/passports.ts`, `src/lib/routes.ts` — identity + route tables
- `src/components/MeshK4.tsx` — K₄ tetrahedral trust mesh (pickle names, barely-there SVG)
- `src/components/PicklePlaceholder.tsx` — placeholder with `data-placeholder` audit hook
- `src/components/PostEntryChecklist.tsx` — 3-item post-entry checklist (store-driven auto-check)
- `src/components/NotificationStack.tsx` + `Starfield.tsx` — notice stack + canvas night sky (see `docs/11-NOTIFICATIONS.md`)
- `src/store/useNotifStore.ts` — ephemeral non-persisted notice store (mesh/mode/milestone wiring)
- `src/lib/starfield.ts` — seeded, deterministic star generation (pure)
- `src/lib/brand.ts` — single source of brand copy (see `docs/12-BRAND.md`; `brand-scrub.test.ts` guards it)
- `src/__tests__/token-audit.test.ts` — guard: every `var(--p31-*)` read across loaded design-core css + `src/**/*.css` resolves to a definition (see `docs/15-DIVERGENCES.md`)
- `src/components/CrisisOverlay.tsx` — spoons=0 rest-stop floor (see `docs/13-COMMANDS-AND-FLOOR.md`)
- `src/components/CommandPalette.tsx` — shell bridge over `@p31/design-core` CommandPalette (⌘K, mode-filtered; never a PIN bypass)
- `src/components/ThemeCharm.tsx` — shell bridge over `@p31/design-core` Chameleon + theme-store, with the QPJ pack row (Space ⭐ default / Lantern 🏮)
- `src/components/PinChangeCard.tsx` — workshop hub card to verify the current caregiver PIN and set a new one (factory default `1234`)
- `src/lib/love.ts` — dual-currency pure core: weights, 50/50 split, care-score decay (Paper XI protocol micro)
- `src/components/LOVELedgerCard.tsx` — LOVE ledger: two pools + care score + care-note spend (see `docs/14-LOVE-LEDGER.md`)
- `src/pages/you/onboarding-copy.ts` — onboarding narrative language layer (no family names)
- `src/pages/you/tetrahedron.css` — mesh + tetrahedron styles (barely-there discipline)
- `docs/09-MESH.md` — mesh visualization design doc
- `docs/10-ONBOARDING.md` — onboarding narrative design doc
- `docs/11-NOTIFICATIONS.md` — notification system + starfield design doc
- `docs/12-BRAND.md` — brand copy single-source + scrub guard
- `docs/13-COMMANDS-AND-FLOOR.md` — command palette + crisis floor design doc
- `docs/14-LOVE-LEDGER.md` — dual currency: LOVE ledger + care score (Paper XI micro)
- `docs/15-DIVERGENCES.md` — living register of every intentional design-core fork
- `docs/16-MASTER-PROMPT-SUBSTRATE.md` — Track A: per-passport Worker + DO + Sandbox substrate
- `docs/16-MASTER-PROMPT-TRIAD-UI.md` — Triad cognition: DeepSeek/Claude/Gemini UI polish collaboration
- `deploy-unified.mjs` registration lives in `/home/p31/production/portals/`

Detailed docs: `docs/01-ARCHITECTURE.md` … `docs/08-DEPLOYMENT.md`.