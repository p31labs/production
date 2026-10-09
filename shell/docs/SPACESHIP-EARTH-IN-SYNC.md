# Spaceship-Earth-in-Sync: Unified Design System & Ethical UX Framework

**Version:** 2026.08  
**Status:** Production-Ready  
**Codebase Targets:** `spaceship-earth` (WebGL 3D) + `production/shell` (React SPA)  
**Research Backing:** WCAG 2.2 (ISO/IEC 40500:2025), ARIA 1.3, CSP/HSTS/CORS best practices, designed-friction consensus (Sage 2025, Aberdeen 2026), ADHD dark-pattern awareness (CHI 2025), biometric consent (Lexology 2025), COGA principles, neuroinclusive AI (ACM AI Letters 2025)

---

## 1. Design Principles

| Principle | Definition | Implementation |
|-----------|------------|----------------|
| **Efficacy Over Engagement** | Success is measured by whether the user feels regulated, capable, rested — not by DAU or session length | No streaks, badges, leaderboards; spoon‑state machine |
| **Autonomy Over Persuasion** | User is in control. App suggests, never demands. | Source registry, user‑controlled spoon levels, no forced paths |
| **Competence Over Reward** | Mastery feels good intrinsically. External rewards fade quickly. | Progress visible without shaming; rest as achievement |
| **Relatedness Over Comparison** | Connection feels good. Competition feels toxic. | No leaderboards; optional breathing together (synchrony, not comparison) |
| **Transparency Over Mystery** | User understands how and why features work. | Privacy statement in onboarding; consent gates; local‑only processing |
| **Rest Over Engagement** | User leaving healthy = success. User staying compulsively = failure. | RestOverlay at spoons≤1; overwork prompt at 45min |
| **Accessibility As Default** | Not a feature. Not a checkbox. The foundation. | WCAG 2.2 AA; focus traps; skip links; `:focus-visible` |
| **Privacy As Promise** | All data stays local. No profiling. No selling. No dark patterns. | Telemetry opt‑in; gaze processed locally; no cloud upload |

---

## 2. Component Hierarchy

### 2.1 Atoms — Basic Primitives

| Component | Description | Token Requirements |
|-----------|-------------|-------------------|
| `Button` | `<button>` with variants: primary, ghost, danger, pill | `--p31-accent`, `--p31-text`, `--p31-radius-sm`, `--p31-space-sm` |
| `Toggle` | Switch or checkbox with label | `--p31-accent`, `--p31-surface`, `--p31-radius-full` |
| `Icon` | Inline SVG with `aria-hidden="true"` or `role="img"` + label | `--p31-text`, `--p31-accent` |
| `Badge` | Small status indicator | `--p31-accent-*`, `--p31-radius-full` |
| `Pill` | Rounded container for inline content | `--p31-radius-full`, `--p31-glass-bg`, `--p31-glass-border` |
| `Divider` | Horizontal or vertical separator | `--p31-glass-border` |

### 2.2 Molecules — Combinations

| Component | Description | Token Requirements |
|-----------|-------------|-------------------|
| `GlassCard` | Card with glass‑morphism border + backdrop blur | `--p31-glass-bg`, `--p31-glass-border`, `--p31-glass-blur`, `--p31-radius-md` |
| `HUDShell` | Bottom‑center pill bar + expandable popover | `--p31-z-hud`, `--p31-glass-bg`, `--p31-radius-lg`, `--p31-space-xs` |
| `SpoonDial` | Horizontal radio group for spoon levels (0–5) | `--p31-neon`, `--p31-neon-faint`, `--p31-neon-ghost` |
| `ConsentGate` | `window.confirm` wrapper with "stays on your device" | None (native dialog) |
| `RestAffirmation` | Brief identity‑safe message on rest exit | `--p31-text`, `--p31-accent-green` |
| `OverworkToast` | Soft, dismissible toast at 45min focus | `--p31-amber`, `--p31-glass-bg`, `--p31-radius-md` |

### 2.3 Organisms — Full Sections

