# 05 — Routing

Hash-based, dependency-free. No react-router — chosen for the single-page family
shell and to avoid Pages rewrite config.

## Route table (`src/lib/routes.ts`)

| Path | Page | minMode |
|---|---|---|
| `#/street` | StreetPage | spark (default) |
| `#/talk` | TalkPage | spark |
| `#/you` | YouPage | spark |
| `#/craft` | CraftPage | maker |
| `#/workshop` | WorkshopPage hub | workshop |
| `#/workshop/studio` | Studio (sandboxed artifact studio + offline composer) | workshop |
| `#/workshop/tokens` | TokenExplorer | workshop |
| `#/workshop/recipes` | RecipeBrowser | workshop |
| `#/workshop/components` | ComponentCatalog | workshop |
| `#/workshop/playground` | Playground (Intent/Opus gates) | workshop |
| `#/workshop/brands` | Brands | workshop |
| `#/workshop/contrast` | ApcaChecker | workshop |
| `#/switch` | SwitchPage | spark |

Workshop sub-routes normalize to the parent: `hashToPath('#/workshop/tokens') →
'/workshop'`, so `useHashRoute` reports route `workshop` and `ModeGuard` wraps every
tab — there is no ungated path into a builder surface.

## Flow

- `useHashRoute` subscribes to `hashchange`; empty/invalid hash normalizes to
  `#/street` via `history.replaceState` (no history spam).
- `navigateTo(path)` updates state + `location.hash`; `App.tsx` maps path→page.
- `ModeGuard` wraps `/craft` and `/workshop` regardless of path (see `04-MODES.md`).
- Prebuild `scripts/emit-route-list.mjs` derives `public/routes.json` from
  `src/lib/routes.ts` (single source of truth, no hardcoded mirror). Keep it green —
  `pnpm build` runs it.

## Convention

Routes declare **capability requirements**, never modes. Adding a page = one entry
in `routes.ts` + one `minMode`; the guard and nav handle the rest.