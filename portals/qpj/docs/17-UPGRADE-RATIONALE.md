# Upgrade Rationale: Why Each Addition Matters

## Track A Gaps & Fixes

### Gap 1: Verification Phase (Pre-Build)

**Original Problem:**
The prompt says "ships the substrate dormant" and assumes localStorage works. But what if localStorage is buggy in an undiscovered edge case? The agent builds substrate code, the gate passes, but the fallback path is broken. Now the app can never safely toggle the flag on.

**Risk:**
- Substrate code is correct but app breaks on `substrate: false` (rollback path is broken)
- Time wasted debugging the fallback instead of substrate bugs
- Human cannot confidently enable the flag later

**Fix:**
Add a "Verification Phase" that proves localStorage baseline is production-ready *before* adding new code.

**Implementation:**
```bash
pnpm test substrate.test.ts --watch
# Run 5 consecutive times. All must pass.
```

**Benefit:**
- Green gate means fallback is bulletproof
- Agent builds substrate knowing the emergency eject path works
- Human can confidently flip the flag once substrate is verified

**Cost:** 10 minutes of testing before coding. Worth it.

---

### Gap 2: Sandbox Binding Deferred (When Is "Later"?)

**Original Problem:**
The prompt says "do not exercise it in this commit" but does not specify when it IS exercised. This creates ambiguity:
- Does "later" mean tomorrow? Next week? After substrate is live?
- Is there a Track C? Or is it a different document?
- What if the agent assumes sandbox binding is enough and tries to implement build execution anyway?

**Risk:**
- Agent implements sandbox execution in Track A (scope creep)
- Agent builds sandbox binding incorrectly because they don't know the next step
- "Deferred" stays deferred forever (scope debt)

**Fix:**
Name the exact next commit: "Track A.2 — Per-Passport Build Execution"

```markdown
The next commit after substrate verification ("Track A.2 — Per-Passport Build
Execution") will implement:
- `sandbox.exec(['python', 'build_tool.py'])` for worker task queue
- `keepAlive: true` during active tasks to prevent state loss
- Write durable outputs (logs, artifacts) to R2 before sandbox sleeps

**Do not implement execution flow in this commit.**
```

**Benefit:**
- Agent knows exactly what Track A.2 will do
- Sandbox binding is built with the right invariants (e.g., lifecycle awareness)
- Scope is clear and bounded

**Cost:** 3 sentences that make the next step explicit.

---

### Gap 3: Success Definition (What Does "Verified" Mean?)

**Original Problem:**
The gate passes, the substrate is "dormant," but what does verified *mean*?
- Does it mean the human has to manually test it? For how long?
- Does it mean a specific test must run? Which one?
- Can the substrate be enabled after the commit, or is there another gate?

**Risk:**
- Agent ships the commit thinking they're done
- Human doesn't know what "verified" looks like operationally
- Flag is still `false` but nobody knows when to flip it on

**Fix:**
Define success as six measurable criteria:

```markdown
**Substrate is verified when:**
1. Gate passes: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
2. Feature flag default is `substrate: false`
3. Bridge `useSubstrate()` returns `{ mode: 'local', ready: true }`
4. localStorage-based tests still pass (regression check)
5. Zero visual change in any portal (substrate is invisible)
6. New tests in `substrate.test.ts` confirm bridge fallback behavior
```

**Benefit:**
- Success is objective, not subjective
- Agent can self-verify they're done
- Human knows exactly what to test before enabling the flag

**Cost:** 6 criteria, each testable in < 1 minute.

---

## Triad Gaps & Fixes

### Gap 1: Handoff Protocol (Who Confirms What?)

**Original Problem:**
The prompt says "the Narrator's document must be committed before the Mechanic reads it" but doesn't explain:
- How does the Mechanic know it's committed?
- Do they refresh the branch? Poll GitHub?
- What if there's a merge conflict?
- How long do they wait?