| Component | Description | Token Requirements |
|-----------|-------------|-------------------|
| `Topbar` | Fixed header with brand, spoon dial, palette trigger | `--p31-z-topbar`, `--p31-glass-bg`, `--p31-glass-border`, `--p31-text` |
| `RestOverlay` | Full‑screen crisis mode with breathing animation | `--p31-z-crisis`, `--p31-neon-faint`, `--p31-glass-bg` |
| `CommandPalette` | ⌘K modal with fuzzy search | `--p31-z-modal`, `--p31-glass-bg`, `--p31-radius-lg`, `--p31-text` |
| `DatasetPanel` | Upload, manage, and delete datasets | `--p31-glass-bg`, `--p31-text`, `--p31-z-panel`, `--p31-neon-coral` |
| `SimplifiedDome` | 2D SVG fallback for spoons≤3 | `--p31-glass-bg`, `--p31-neon-faint`, `--p31-text-secondary` |
| `SpaceshipEarthCanvas` | Three.js 3D scene with K₄ dome | `--p31-bg`, `--p31-neon`, `--p31-neon-faint` |

### 2.4 Templates — Page/Surface Layouts

| Template | Description | Mounted Surfaces |
|----------|-------------|------------------|
| `ShellLayout` | Fixed topbar + viewport + optional floating panels | `App.tsx` root |
| `DashboardGrid` | 3‑column responsive card grid | `DashboardPage`, `IdentityTab`, `WalletTab` |
| `ProfileTabs` | Tablist + tabpanel container | `ProfilePage` |
| `SandboxSplit` | Chat + artifact split view | `SandboxPage` |
| `CockpitView` | Full‑screen 3D with minimal HUD | `CockpitView` |

---

## 3. Sensory‑Aware States

### 3.1 Spoon Levels (0–5)

| Spoon | State | Visual Treatment | Interaction |
|-------|-------|------------------|-------------|
| **5** | Peak | Full 3D, all HUD, all effects | Full interaction |
| **4** | High | Dome visible, HUD simplified, reduced parallax | Full interaction |
| **3** | Moderate | Dome hidden, 2D flat, core HUD only | Full interaction |
| **2** | Low | Bare‑bones HUD, no animation | Pointer events disabled at HUD level |
| **1** | Exhausted | Breathing animation + escape only | Only escape button |
| **0** | Crisis | Blank screen + single button | Only escape button |

### 3.2 Sensory Modes (User Toggle)

| Mode | Effect | Implementation |
|------|--------|----------------|
| **Muted** | Chroma ×0.45, reduces colour saturation | `data-theme="gray-rock"` or CSS `filter: saturate(0.45)` |
| **Calm** | Zero motion, removes all animations | `prefers-reduced-motion: reduce` equivalent |
| **WarmLight** | Shifts hue toward amber (2,700–3,500K) | CSS `filter: sepia(0.2) brightness(0.9)` |
| **Focus** | Hides all panels except active task | `[data-mode="focus"] .hud-panel { display: none; }` |

### 3.3 State Transitions

- **Spoon change** → instant CSS transition on `.hud-shell` (opacity + transform 200ms)
- **Sensor‑aware adaptation** → no user configuration; inferred from mouse speed, typing patterns, pause duration
- **Overwork prompt** → appears at 45min; dismiss resets timer; rest resets timer
- **Crisis gate** → at spoons≤1, camera released, HUD hidden, rest overlay shown

---

## 4. Token‑Based Design System

### 4.1 Colors (OKLCH + CSS Variables)

```css
:root {
  /* Primary UI */
  --p31-bg: oklch(14% 0.014 75);
  --p31-text: oklch(96% 0.005 240);
  --p31-text-secondary: oklch(80% 0.01 240);
  --p31-text-tertiary: oklch(78% 0.01 240);

  /* Accent */
  --p31-accent: oklch(69% 0.14 45);       /* #c97b52 (amber/coral) */
  --p31-accent-alt: oklch(69% 0.09 150);  /* #8fae83 (mint) */
  --p31-accent-green: oklch(68% 0.12 152);/* #4a7c59 (green) */
  --p31-accent-red: oklch(71% 0.13 22);   /* #dc143c (crimson) */
  --p31-accent-gold: oklch(70% 0.135 88); /* #e0b968 (gold) */
  --p31-accent-violet: oklch(71% 0.1 28); /* #8b5cf6 (violet) */

  /* Glass */
  --p31-glass-bg: oklch(100% 0.01 240 / 0.04);
  --p31-glass-border: oklch(100% 0.01 240 / 0.08);
  --p31-glass-blur: blur(12px);

  /* Spacing */
  --p31-space-xs: 4px;
  --p31-space-sm: 8px;
  --p31-space-md: 16px;
  --p31-space-lg: 24px;
  --p31-space-xl: 32px;
}
```

