# Prompt Upgrades — Ready to Merge

## Critical Additions to Track A Prompt

### Add This Section: "Verification Before Build"

Insert before "## What to build":

```markdown
## Verification Phase (Run This First)

Before implementing the substrate layer, confirm the existing localStorage path
is production-ready:

### Pre-Build Gate
```bash
cd portals/qpj
pnpm test substrate.test.ts --watch
# Run 5 consecutive times. All must pass.
```

Verify manually:
- [ ] WorkerChat survives a 10-message session without state loss
- [ ] WorkshopPage gate status persists across page reload
- [ ] Feature flag `substrate: false` is the canonical default in wrangler.toml

**Do not proceed with substrate implementation until this gate passes 5 times.**

This ensures the fallback path is bulletproof before adding new code.
```

### Add This Section: "Sandbox Binding — When Is It Exercised?"

Replace the current sandbox binding section with:

```markdown
### 2a. The Sandbox binding (deferred exercise)

This commit creates the binding in the per-passport Worker and wires the DO
lifecycle binding. The **sandbox itself is not exercised** in this commit.

The next commit after substrate verification ("Track A.2 — Per-Passport Build
Execution") will implement:
- `sandbox.exec(['python', 'build_tool.py'])` for worker task queue
- `keepAlive: true` during active tasks to prevent state loss
- Write durable outputs (logs, artifacts) to R2 before sandbox sleeps

**Sandbox lifecycle (Sep 2026):** running → sleeping (10 min idle) → destroyed.
All files, processes, shell state are lost on sleep. This binding is placeholder
only in this commit. Do not implement execution flow.
```

### Add This Section: "Success Definition"

Add after "## Verification" section:

```markdown
## Success Definition

**Substrate is verified when:**
1. Gate passes: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
2. Feature flag default is `substrate: false`
3. Bridge `useSubstrate()` returns `{ mode: 'local', ready: true }`
4. localStorage-based tests still pass (regression check)
5. Zero visual change in any portal (substrate is invisible)
6. New tests in `substrate.test.ts` confirm bridge fallback behavior

**Substrate is NOT verified when:**
- Any code path uses direct DO/KV calls (should go through bridge only)
- Feature flag is toggled to `true` (it stays false until human explicitly enables it)
- Any UI element appears (substrate is infrastructure, not surface)

**Proceed to Track A.2 (build execution) only after all six criteria pass.**
```

---

## Critical Additions to Triad Prompt

### Add This Section: "Handoff Confirmation Protocol"

Insert after "The order matters. Gemini describes...":

```markdown

## Handoff Confirmation Protocol (Mandatory)

Each role transition requires explicit confirmation in the commit log:

**Narrator → Mechanic:**
1. Narrator commits `docs/16-UI-POLISH-NARRATIVE.md` with all surfaces
2. Narrator posts git commit message: `docs: UI narrative complete [SiteShell WorkerChat WorkshopPage]`
3. Mechanic waits for commit to appear in `main` branch
4. Mechanic replies in same commit thread: "Mechanic start: SiteShell first"
5. Mechanic does NOT code until Narrator's commit is live

**Mechanic → Architect:**
1. Mechanic runs `pnpm gate` after each surface commit
2. If gate fails: Stop. Fix and re-run. Do not commit on red.
3. Mechanic posts three commits (one per surface) with gate-passing evidence
4. Mechanic final commit message includes: `docs: UI surfaces polished [gate green]`
5. Architect reads all three commits in sequence before beginning review
6. Architect does NOT write review until all three commits are in main

**Output of handoff protocol:** `git log --oneline | grep -E "narrative complete|gate green"`
shows exactly four commits in chronological order.
```

### Add This Section: "Architect Regression Recovery"

Insert in the "Step 3 — Architect" section, after the review checklist:

```markdown

## Regression Recovery Path

If the Architect review finds a problem:

**Type A — Mechanic Can Fix (< 5 min)**
Example: Missing `:disabled` state on a button.
- Mechanic amends the commit (or creates a targeted fix commit)
- Mechanic runs gate again
- Mechanic posts: "Mechanic fix: [surface] ✓ gate green"
- Architect re-reviews the new commit only (not full review)

**Type B — Requires Design Decision (> 5 min, needs human)**
Example: Spacing rhythm conflicts with existing token grid.
- Architect posts: "STOP — decision needed on [surface]. Token [name] must be
  added or spacing rule must change."
- Work pauses until human confirms decision in `docs/15-DIVERGENCES.md`
- Mechanic re-commits based on decision
- Architect re-reviews

**Type C — Revert Entire Surface (Rare)**
Example: Narrator's description was too vague; polish went off the rails.
- Architect posts: "Revert [surface]. Polish added [specific problem].
  Use Narrator's inventory to re-read the unowned items."
- Mechanic reverts the entire surface commit
- Mechanic re-reads Narrator's document and implements a new fix
- Cycle repeats for that surface only

**Timeline expectations:**
- Type A recovery: < 30 min
- Type B recovery: Blocked until human decision (document timing SLA)
- Type C recovery: Full new cycle for that surface (2–4 hours)

If more than one Type B or one Type C occurs, escalate to human. The triad may
need to pause or reset scope.
```

### Add This Section: "Architect Quick-Reference Gate"

Insert as a sub-section of "Step 3 — Architect", right at the top:

```markdown

### Pre-Review Quick Gate (5 Minutes)

Before writing any review paragraph, run these checks:

**1. Token Hygiene Check**
```bash
git diff HEAD~3 HEAD -- src/components/SiteShell.tsx \
  src/features/worker/WorkerChat.tsx src/pages/workshop/WorkshopPage.tsx | \
  grep -c -E '#[0-9A-F]{6}|rgb\(' | head -1
