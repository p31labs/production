# Production Shell Audit Report

**Date:** 2026-08-12
**Scope:** `/home/p31/production/shell` — React 19 + Cloudflare Workers P31 Sovereign Shell
**Method:** Static analysis against 2025–2026 WCAG 2.2, CSP/HSTS/CORS, ethical design, and neurodivergent-inclusive UX research

---

## Executive Summary

| Domain | Verdict |
|--------|---------|
| WCAG 2.2 Compliance | **Partial** — skip link missing, focus-visible incomplete, 7/8 dialogs lack focus traps |
| ARIA & Semantic HTML | **Partial** — good dialog semantics, but `sw-update-toast` is not keyboard accessible |
| Security Headers & CSP | **Partial** — CSP present but enforcing without report-only phase, missing `base-uri`, `require-trusted-types-for`, HSTS, and 3 other headers |
| Dark Patterns & Ethical Design | **Pass** — no dark patterns, no shame language, no streaks/badges/leaderboards |
| Neurodivergent-Inclusive Design | **Pass** — spoon system, RestOverlay, sensory store with muted/calm toggles present |
| Privacy & Consent | **Partial** — local-only processing, but no privacy statement in onboarding; `dangerouslySetInnerHTML` in 3 places |
| Performance & Resilience | **Pass** — 16 lazy-loaded surfaces/panels, Web Workers, PGLite offline |
| Developer Experience | **Medium** — hardcoded hex fallbacks, heavy inline styles, no a11y testing in CI |

**Overall:** The shell is ethically and architecturally sound. The gaps are concentrated in accessibility enforcement (skip link, focus management, keyboard operability) and security header hardening (HSTS, CSP report-only, trusted types).

---

## Findings

### 1. WCAG 2.2 Compliance

| # | Severity | File:Line | Description | Fix |
|---|----------|-----------|-------------|-----|
| 1.1 | **Critical** | `src/index.css:2658`, `src/App.tsx` | Skip-link CSS exists but no skip-link element is rendered in markup. WCAG 2.4.1 Bypass Blocks fails. | Add `<a class="skip-link" href="#main-content">Skip to main content</a>` as first child of `.shell`, and give the main region `id="main-content"`. |
| 1.2 | **Critical** | `src/App.tsx:181` | `sw-update-toast` is a `<div role="alert">` with `onClick` but no `tabIndex` or `onKeyDown`. Keyboard users cannot activate it. | Change to `<button>` or add `tabIndex={0}` + `onKeyDown` handler for Enter/Space. |
| 1.3 | **High** | `src/components/AkinatorPanel.tsx`, `JusticePanel.tsx`, `MarketplacePanel.tsx`, `NodeZeroPanel.tsx`, `SBTPanel.tsx`, `ConfirmDialog.tsx`, `RestOverlay.tsx` | 7 of 8 dialogs use `role="dialog"` + `aria-modal` but do not trap focus. Only `MemberDashboard`, `McpExplorer`, and `FloatingWindow` implement Tab trapping. | Add a reusable `useFocusTrap(ref)` hook or extract the existing trap logic from `MemberDashboard.tsx:31-35` into a shared hook. |
| 1.4 | **High** | `src/index.css` | Only `.glass-card.interactive:focus-visible` has a focus style (`index.css:1203`). Most interactive elements lack visible focus indicators. WCAG 2.4.11 Focus Appearance (AA) requires 3:1 contrast + 2px perimeter. | Add a global `:focus-visible` rule: `button:focus-visible, a:focus-visible, [role="button"]:focus-visible { outline: 2px solid var(--p31-accent); outline-offset: 2px; }`. |
| 1.5 | **Medium** | `src/pages/SandboxPage.tsx:114,129` | Buttons with `minHeight: 36` and `minHeight: 32` — above WCAG 2.5.8 minimum (24px) but below the 44px recommended touch target. | Increase to `minHeight: 44` for consistency with `GameSurface.tsx:203`. |
| 1.6 | **Medium** | `src/components/RestOverlay.tsx` | RestOverlay has no focus trap. When opened, focus stays on the previously focused element outside the dialog. | Wrap the Return button in a focus trap or move focus to it on mount. |
| 1.7 | **Low** | `src/components/Toast.tsx` | Toast uses `role="status"` + `aria-live="polite"` + `aria-atomic="true"` — correct pattern, but no test verifies it. | Add an a11y test asserting the live region exists and is atomic. |

### 2. ARIA & Semantic HTML

| # | Severity | File:Line | Description | Fix |
|---|----------|-----------|-------------|-----|
| 2.1 | **High** | `src/App.tsx:181` | `sw-update-toast` uses `role="alert"` on a non-interactive `<div>`. Alerts should be `<div>` with live region semantics, but the `onClick` makes it interactive — use `<button>` instead. | Replace with `<button className="sw-update-toast" onClick={handleSwUpdate}>`. |
| 2.2 | **Medium** | `src/components/NotificationHub.tsx:67` | `<li role="button" tabIndex={0} onKeyDown={...}>` — correct keyboard pattern, but a native `<button>` inside the `<li>` would be simpler and more robust. | Consider `<li><button onClick={...}>` instead of role="button" on the li. |
| 2.3 | **Low** | `src/pages/ProfilePage.tsx:26,31,47` | Tablist uses `role="tablist"`, `role="tab"`, `role="tabpanel"` — correct, but missing `aria-selected` on active tab and `tabindex` management. | Add `aria-selected={t.id === activeTab}` and manage `tabindex` per ARIA Authoring Practices. |