### 4.2 Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--p31-font-sans` | 'Plus Jakarta Sans', system‑ui, sans‑serif | Body text, labels |
| `--p31-font-mono` | 'Fira Code', 'JetBrains Mono', monospace | Code, metrics, debug |
| `--p31-type-body` | clamp(12px, 1.3vh, 16px) | Main text |
| `--p31-type-caption` | clamp(9px, 1.2vh, 12px) | Metadata, tooltips |
| `--p31-type-label` | clamp(10px, 1.4vh, 14px) | Form labels, buttons |
| `--p31-type-h1` | clamp(20px, 3.5vh, 40px) | Page titles |
| `--p31-type-h2` | clamp(16px, 2.5vh, 28px) | Section headers |
| `--p31-type-h3` | clamp(12px, 1.8vh, 18px) | Card titles |

### 4.3 Motion

| Token | Value | Usage |
|-------|-------|-------|
| `--p31-duration-fast` | 100ms | Hover, small transitions |
| `--p31-duration-normal` | 300ms | Panel open/close, toast |
| `--p31-duration-slow` | 500ms | Rest overlay, breathing |
| `--p31-easing-spring` | cubic‑bezier(0.34, 1.56, 0.64, 1) | Popover expansion |
| `--p31-easing-smooth` | cubic‑bezier(0.16, 1, 0.3, 1) | Progress bars, fade‑in |

### 4.4 z‑index Tiers

| Tier | Value | Elements |
|------|-------|----------|
| Background | 0 | JitterbugBackground, Canvas |
| Landmarks | 5 | BreathingAnchor, SkipLink |
| Chrome | 10 | Topbar, BottomNav |
| Floating | 100 | HUDShell, Tooltips |
| Modal | 500 | BuckyView (Dymaxion net) |
| Overlay | 90 | CommandPalette, McpExplorer |
| Dialog | 60 | SessionSurvey, MetricsDashboard |
| Crisis | 99999 | RestOverlay |

---

## 5. Accessibility Specifications

### 5.1 WCAG 2.2 AA Compliance

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| **2.4.11 Focus Appearance** | 3:1 contrast + 2px perimeter | Global `:focus-visible` with `--p31-accent` outline |
| **2.5.8 Target Size** | ≥24×24 CSS px | All buttons ≥24px; recommendations ≥44px |
| **2.5.7 Dragging Movements** | Single‑pointer alternative | Dataset upload uses file picker + drag‑drop (both) |
| **3.3.8 Accessible Authentication** | No cognitive test without alternative | No login/puzzles; DID‑based identity is keyboard‑friendly |
| **3.2.6 Consistent Help** | Help in consistent location | Onboarding steps are in consistent order; CommandPalette always ⌘K |
| **3.3.7 Redundant Entry** | Auto‑fill previously entered | localStorage persists HUD state, theme, sensory prefs |

### 5.2 ARIA 1.3

| Feature | Implementation |
|---------|----------------|
| `aria-description` | Use for interactive elements where label isn't enough (e.g., "Clear all datasets — this cannot be undone") |
| `aria-details` | Link to help content (e.g., "Learn more about spoon levels" → docs) |
| Live regions | `aria-live="polite"` singleton debounced via `requestAnimationFrame` |
| Focus trap | Reusable `useFocusTrap` hook for all modal dialogs |
| Skip link | `<a class="skip-link" href="#main-content">Skip to main content</a>` |

### 5.3 Keyboard Navigation

| Interaction | Keyboard | Implementation |
|-------------|----------|----------------|
| CommandPalette | ⌘K / Ctrl+K | `useShellKeyboard` hook |
| RestOverlay | Escape | `useEffect` handler |
| Modal dialogs | Escape + Tab trapping | `useFocusTrap` hook |
| Button activation | Enter / Space | `onKeyDown` handler for `role="button"` |
| Tablist navigation | Arrow keys | ARIA Authoring Practices 2.2 |

