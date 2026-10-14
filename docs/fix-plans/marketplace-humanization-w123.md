<!-- P31-HEADER
id: p31_fix_plan_marketplace_humanization_w123_20261012_v1.0
type: fix-plan
component: portals/mcp-marketplace
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: marketplace-humanization-w123 (W1 words · W2 chrome · W3 stories)

**Discovered by:** agent:subagent:marketplace-humanization (this session)
**Discovered at:** 2026-10-12T00:00:00Z
**Severity:** medium (UX standard; gate-enforced going forward)
**Plan ref:** `docs/plans/mcp-marketplace-human-simplification.md` (W1–W3)

## The gap

The live portal was reviewed as "AI sloppish": a cramped topbar with seven
chrome clusters (MAKER badge, public/governed LensSwitch, spoon dots, Calm
pill, role chip, wordmark, identity chip), empty pages, and developer jargon
(probe, backend, endpoint, schema, manifest, governed, JSON-RPC) in
user-visible strings. Audience: a 70-year-old, a 10-year-old, a friend's
wife. The plan's sealed principles require 5th-grade plain language,
cognitive-load caps (nav ≤5, ≤7 cards/grid, ≤4 topbar interactives), and a
per-wave gate with a proven negative control.

## The work (this session, single writer, waves in order)

**W1 — Words.** Swept every user-visible string in `src/**` (JSX text,
title/aria-label/placeholder props, store/lib error messages) to 5th-grade
plain language, applying the locked wording mapping. Error strings became
human sentences. Introduced `scripts/plain-language-scan.mjs` (plain node,
zero deps) as the regression gate.

**W2 — Chrome.** Topbar rebuilt as exactly 4 zones: brand · primary nav
(Home/Discover/Playground/Publish) · one search input (Ctrl+K hint moved to
title tooltip) · one identity chip ("Sign in" or signed-in name + settings
gear). Removed from the topbar: MAKER badge, LensSwitch, SpoonDial dots,
Calm pill, role chip, wordmark. Added `src/components/SettingsSheet.tsx`
with plain controls — "Energy right now: Low / Medium / High" (maps to the
spoon store; Low = crisis/calm styling), "Reduce motion" (maps to
ThemeCharm's muted sensory), "Admin view" (old LensSwitch; only visible when
elevated/authenticated). Review stays routable but is removed from all nav.
Introduced `scripts/check-cognitive-load.mjs` as the regression gate.

**W3 — Stories.** Home = one purpose sentence + 3 big cards + docs footer
link. Discover = real empty state + simple cards (name, one-line
description, one "Open" button; badges moved to detail only; grid capped at
7 with a Show-more step). Server detail defaults to the Install tab
(Install/Tools/Playground/Details), every tool row gets one "Try it" button.
Playground = numbered full-width steps (Pick a server → Pick a tool → Run
it) with raw request/response behind a closed "Show technical details"
disclosure; the helper console is introduced as "Ask a helper to suggest
things to try". Publish = 3-step wizard (What is it? → Where does it live?
→ Check and send). Review shows a plain message without access. Added a
task-completion test suite (find a server, try a tool, publish wizard).

## The gates (new, in /home/p31/production/scripts/)

1. `plain-language-scan.mjs` — extracts user-visible string literals from
   `portals/mcp-marketplace/src/**/*.{tsx,ts}` (JSX text, title /
   aria-label / placeholder props, error-message literals), scores
   readability (word length + sentence length heuristic, threshold 13) and
   checks a jargon blocklist. `--self-test` proves the detector with a
   jargon negative control + clean fixture. Standard documented in
   `docs/fix-plans/plain-language-standard.md`.
2. `check-cognitive-load.mjs` — fails when: top-level nav items > 5
   (literal `NAV_ITEMS`/`ITEMS` arrays in `src/components`), interactive
   elements in `Topbar.tsx` > 4 (nav map excluded — nav is capped by rule
   1), a card render (surface-card/glass-card/grid) maps an uncapped list or
   a slice larger than 7, or a jargon string the plain-language scan would
   catch. `--self-test` negative control plants a 6th nav item.

## Heuristics (documented in the scripts)

- Readability score = `avg letters/word + avg words/sentence` (per
  extracted string); fail above 13. Sentences split on `. ! ? …`.
- Jargon blocklist: rfc, oauth, oidc, did:, didkey, aud, probe, shim,
  governed, endpoint, transport, backend, manifest, schema, json-rpc,
  jsonrpc, liveness, standalone "mcp" token. Ctrl+K allowed only in title
  tooltips. `.p31-mcp.json` normalized out (locked by the plan's wording
  mapping). Technical config-file keys rendered as data (e.g. `mcpServers`)
  are outside the extraction scope and documented as exempt.
- Card-render cap resolution: literal array → count top-level entries;
  `.slice(0, K)` → K must be an in-file literal ≤ 7.

## Status

Executed 2026-10-12. Both scripts' `--self-test` negative controls proven.
Portal gates (typecheck/lint/test/build/v:gate) and canon-source-audit
(0 forks) green; deployed to `p31-portal-mcp-marketplace` with a live
200 + topbar/Home verification.