**Risk:**
- Mechanic starts coding while Narrator is still writing (overlap, confusion)
- Architect begins review before all three Mechanic commits are in (reviews incomplete work)
- Handoff protocol is intent-based, not operational

**Fix:**
Make it operational with git commit messages as the synchronization point:

```markdown
**Narrator → Mechanic:**
1. Narrator commits `docs/16-UI-POLISH-NARRATIVE.md` with all surfaces
2. Narrator posts git commit message: `docs: UI narrative complete [SiteShell WorkerChat WorkshopPage]`
3. Mechanic waits for commit to appear in `main` branch
4. Mechanic replies in same commit thread: "Mechanic start: SiteShell first"
5. Mechanic does NOT code until Narrator's commit is live
```

**Benefit:**
- Synchronization is in git, not in chat or wishful thinking
- `git log --oneline | grep "narrative complete"` proves the handoff happened
- No accidental overlap between roles

**Cost:** Add one commit message per handoff. Total: 4 commits (1 Narrator, 3 Mechanic).

---

### Gap 2: Regression Recovery (What If Something Breaks?)

**Original Problem:**
The prompt says "run the full gate" and "do not commit on red" but doesn't specify what happens if the Architect finds a regression during review.

Scenario:
- Mechanic's commit passes the gate ✓
- Architect's review finds `:disabled` state missing
- Now what? Does the Mechanic fix it? Does the cycle restart? How long do we wait?

**Risk:**
- Workflow stalls because recovery path is undefined
- Mechanic doesn't know if they should revise or revert
- Architect review becomes a surprise "fail" rather than a checkpoint

**Fix:**
Define three recovery paths by type and severity:

```markdown
**Type A — Mechanic Can Fix (< 5 min)**
- Mechanic amends the commit
- Mechanic runs gate again
- Architect re-reviews the new commit only

**Type B — Requires Design Decision (> 5 min, needs human)**
- Architect flags as "STOP — decision needed"
- Work pauses until human decides
- Mechanic re-commits based on decision
- Architect re-reviews

**Type C — Revert Entire Surface (Rare)**
- Narrator's description was too vague
- Mechanic reverts and re-implements
- Cycle repeats for that surface only
```