---

## 6. Security Specifications

### 6.1 Content Security Policy (CSP)

**Phase 1:** Deploy in `Content-Security-Policy-Report-Only` mode for 1 release cycle.  
**Phase 2:** Enforce with the following policy:

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://api.p31ca.org https://mcp-x402-gateway.p31ca.org;
frame-ancestors 'none';
base-uri 'self';
require-trusted-types-for 'script';
```

**Exception documentation:** `wasm-unsafe-eval` needed for MediaPipe FaceLandmarker (gaze tracking).

### 6.2 Security Headers

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=()` |

### 6.3 CORS Allowlist

```typescript
const ALLOWED_ORIGINS = [
  'https://p31ca.org',
  'https://www.p31ca.org',
  'https://app.p31ca.org',
];
// Use exact equality, never wildcard with credentials.
// Environment-aware: add localhost in development.
```

---

## 7. Ethical Design Framework

### 7.1 Friction Framework

| Action | Friction Level | Implementation |
|--------|---------------|----------------|
| Upload personal data | HIGH | `window.confirm` with "stays on your device only" |
| Delete dataset | HIGH | `window.confirm` with "Export first to keep a backup" |
| Clear all datasets | VERY HIGH | `window.confirm` with dataset count and recovery path |
| Pause/rest | ZERO | One button, immediate transition |
| Quit app | ZERO | No confirm; auto‑save |
| Overwork >45min | MODERATE | Soft toast, dismissible, resets on dismiss |
| Break streak | LOW | No streak to break; rest is rewarded |

### 7.2 Dark Pattern Audit

| Type | Check | Status |
|------|-------|--------|
| Interface Interference | Hiding/delaying information | PASS |
| Trick Question | Confusing language | PASS |
| Disguised Ad | Ads that look like content | PASS |
| Bait & Switch | Promising one thing, delivering another | PASS |
| Nagging | Repeated prompts hard to dismiss | PASS |
| Confirm Shaming | Guilt‑tripping users | PASS |
| False Urgency | Artificial scarcity/time pressure | PASS |
| Forced Action | Requiring unintended actions | PASS |

### 7.3 Neurodivergent‑Inclusive Design

| Principle | Implementation |
|-----------|----------------|
| Don't rely on memory | Spoon levels visible at all times; palette remembers commands |
| Provide help | Onboarding privacy statement; CommandPalette discoverability |
| Support adaptation | Sensory modes (muted/calm/warmLight/focus); spoon‑aware UI |
| Simplify navigation | Bottom‑center HUD pill; CommandPalette for all actions |
| Reduce cognitive load | Progressive reduction at low spoons; overwork prompt |
| No "industrialized masking" | Source registry as pure transducer; user controls the data |

---

## 8. Implementation Roadmap

### Phase 1 — Accessibility (Week 1)

- [ ] Add skip link to `App.tsx` (`<a class="skip-link" href="#main-content">`)
- [ ] Add `:focus-visible` global style to `index.css`
- [ ] Fix `sw-update-toast` keyboard access (change to `<button>`)
- [ ] Extract `useFocusTrap` hook from `MemberDashboard.tsx` and apply to all 8 dialogs
- [ ] Add `aria-description` to high‑risk actions (delete, clear‑all)

### Phase 2 — Security Headers (Week 2)

- [ ] Deploy CSP in report‑only mode
- [ ] Add `base-uri 'self'` + `require-trusted-types-for 'script'`
- [ ] Add HSTS, X‑Content‑Type‑Options, Referrer‑Policy, Permissions‑Policy
- [ ] Apply CSP to `/api/*` routes
- [ ] Remove `unsafe-inline` from style‑src if possible

### Phase 3 — Privacy & Consent (Week 3)

- [ ] Add privacy statement to onboarding (first step)
- [ ] Wrap `indexedDB.deleteDatabase` in confirmation dialog
- [ ] Add `dangerouslySetInnerHTML` sanitisation comments and Trusted Types policy

### Phase 4 — Sensory & UX (Week 4)

- [ ] Move sensory toggles to Topbar or Settings
- [ ] Add `useBehavioralSignals` hook for adaptive inference (future)
- [ ] Ensure `RestOverlay` has focus trap
- [ ] Add overwork prompt to App (45min soft toast)

