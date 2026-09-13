# QPJ Workflow Reference Cards

## Track A — Substrate Implementation (Single Agent)

### Pre-Flight (5 min)
- [ ] Read: `portals/qpj/AGENTS.md`, `docs/02-STATE.md`, `docs/08-DEPLOYMENT.md`
- [ ] Verify localStorage baseline: `pnpm test substrate.test.ts --watch` (5 consecutive passes)
- [ ] Feature flag default is `substrate: false` in `src/features/sandbox/sandboxFeatureFlags.ts`

### The Build (Phase Order Matters)
1. **p31-dispatch Worker** — Hostname routing + custom limits
2. **p31-passport Worker** — Per-passport RPC + WebSocket hibernation
3. **passport-do.ts** — SQLite schema + Hibernation handlers
4. **substrate.ts bridge** — localStorage fallback + edge mode detection
5. **Feature flag wiring** — Gate still shows `substrate: false`

### Non-Negotiables
- ❌ Do not create namespace per passport → Use one `production` namespace
- ❌ Do not use standard WebSocket API → Hibernation only (`this.ctx.acceptWebSocket`)
- ❌ Do not use `blockConcurrencyWhile()` as a lock → Initialization only
- ❌ Do not assume sandbox files persist → Ephemeral on idle; write to R2/D1
- ❌ Do not add UI, tokens, or components → Substrate is invisible

### Gate Verification
```bash
cd portals/qpj && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
If gate fails → Stop. Do not commit.

### Success = Feature flag dormant + Bridge returns `mode: 'local'`
Substrate is live in code, but not active in the app. Next commit: state migration.

---

## Triad — UI Polish (Sequential: Narrator → Mechanic → Architect)

### NARRATOR (Gemini) — Read & Describe
**Output:** `docs/16-UI-POLISH-NARRATIVE.md`

For each surface (SiteShell, WorkerChat, WorkshopPage):
```
## [Surface Name]

**What this surface is for:** (1 sentence, family-voice, no jargon)

**What is actually on the screen:** (Inventory: first landing spot → second → third)

**What feels unowned:** (Specific defaults, not vague. Name the thing: gap size, 
margin stacks, blur values, etc. No "feels off.")

**One reference:** (Real product getting the same job right. Be specific.)
```

**Gate:** Commit to main. Post: "NARRATIVE GATE: [Surface A] ✓ | [Surface B] ✓ | [Surface C] ✓"

---

### MECHANIC (DeepSeek) — Fix & Verify
**Input:** Narrator's document + three surfaces
**Output:** Three commits (one per surface), each gate-green

Per surface:
1. Read Narrator's "unowned" items
2. Implement fixes to the surface only (no system redesign)
3. Run gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm v:gate`
4. If gate fails → Fix and re-run. Do not commit on red.
5. Commit with one-line rationale

**Gate:** All three commits gate-green. Post: "SURFACE GATE [SiteShell] ✓ | [WorkerChat] ✓ | [WorkshopPage] ✓"

**Non-Negotiables**
- ❌ No refactoring beyond fixes → One surface per commit only
- ❌ No hardcoded #hex or rgb() → OKLCH or `var(--p31-*)` only
- ❌ No missing states → `:focus-visible` and `:disabled` required
- ❌ No new tokens → Flag as decision, do not add
- ❌ No new components → Composition only

---

### ARCHITECT (Claude) — Review & Verdict
**Input:** Narrator's doc + three Mechanic commits
**Output:** `## Review` section appended to narrative doc

#### Pre-Review Quick Gate (5 min)
```bash
git diff HEAD~3 HEAD -- src/components/SiteShell.tsx \
  src/features/worker/WorkerChat.tsx src/pages/workshop/WorkshopPage.tsx | \
  grep -E '#[0-9A-F]{6}|rgb\('
```
If hex/rgb found → STOP. Tag Mechanic to fix.

#### Full Review (Per Surface)

**Verdict** — One paragraph. Did fixes address the "unowned" items? Any new problems?

**Corrections** — Specific line-level fixes needed. Name the token or pattern.

**Leave Alone** — Things the Mechanic did well. Future passes should not undo.

**Revert** — Any fixes that should be undone. Say plainly why.

#### Deterministic Checks (Per commit diff)
- **Token Coverage:** No hardcoded hex or rgb() outside `:root`
- **State Coverage:** Every interactive element has `:focus-visible` + `:disabled`
- **APCA:** Text/background pairs pass Lc ≥75 (body) or ≥45 (large-bold)
- **Slop Tells:** No backdrop-filter without justification, no purple glow, no shadow-heavy cards, no AI gradients

#### If Regression Found
- **< 5 min fix:** Mechanic re-commits. Architect re-reviews.
- **Requires token:** Flag as "STOP — decision needed"
- **Revert entire surface:** Rare. Signals Narrator was unclear.

**Success = Surface has clear hierarchy, uses existing tokens, all interactive states defined, zero decorative bloat.**

---

## Handoff Protocol (Non-Negotiable)

### Step 1: Narrator Completes
- Commit `docs/16-UI-POLISH-NARRATIVE.md` to main
- Post: "NARRATIVE GATE: SiteShell ✓ | WorkerChat ✓ | WorkshopPage ✓"
- Mechanic does NOT start until this post is visible

### Step 2: Mechanic Completes
- Run gate after each surface
- Post: "SURFACE GATE [SiteShell]: ✓"
- Post: "SURFACE GATE [WorkerChat]: ✓"
- Post: "SURFACE GATE [WorkshopPage]: ✓"
- Architect does NOT start until all three posts are visible

### Step 3: Architect Completes
- Read all three commits
- Append `## Review` to narrative doc
- Verdict required for all three surfaces
- Post: "ARCHITECT REVIEW: Complete."

---

## Design System Anchors (Don't Invent)

**Colors:** OKLCH via `var(--p31-*)` only. No hardcoded hex.
**Spacing:** `var(--p31-space-1)` through `var(--p31-space-4)` (8px grid).
**Type:** One typeface (already specified in AGENTS.md). No new font.
**Depth:** Shadows from token system. No one-off `box-shadow: 0 4px 8px`.
**States:** `:focus-visible`, `:disabled`, `:hover` defined per component.

**If you need a new token:** Flag it. Do not create it yourself.

---

## Success Criteria (All Must Be True)

### Track A
- [ ] Gate passes
- [ ] Feature flag is `substrate: false` by default
- [ ] Bridge returns `mode: 'local'` when env unset
- [ ] localStorage path behaves identically to today
- [ ] Substrate is invisible (zero UI change)

### Triad
- [ ] All three surfaces have clear first/second/third landing spots
- [ ] Every interactive element has `:focus-visible` + `:disabled`
- [ ] Zero hardcoded hex or rgb() outside `:root`
- [ ] APCA Lc ≥75 for body text, ≥45 for large-bold, ≥30 for non-text
- [ ] Every surface answers: *What is this for? What's the first thing I do? What happens if I do it?*
- [ ] A reader unfamiliar with QPJ understands all three by reading SiteShell, WorkerChat, and WorkshopPage

---

## When to Stop & Escalate

| Condition | Action |
|-----------|--------|
| Gate fails after fix attempt | Stop. Escalate to human. |
| New token needed | Flag as "STOP — token decision." Do not create. |
| Regression found (Architect) | Mechanic revises OR revert entire surface. |
| Narrative is unclear (Architect) | Narrator re-writes section. Mechanic tries again. |
| Sandbox lifecycle unclear | Refer to Cloudflare docs Sep 2026. Sandbox SDK lifecycle: running → sleeping (10min idle) → destroyed. State is lost on sleep. |
