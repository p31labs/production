<!-- P31-HEADER
id: p31_agent_runbook_part9_shell_v2_20261004_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
owner: will
-->

# AGENT-RUNBOOK-PART9 — Shell v2 (Parallel Paths)

**Authority:** Extends PART8. If a chat instruction conflicts, the runbook wins.

---

## Part 0 — The Six-Round Card Bug, Closed

The definitive root cause: `--p31-space-6` (numeric) was referenced by `.card-body`
but never defined — the P31 spacing system uses **named tiers** only
(`--p31-space-xs/sm/md/lg/xl/2xl/3xl/tiny`). The `24px` fallback carried, but every
prior audit verified the *chain* (JSX → class → rule → import) and never the
*cascade outcome* on the actual element.

**The fix (applied):** `@layer` cascade layers in `index.css`:

```css
@layer reset, base, tokens, components, utilities, overrides;
@import '@p31ca/design-core/css/chrome.css' layer(components);
/* …all design-core imports → layer(components)… */

@layer tokens {
  :root { --p31-space-1: 4px; … --p31-space-6: 24px; … }
}

@layer overrides {
  .card-body { padding: 24px; }
  .glass-card > .card-body { padding: 24px; }
}
```

**Why this is definitive:** the shell's `overrides` layer beats `components`
regardless of specificity or source order; the numeric tokens are now real, not
fallbacks; the `.card-body` value is pinned and token-independent. **Gate:** the
built CSS contains `card-body{padding:24px}` (verified) and the computed padding
on the circled element reads 24px in DevTools.

---

## Part 1 — The Five Parallel Paths

Each path is independent. No path blocks another.

| Path | Scope | Time | Gate |
|---|---|---|---|
| A | Cascade fix | 30 min | **done** — `@layer overrides{.card-body{padding:24px}` in dist |
| B | 3-panel workbench | 1 day | panels resize/collapse/persist |
| C | Mesh backend | 2 days | peer connects → roster updates → DO hibernates |
| D | Identity + family face | 2 days | `?role=admin` unlocks surfaces; multi-user chat renders |
| E | Workspace skin | 1 day | shell matches workspace.p31ca.org look |

---

## Part 2 — Path B: The 3-Panel Workbench

`react-resizable-panels` (v4 — the 2026 standard). Claude pattern: sidebar left
(280px ⇄ 56px rail) · chat center · artifact right (Preview | Code tabs).
`autoSaveId` persists; `collapsible` + `collapsedSize={0}`; `ImperativePanelHandle`
for `collapse()`/`expand()`. Mobile: CSS-only drawer (`@starting-style` + backdrop).

---

## Part 3 — Path C: The Full Mesh Backend

A Durable Object with the Hibernation WebSocket API — zero cost at idle,
thousands of connections per instance.

- `ctx.acceptWebSocket(server)` in `fetch()` (not `ws.accept()`)
- `serializeAttachment()` / `deserializeAttachment()` for per-connection state
- `ctx.getWebSockets()` to restore hibernated sessions on wake
- presence roster in the DO's session map; `webSocketMessage`/`webSocketClose`
- 3-state indicator: green connected / amber initializing / red offline
- wired to the existing `mesh_peers` / `mesh_sync_status` MCP tools

---

## Part 4 — Path D: Identity + Family Face

Identity sidebar (GitHub/workspace pattern): avatar + name + role + tier, then
collapsible sections (Faces, Docs, Sheets, Slides, Monetization, Audit). The
`canAccessSurface(role, face.id)` call gates rendering; a viewer sees a padlock,
an operator sees the entry. Family chat: one continuous feed grouped by author,
typing indicators from the mesh DO, privacy mode (`presence: 'away'`).

---

## Part 5 — Path E: The Workspace Skin

Model `workspace.p31ca.org` — topbar (48px: brand + search + mode chip + spoons +
theme + avatar), sidebar rail (icon + label, sectioned), surface cards with tier
badges (SPARK/MAKER/locked), LOVE counter. The tokens are already in the shell
(`--p31-bg: oklch(17% 0.03 55)`, `--p31-accent: #e2b74b`); the work is the layout.

---

## Part 6 — Execution Order + Verification

Order: A (done) → B (frame) → E (skin) → D (identity) → C (mesh).

Every path lands with: a runnable test, a negative control, and a deployed check.
Path A's negative control is the one that finally kills the bug — remove
`--p31-space-6` from `@layer tokens`; the `@layer overrides` `padding: 24px` must
still win, because it does not depend on the token.

---

*End of runbook. Path A is shipped and verified in the build. The card bug is
closed at the cascade level, not the chain level.*