```
If result > 0: STOP. Post: "Mechanic: revert [commit]. Hardcoded hex found at [line]."
Do not proceed to full review.

**2. State Coverage Spot-Check**
For any commit, scan the diff for `:disabled` on interactive elements.
If a commit added a button/input without `:disabled`, flag it as Type A regression.

**3. APCA Estimate**
Visually inspect the diff. Any new text/background pair? Estimate the APCA Lc.
- Body text: needs ≥75
- Large-bold (h2/h3): needs ≥45
- Non-text (borders, icons): needs ≥30
If borderline (within ±5 of threshold), flag for measurement.

**4. Slop Tell Scan**
Search diff for:
- `backdrop-filter: blur` — only ok if there's a semantic reason (e.g., modal overlay)
- `box-shadow` not built from `var(--p31-*)` — one-off shadows are red flags
- Purple or indigo hues (hex #8B5CF6, #A78BFA, etc.) — glow tells
- Gradient backgrounds — unless explicitly called out in a reference

If found and unjustified: Type A flag.

**Only after all four quick gates pass, proceed to full review section.**
```

### Add This Section: "Success Criterion (Measurable)"

Replace the vague "Success criterion" at the end with:

```markdown

## Success Criterion (Measurable)

**Before the triad is complete, ALL of the following must be true:**

### Narrator Success
- [ ] `docs/16-UI-POLISH-NARRATIVE.md` committed and pushed
- [ ] Four fields per surface: job, inventory, unowned items, reference
- [ ] No suggested fixes (description only, no code direction)
- [ ] Unowned items are specific and named (not "feels off")

### Mechanic Success
- [ ] Three commits, one per surface (SiteShell, WorkerChat, WorkshopPage)
- [ ] Gate passes on final commit: `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm v:gate`
- [ ] Zero hardcoded hex or rgb() outside `:root`
- [ ] Every interactive element in the diff has `:focus-visible` and `:disabled`
- [ ] Commit messages include rationale (why it's more owned, naming the token/pattern)

### Architect Success
- [ ] `## Review` section appended to narrative doc
- [ ] One paragraph verdict per surface (did it work? any new problems?)
- [ ] Specific corrections per surface (line-level where possible)
- [ ] "Leave alone" list per surface (prevents re-litigating)
- [ ] Revert list (if any)
- [ ] Zero vague feedback ("feels better" is not a verdict)

### Final Gate: A Reader Test
A designer who has never seen QPJ opens the three surfaces and can answer:
1. *What is this surface for?*
2. *What's the first thing I'm meant to do here?*
3. *What would happen if I did it?*

If all three questions are answered on all three surfaces without reading code,
the triad is complete.

**If any answer is unclear, the triad is NOT done.**
```

---

## Optimization: Make "What NOT to Do" Sections Absolute

### Track A — Sharpen the negations

Replace the "What NOT to do" section with:

```markdown
## Absolute Constraints (Will Cause Build Failure)

- **One namespace only.** Creating a namespace per passport violates Cloudflare's
  documented best practice and causes cost/scaling issues. ✗ REJECT at code review.

- **Hibernation API only.** The standard WebSocket API keeps the DO alive in
  memory indefinitely, incurring cost even while idle. ✓ REQUIRE
  `this.ctx.acceptWebSocket()` + `webSocketMessage()` handlers.

- **Do not use `blockConcurrencyWhile()` as a lock.** It is for initialization only.
  Regular operations use the input/output gate. ✗ Flag as code smell if found.

- **Sandbox state is ephemeral.** Files written during `sandbox.exec()` are deleted
  on sleep (10 min idle). Writing build artifacts requires `keepAlive: true` and
  R2 writes before sandbox sleeps. ✗ Do not implement sandbox execution in this
  commit (deferred to Track A.2).

- **Store migration is NOT in this commit.** The bridge exists, but the flag is
  `substrate: false`. Next commit: wire the store through the bridge.
  ✗ Do not call `setState()` directly to the DO in this commit.

- **Substrate is invisible.** Zero new UI, tokens, components. If the user sees
  a visual change, substrate was not built correctly. ✗ Regression test:
  visual diff `localhost:3000` before/after should show no difference.
```

### Triad — Sharpen the design constraints

Replace "The constraints" section with:

```markdown
## Absolute Constraints (Will Fail the Gate)

- **No hardcoded hex or rgb() outside `:root`.** Every color is OKLCH via
  `var(--p31-*)`. The `token-audit.test.ts` guard is not optional.
  ✗ Gate will fail. Mechanic must fix.

- **Barely-there is a commitment, not a suggestion.** No glow, no pulse,
  no heartbeat, no glassmorphism without semantic justification. Borders are
  hairlines or not present. Shadows come from the token system.
  ✗ Architect will flag as slop tell. Mechanic revises.

- **Every interactive element has `:focus-visible` and `:disabled` states.**
  This is accessibility, not opinion. ✗ Playwright tests check this.
  Gate will fail if missing.

- **Mode-gated security boundary is absolute.** The workshop is Gated or Unlocked.
  Do not weaken this with decorative transitions or blurred overlays that suggest
  permissiveness. ✗ Architect will flag as a regression.

- **Zero new dependencies, tokens, or components.** If something is missing,
  flag it as a decision and pause. Do not invent. ✗ Human review gate.

- **The gate is not negotiable.**
  `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm v:gate`
  must all pass. If any step fails, do not commit. ✗ No exceptions.
```
