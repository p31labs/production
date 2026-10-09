# Production Shell Audit & Upgrade Prompt

## Context
You are auditing and upgrading `/home/p31/production/shell` — a React 19 + Cloudflare Workers application that serves as the P31 Sovereign Shell. The app includes lazy-loaded surfaces, Zustand stores, MCP command exposure, offline-first PGLite persistence, post-quantum identity (Ed25519 + ML-DSA-65), and a spoon-based energy system for neurodivergent users.

## Research Foundation (2025–2026)
Your audit must align with the following validated research:

- **WCAG 2.2** (ISO/IEC 40500:2025) — 9 new AA criteria including 2.4.11 Focus Appearance, 2.5.7 Dragging Movements, 2.5.8 Target Size, 3.3.8 Accessible Authentication, 3.2.6 Consistent Help, 3.3.7 Redundant Entry.
- **ARIA 1.3** — expanded roles (`comment`, `suggestion`, `mark`), `aria-description`/`aria-details`, debounced singleton live regions via `requestAnimationFrame`.
- **CSP** — start in `Content-Security-Policy-Report-Only`; avoid `unsafe-inline`/`unsafe-eval`; use nonces; add `require-trusted-types-for 'script'`; set `base-uri 'self'`.
- **HSTS** — `max-age=31536000; includeSubDomains; preload`.
- **CORS** — strict origin allowlist with exact equality; never wildcard + credentials; environment-aware (dev vs prod).
- **Security headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=() microphone=() camera=() payment=()`.
- **Designed friction** — deliberate inefficiencies at consequential decision points foster agency (Sage 2025, Aberdeen 2026).
- **ADHD dark-pattern awareness** — transparency is a competitive advantage; ADHD users detect and avoid manipulation more often than neurotypical users (CHI 2025).
- **Biometric consent** — eye tracking/gaze is biometric data; requires explicit, informed, separate consent; signals that are "involuntary and ambient" need heightened protection (Lexology 2025, Privacy of the Senses 2026).
- **Cognitive accessibility (COGA)** — 8 principles: don't rely on memory, provide help, support adaptation/personalisation, simplify navigation, reduce cognitive load.
- **Neuroinclusive AI** — avoid "industrialized masking"; co-design with users; local-only processing for sensitive signals (ACM AI Letters 2025).

## Audit Deliverable
Produce a structured report with:
1. **Findings** — specific file paths, line numbers, and code snippets for every issue
2. **Severity** — Critical / High / Medium / Low
3. **Recommended fixes** — with code examples
4. **Priority order** — which issues to fix first

## Audit Domains

### 1. WCAG 2.2 Compliance
- Focus appearance (`:focus-visible` with 3:1 contrast and 2px perimeter)
- Target size (≥24×24 CSS px for interactive elements)
- Dragging movements (single-pointer alternatives)
- Accessible authentication (no cognitive function tests without alternatives)
- Consistent help location
- Redundant entry prevention
- Skip links and logical tab order
- Cognitive accessibility (COGA): memory burden, help availability, personalisation support

### 2. ARIA & Semantic HTML
- First rule of ARIA: don't use it when native HTML works
- ARIA 1.3 features (`aria-description`, `aria-details`, expanded roles)
- Keyboard accessibility for all interactive controls
- Focus management (no `tabindex` over 0, no removing focus styles)
- Live regions: debounced singleton via `requestAnimationFrame`

### 3. Security Headers & CSP
- CSP in report-only mode first; strict policy with nonces; no `unsafe-inline`/`unsafe-eval`
- HSTS with preload
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restricting geolocation, microphone, camera, payment
- CORS allowlist (exact equality, environment-aware, never wildcard + credentials)

### 4. Dark Patterns & Ethical Design
- FTC 4 dark-pattern types (false beliefs, interface interference, trick questions, forced action)
- EU DSA / Digital Fairness Initiative compliance
- Neurodivergent vulnerability audit (no shame, guilt, fear, or manipulative language)
- Transparency about data collection and use

### 5. Neurodivergent-Inclusive Design
- Spoon-aware progressive reduction already present — validate it works at every level
- Motion reduction (`prefers-reduced-motion`) wiring
- Calm modes and low-stimulation alternatives
- Behavioral signal inference (mouse speed, typing patterns) for adaptive UI
- Biometric data handling: gaze tracking consent flow, local-only processing, crisis-mode release

### 6. Privacy & Consent
- Explicit, informed consent for data collection (not just browser permission prompts)
- Local-only processing statements in onboarding
- Opt-in telemetry (not opt-out)
- Gaze-purpose statement explaining what data is collected and that it never leaves the device

### 7. Performance & Resilience
- Heavy computation offloaded to Web Workers
- Main thread responsiveness (≥55 FPS during heavy ops)
- Offline resilience (PGLite + outbox queue)
- Lazy-loaded surfaces verified

### 8. Developer Experience & Maintainability
- Hardcoded hex colours (should use design tokens)
- Inline style objects (should use CSS classes where maintainable)
- Dead code and unused imports
- Accessibility testing in CI (axe, Pa11y, or a11y-scan-tool)

## Priority Order
1. **Critical Security** — CSP, CORS allowlist, HSTS, X-Frame-Options
2. **Critical Accessibility** — Focus appearance (2.4.11), target size (2.5.8), keyboard accessibility
3. **High Security** — Remove unsafe-eval/unsafe-inline; production sourcemaps
4. **High Accessibility** — Skip links, aria-labels on icon buttons, semantic HTML
5. **Medium** — COGA principles, cognitive accessibility, dark pattern audit
6. **Medium** — Neurodivergent-inclusive design, sensory-aware UI, biometric consent transparency
7. **Low** — Performance optimisation, DX improvements

## Verification
After implementing fixes:
```bash
cd /home/p31/production/shell
pnpm typecheck
pnpm test
pnpm build
```

For accessibility:
```bash
npx a11y-scan-tool http://localhost:5200
# or axe DevTools browser extension + WAVE
```

## Output Format
Return a single markdown report with:
- Executive summary (pass/fail per domain)
- Findings table (file:line, severity, description, fix)
- Suggested implementation order (top 10 highest-impact fixes first)
- Any architectural recommendations
