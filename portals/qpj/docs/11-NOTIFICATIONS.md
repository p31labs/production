# 11 — Notifications & Starfield

Status: shipped (chunk 1 of the outstanding-directive batch)
Ty/cr: calm, barely-there. Notifications are the only "flash" in the product,
and even they settle within ~4s.

## Notification system

The QPJ speaks through a single ephemeral notice surface. It is **not** a
notification-permission channel and it never persists — it is the jar talking
to the current passenger for this session only.

### Store — `src/store/useNotifStore.ts`

- `notify({ kind, title, body?, burst? })` — pushes a notice onto the stack.
  `kind: 'info' | 'success' | 'milestone' | 'error'`.
- `dismiss(id)` / `clearAll()`.
- Retains the last 8; the visible stack shows the latest 4.
- `burst` fires a starfield flare (see below). Headline moments carry it:
  SBT mints and mesh joins. Routine acknowledgements (mode unlocked) do not.

### Surface — `src/components/NotificationStack.tsx` (+ `notification.css`)

- Fixed, top-trailing stack, `z-index: 60` (above topbar), `pointer-events: none`
  on the container, `auto` on cards.
- Cards auto-dismiss after 4200ms; each has a labelled dismiss button.
- Container is `aria-live="polite"`; each card is `role="status"`.
- Kind accent on a 3px bar: success → `--p31-accent-green`,
  milestone → `--p31-lantern`, error → `--p31-accent-red`.

### Wiring

| Event | Source | Notice |
|---|---|---|
| Mesh join | `useQpjStore.initMesh` success | `success` + `burst` — "X joined the street" |
| Mode elevation | `ModeGuard.handlePin` PIN_OK | `success` — "{label} mode unlocked" |
| SBT mint | `useSBT.mintIfNew` | `milestone` + `burst` — milestone name + description |

The wrong-PIN path stays on the legacy `Toast` (transient error), which coexists
in `App.tsx` with `NotificationStack`.

### Tokens (light + dark, `src/index.css`)

```css
--p31-notif-bg:    …oklch-glass…
--p31-notif-border: …oklch…
--p31-notif-text:   …oklch…
--p31-notif-accent: var(--p31-lantern);
```

Zero hardcoded colors; kinds reuse the accent tokens.

## Starfield

> **Kept custom.** design-core ships a sovereign `Starfield` (spoons/voltage/
> safeMode); QPJ keeps its own because the notification-burst flare is
> QPJ-specific. Full rationale + pending taste test: `docs/15-DIVERGENCES.md`.

A canvas night-sky the passenger looks *through*, never at — fixed,
`pointer-events: none`, `z-index: 0`, with `.shell` raised to `z-index: 1`.
Stars draw in the `--p31-star` token at low alpha so the only motion that ever
stands out is a notification burst.

### Engine — `src/lib/starfield.ts` (pure) + `src/components/Starfield.tsx`

- `genStars(count, seed)` — deterministic (seeded PRNG `prng`); positions are
  normalized `[0,1]` so a resize regenerates the same night.
- Twinkle via a per-star sine phase; drift is intentionally near-zero (this is
  barely-there, not space).
- The canvas effect subscribes to `useNotifStore`; a `burst` notice picks ~6
  random stars and brightens them for ~1400ms.
- Reduced motion (`reduceMotion` store flag or OS `prefers-reduced-motion`):
  the RAF loop never runs — one static draw is rendered, and bursts settle via
  a 500ms poll that merely redraws while flaring. No motion, no loop.

### Visual tokens

- `--p31-star` (already existed) is read live via `getComputedStyle`, so theme
  and `[data-hue]` passport shifts re-tint the sky without re-rendering.

## Accessibility

- Notice text is announcer-visible, never buried in `aria-hidden`.
- Reduced-motion users get zero animation from either surface.
- The starfield is `aria-hidden` — decoration, like the lantern glow.

## Docs & registry

- Files: `useNotifStore.ts`, `NotificationStack.tsx` + `notification.css`,
  `Starfield.tsx` + `starfield.css`, `lib/starfield.ts`.
- Tests: `src/__tests__/notif-starfield.test.ts` (store semantics, deterministic
  star field, stack render + auto-dismiss + manual dismiss, canvas presence).