### 3. Security Headers & CSP

| # | Severity | File:Line | Description | Fix |
|---|----------|-----------|-------------|-----|
| 3.1 | **Critical** | `src/worker.ts:24-31` | CSP is enforced (not report-only). For a complex app with WASM, this risks breaking legitimate loads before the policy is validated. | Deploy in `Content-Security-Policy-Report-Only` mode for one release cycle, collect violations, then enforce. |
| 3.2 | **High** | `src/worker.ts:31` | Missing `base-uri 'self'` — allows base-uri injection attacks. | Add `base-uri 'self';` to CSP. |
| 3.3 | **High** | `src/worker.ts:31` | Missing `require-trusted-types-for 'script'` — leaves DOM XSS sinks unprotected. | Add `require-trusted-types-for 'script';` and define a Trusted Types policy for any `innerHTML`/`outerHTML` usage. |
| 3.4 | **High** | `src/worker.ts:28-29` | `/api/health`, `/mcp/health`, and `/api/*` routes return `undefined` CSP — completely unprotected. | Either apply the main CSP to these routes or a permissive-but-safe variant (`default-src 'none'; connect-src 'self';`). |
| 3.5 | **High** | `src/worker.ts` | Missing HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy headers. | Add: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=() microphone=() camera=() payment=()`. |
| 3.6 | **Medium** | `src/worker.ts:14` | `/api/health` returns wildcard CORS (`*`). Not credentialed, but inconsistent with the strict allowlist used elsewhere. | Return the matched origin or a specific whitelist entry instead of `*`. |
| 3.7 | **Medium** | `src/worker.ts:31` | `style-src 'self' 'unsafe-inline'` permits inline styles. | Audit whether inline styles are necessary; if not, remove `unsafe-inline`. |
| 3.8 | **Medium** | `src/worker.ts:31` | `script-src 'self' 'wasm-unsafe-eval'` — `wasm-unsafe-eval` is needed for MediaPipe/WebAssembly but widens the attack surface. | Document why it's needed; consider moving WASM to a separate worker with a tighter policy. |

### 4. Dark Patterns & Ethical Design

| # | Severity | File:Line | Description | Fix |
|---|----------|-----------|-------------|-----|
| 4.1 | **Pass** | — | No dark patterns detected. No shame/guilt/fear language. No false urgency, nagging, or forced action. | Maintain current design discipline. |
| 4.2 | **Info** | `src/lib/gameBuilder.ts:35` | `sessionStreak: number` exists as a game-state field but is not surfaced in the UI. Not a dark pattern, but worth monitoring if game features expand. | Ensure any future streak UI includes forgiveness mechanics (pause, no-shame language). |
| 4.3 | **Info** | `src/components/Toast.tsx` | Toast is dismissible and non-blocking — aligns with ethical design. | No action needed. |

### 5. Neurodivergent-Inclusive Design

| # | Severity | File:Line | Description | Fix |
|---|----------|-----------|-------------|-----|
| 5.1 | **Pass** | `src/App.tsx:57-60`, `src/components/RestOverlay.tsx`, `src/store/useSensoryStore.ts` | Spoon system, RestOverlay, and sensory store (muted/calm) are present. Crisis mode at spoons===0 shows RestOverlay. | No action needed. |
| 5.2 | **Medium** | `src/features/identity-wallet/PassportTab.tsx:133-136` | Muted/Calm toggles exist but are buried in Identity Wallet > Passport tab. Not discoverable for users who need them most. | Add sensory toggles to Topbar or Settings for direct access. |
| 5.3 | **Medium** | — | No behavioral signal inference (mouse speed, typing patterns, pauses) for adaptive UI. Research (AttentionGuard/IUI 2026) shows this reduces cognitive load ~25% for ADHD users. | Consider a future `useBehavioralSignals` hook that feeds into `useSensoryStore` or spoon forecasting. |
| 5.4 | **Low** | `src/components/SpaceshipStarfield.tsx:10-11` | Starfield colors use hardcoded hex fallbacks (`#d9a066`, `#8a7a68`) — acceptable for Canvas, but could use design tokens. | Migrate to `var(--p31-*)` tokens where possible. |

### 6. Privacy & Consent