**Benefit:**
- Mechanic knows what to do immediately (fix, pause, or revert)
- Human is not surprised by "stop" flags (they're documented in the protocol)
- Recovery time is predictable

**Cost:** 3 recovery paths, each with clear decision tree.

---

### Gap 3: Architect Quick Gate (Miss Obvious Failures?)

**Original Problem:**
The Architect's review is 5–10 paragraphs of analysis. But what if the Mechanic left a hardcoded `#FF0000` in the CSS? The Architect will eventually catch it in the "Token Coverage" section, but they've already spent 20 minutes reading code.

**Risk:**
- Obvious failures (hardcoded hex, missing `:disabled`) take too long to discover
- Architect wastes time on a comprehensive review when they should stop and escalate
- Review is slow, feedback cycle is slow

**Fix:**
Add a 5-minute pre-review gate that fails fast:

```bash
git diff HEAD~3 HEAD -- src/components/SiteShell.tsx ... | grep -E '#[0-9A-F]{6}|rgb\('
```

If hardcoded hex is found → STOP immediately. Post: "Mechanic: revert [commit]. Hardcoded hex at line [X]."

**Benefit:**
- Obvious failures caught in seconds, not minutes
- Architect only runs full review if quick gate passes
- Feedback loop is faster (Mechanic can fix in 1 minute)

**Cost:** 3 grep patterns (hardcoded hex, state coverage, APCA spot-check).

---

### Gap 4: Success Criterion (Measurable, Not Aspirational)

**Original Problem:**
The prompt says "a reader who has never seen QPJ can open SiteShell...and in each case answer [questions]" but this is:
- Subjective (how do you measure "can answer"?)
- Post-hoc (only testable after the work is done)
- Vague (does "answer" mean they understand it, or can they articulate it?)

**Risk:**
- Mechanic ships the work thinking they're done
- Architect reviews it and disagrees ("it's still not clear")
- Debate about what "clear" means instead of objective criteria

**Fix:**
Define success as checklist of measurable items:

```markdown
**Narrator Success:**
- [ ] Four fields per surface: job, inventory, unowned items, reference

**Mechanic Success:**
- [ ] Three commits, one per surface
- [ ] Gate passes
- [ ] Zero hardcoded hex
- [ ] Every interactive element has :focus-visible and :disabled

**Architect Success:**
- [ ] One paragraph verdict per surface
- [ ] Specific corrections (line-level)
- [ ] "Leave alone" list
- [ ] Zero vague feedback
```

**Benefit:**
- Success is objective and testable
- Agent can self-verify they're done
- No subjective debate about "clear enough"

**Cost:** 12 checkboxes that are easy to verify.

---

## Root Cause of Gaps

All gaps stem from one issue: **the prompts are descriptive (what to do) but not operational (how to verify you did it).**

| Gap | Root Cause | Fixed By |
|-----|-----------|----------|
| Verification Phase missing | No pre-flight gate | Add "run 5 times" measurable gate |
| Sandbox binding vague | No "Track A.2" named | Name the next commit explicitly |
| Success definition missing | No success criteria | List six measurable criteria |
| Handoff protocol vague | No sync point | Use git commit messages as sync |
| Regression recovery missing | No decision tree | Define three recovery paths |
| Quick gate missing | No fail-fast check | Add 5-minute pre-review filter |
| Success criterion aspirational | No checklist | Convert to measurable items |

---

## Implementation Order

**Phase 1 — Deploy Quick Gates** (Today)
- Add Verification Phase to Track A
- Add Pre-Review Quick Gate to Triad Architect step
- These are low-risk, high-value additions

**Phase 2 — Clarify Deferred Work** (Before Track A agent runs)
- Add "Sandbox Binding — When Is It Exercised?"
- Add "Success Definition"
- These prevent scope creep and rollback failures

**Phase 3 — Operationalize Handoff** (Before Triad starts)
- Add "Handoff Confirmation Protocol"
- Add "Regression Recovery Path"
- These make the workflow non-ambiguous

**Phase 4 — Measure Success** (Throughout)
- Add "Success Criterion (Measurable)" to Triad
- Add measurable success definition to Track A
- These are checkpoints that prevent "are we done?" debates

---

## Effort vs. Benefit

| Upgrade | Lines Added | Benefit | Priority |
|---------|------------|---------|----------|
| Verification Phase | 12 | Prevents broken fallback | 🔴 Critical |
| Sandbox deferred | 8 | Prevents scope creep | 🔴 Critical |
| Success definition | 10 | Prevents rollback failures | 🔴 Critical |
| Handoff protocol | 15 | Prevents overlap/confusion | 🟠 High |
| Regression recovery | 20 | Prevents workflow stall | 🟠 High |
| Quick gate | 25 | Prevents slow reviews | 🟠 High |
| Measurable success | 20 | Prevents "are we done" debates | 🟠 High |

**Total lines added: ~110**
**Total lines in original prompts: ~800**
**Overhead: 14% (net clarity gain ~3x)**

---

## Testing the Upgrades

### Before deploying Track A:
```bash
# Verify the Verification Phase works
cd portals/qpj
pnpm test substrate.test.ts --watch
# Should pass 5 consecutive times
```

### Before deploying Triad:
```bash
# Simulate handoff protocol
git log --oneline | grep -E "narrative complete|gate green"
# Should show 4 commits in order: Narrator, Mechanic (×3)
```

### After each role completes:
```bash
# Verify checklist (example for Mechanic)
echo "Mechanic gates:"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
# Should all pass
echo "Token check:"
git diff HEAD~3 HEAD | grep -c -E '#[0-9A-F]{6}|rgb\('
# Should be 0
```