### Phase 5 — Verification (Ongoing)

- [ ] `pnpm typecheck` && `pnpm test` && `pnpm build`
- [ ] `npx a11y-scan-tool http://localhost:5200`
- [ ] `curl -I https://p31-shell.workers.dev` (check headers)
- [ ] Manual QA for upload, delete, gaze, overwork, rest

---

## 9. Verification Checklist

### Accessibility

- [ ] Skip link visible on focus, hidden otherwise
- [ ] All interactive elements have focus indicators (3:1 contrast)
- [ ] All buttons have accessible names
- [ ] All dialogs have focus trap + return focus
- [ ] Tab order is logical
- [ ] No `tabindex` > 0

### Security

- [ ] CSP headers present (report‑only first, then enforce)
- [ ] HSTS header present
- [ ] CORS allowlist uses exact equality
- [ ] No wildcard CORS with credentials
- [ ] Sourcemaps disabled in production (`sourcemap: 'hidden'`)

### Privacy

- [ ] Privacy statement in onboarding
- [ ] Consent gates for upload, delete, clear‑all
- [ ] Telemetry opt‑in only
- [ ] Gaze tracking local‑only + explicit consent

### Ethical UX

- [ ] No streaks, badges, leaderboards
- [ ] No shame/guilt/fear language
- [ ] Rest is rewarded (affirmation)
- [ ] Overwork prompt soft and dismissible

---

## 10. Cross‑Codebase Synchronisation

| Pattern | spaceship‑earth | production/shell | Shared Implementation |
|---------|-----------------|------------------|-----------------------|
| Spoon levels | `App.tsx` spoon tables | `useAppStore.spoons` | Use same 0–5 scale |
| Sensory modes | `useShipStore.hudExpanded` + `useSensoryStore` | `useSensoryStore` | Sync via `@p31ca/design-core` tokens |
| RestOverlay | `src/components/RestOverlay.tsx` | `src/components/RestOverlay.tsx` | Share component |
| CommandPalette | `src/components/CommandPalette.tsx` | `src/components/CommandPalette.tsx` | Share implementation |
| HUDShell | `src/hud/HUDShell.tsx` | `src/components/CockpitHUD.tsx` | Align pill+popover pattern |
| Focus trap | `useFocusTrap` hook (new) | `useFocusTrap` hook (new) | Extract to `@p31ca/design-core` |
| Consent gates | `DatasetPanel.tsx` confirm | IdentityTab confirm | Use consistent `window.confirm` pattern |

---

## 11. Future‑Proofing (2026–2027)

### WCAG 3.0 Alignment

WCAG 3.0 expands focus on cognitive disabilities including dyslexia, ADHD, and neurodivergence. The shell should begin aligning with these principles:

- Simplified navigation
- Reduced cognitive load
- Personalised user experiences

### ARIA 2.0

Upcoming ARIA 2.0 will expand roles for AI‑generated content. The shell's A2UI catalog is positioned to adopt new roles for agent‑rendered UI.

### Trusted Types

`require-trusted-types-for 'script'` will require a Trusted Types policy for all `innerHTML`/`outerHTML` usage. Begin auditing and defining policies.

---

## 12. Conclusion

The "Spaceship-Earth-in-Sync" design system unifies the WebGL 3D experience (`spaceship-earth`) and the React SPA (`production/shell`) under a single ethical UX framework. It is grounded in 2025–2026 research on WCAG 2.2, ARIA 1.3, CSP/HSTS/CORS, designed friction, ADHD dark‑pattern awareness, biometric consent, COGA, and neuroinclusive AI.

**Key outcomes:**

1. **Unified component hierarchy** across both codebases
2. **Token‑based design system** (`--p31-*` variables)
3. **Sensory‑aware states** (spoons, muted/calm modes)
4. **Accessibility enforcement** (skip links, focus traps, `:focus-visible`)
5. **Security hardening** (CSP, HSTS, CORS allowlist)
6. **Ethical friction framework** (consent gates, delete confirm, overwork prompt)
7. **Privacy transparency** (onboarding statement, local‑only processing)
8. **Cross‑codebase synchronisation** via `@p31ca/design-core`

**The cage holds.**