| # | Severity | File:Line | Description | Fix |
|---|----------|-----------|-------------|-----|
| 6.1 | **Medium** | `src/main.tsx:12`, `src/pages/SandboxPage.tsx:26`, `src/components/FloatingWindow.tsx:39`, `src/features/bonding/bondingState.ts:17` | localStorage is used for theme, sandbox state, window positions, and bonding state without an explicit privacy statement in onboarding. | Add an onboarding step: "Your data stays on your device. Nothing is uploaded without your consent." |
| 6.2 | **Medium** | `src/features/identity-wallet/IdentityTab.tsx:90-95` | `indexedDB.deleteDatabase('p31-shell')` + localStorage clear is powerful but lacks a confirmation dialog. | Wrap in a `ConfirmDialog` with "This cannot be undone. Export first." |
| 6.3 | **Medium** | `src/components/ResearchViz.tsx:41`, `src/features/sandbox/ArtifactPane.tsx:497` | `dangerouslySetInnerHTML` used for research visualizations and code highlighting. | Ensure `highlightHtml()` sanitizes input; add a comment documenting the sanitization contract. |
| 6.4 | **Low** | `src/components/P31Icon.tsx:57` | `dangerouslySetInnerHTML` for SVG icons — safe if icons are from a trusted source, but worth auditing. | Add a comment: `// SVG source is trusted (internal asset pipeline)`. |

### 7. Performance & Resilience

| # | Severity | File:Line | Description | Fix |
|---|----------|-----------|-------------|-----|
| 7.1 | **Pass** | `src/App.tsx:33-54` | 16 lazy-loaded surfaces/panels via `React.lazy()` + `Suspense`. | No action needed. |
| 7.2 | **Pass** | `src/features/ship/DomeGeometry.tsx`, `src/lib/mesh/libp2pMesh.ts` | Heavy computation offloaded to Web Workers (dome geometry, mesh sync). | No action needed. |
| 7.3 | **Pass** | `src/hooks/useOutboxDrain.ts`, `src/lib/outbox.ts` | Offline resilience via PGLite + outbox queue. | No action needed. |

### 8. Developer Experience & Maintainability

| # | Severity | File:Line | Description | Fix |
|---|----------|-----------|-------------|-----|
| 8.1 | **Medium** | `src/index.css:1133+` | Hardcoded hex fallbacks in CSS custom property declarations (`var(--p31-accent, #c97b52)`). AGENTS.md mandates zero hardcoded hex. | Move fallbacks to design tokens or accept as necessary CSS fallback pattern. |
| 8.2 | **Medium** | `src/components`, `src/features`, `src/pages` | Heavy inline `style={{...}}` objects throughout. AGENTS.md says "should use CSS classes where maintainable." | Extract repeated inline styles to CSS modules or utility classes. |
| 8.3 | **Medium** | — | No accessibility testing in CI (no axe, Pa11y, or a11y-scan-tool in vitest or scripts). | Add `npx a11y-scan-tool` or `@axe-core/react` to the test suite. |
| 8.4 | **Low** | `src/features/sandbox/ArtifactPane.tsx:45` | `window.parent.postMessage(...)` with `target.outerHTML` — safe because it's local parent, but worth documenting. | Add comment explaining the same-origin assumption. |

---

## Priority Order (Top 10 Fixes)

1. **Add skip link** (`App.tsx`) — 2-minute fix, unblocks keyboard navigation
2. **Fix `sw-update-toast` keyboard access** (`App.tsx:181`) — change to `<button>` or add tabIndex+onKeyDown
3. **Add focus traps to 7 dialogs** — extract reusable hook from existing `MemberDashboard` pattern
4. **Add global `:focus-visible` style** (`index.css`) — 5-minute fix, unblocks WCAG 2.4.11
5. **Add `base-uri 'self'` + `require-trusted-types-for 'script'` to CSP** (`worker.ts:31`) — 10-minute fix
6. **Add HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy** (`worker.ts`) — 5-minute fix
7. **Deploy CSP in report-only mode first** (`worker.ts:38`) — change `Content-Security-Policy` to `Content-Security-Policy-Report-Only`
8. **Add CSP to `/api/*` routes** (`worker.ts:28-29`) — currently unprotected
9. **Add privacy statement to onboarding** — "Your data stays on your device"
10. **Add confirmation dialog to IdentityTab clear-all-data** (`IdentityTab.tsx:90-95`)

---

## Verification

```bash
cd /home/p31/production/shell
pnpm typecheck
pnpm test
pnpm build

# Accessibility:
npx a11y-scan-tool http://localhost:5200
# or axe DevTools + WAVE

# Security headers:
curl -I https://p31-shell.workers.dev
# Expect: CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
```

---

## Architectural Recommendations

1. **Extract a `useFocusTrap` hook** from the existing implementations in `MemberDashboard.tsx` and `McpExplorer.tsx` and apply it to all 8 dialogs.
2. **Create a `SecurityHeaders` utility** in `src/lib/securityHeaders.ts` to centralize HSTS, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy — avoid scattering them across `worker.ts`.
3. **Add a `SkipLink` component** in `src/components/SkipLink.tsx` and render it in `App.tsx`.
4. **Add a11y testing to CI** — `axe-core` via vitest or `a11y-scan-tool` in a post-build step.
5. **Document the CSP exception list** — `wasm-unsafe-eval` is needed for MediaPipe; record this in `docs/RUNBOOK.md` so future maintainers understand why.
