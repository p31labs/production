# QPJ Workflow Upgrade — Deployment Checklist

## Executive Summary

The original Track A and Triad prompts are strategically sound but operationally ambiguous. Seven gaps prevent agents from self-verifying they're done and allow workflows to stall or diverge.

**Upgrade scope:** Add ~110 lines to the prompts (14% overhead) to convert from **descriptive** to **operational**.

**Impact:**
- Verification gates prevent broken fallback paths (Track A)
- Handoff protocol eliminates role overlap (Triad)
- Recovery decision trees prevent workflow stall (Triad)
- Measurable success criteria eliminate "are we done?" debates

**Timeline:** Deploy Phase 1 + 2 before Track A agent runs (~1 day work).

---

## Three Supporting Documents (Already Created)

### 1. `docs/17-WORKFLOW-REFERENCE.md`
**Audience:** Narrator, Mechanic, Architect (role cards)
**Length:** 1 page per role
**Use:** Print and tape to monitor while working

### 2. `docs/17-PROMPT-UPGRADES.md`
**Audience:** Prompt authors / humans integrating upgrades
**Length:** 4 pages, copy-paste ready
**Use:** Merge these sections into the master Track A and Triad prompts

### 3. `docs/17-UPGRADE-RATIONALE.md`
**Audience:** Decision-makers / architects reviewing the changes
**Length:** 5 pages
**Use:** Understand why each gap mattered and what it prevents

---

## Deployment Phases

### Phase 1 — Quick Gates (Deploy Today)
**Goal:** Prevent obvious failures early
**Risk Level:** Low (non-breaking, fail-fast only)

#### Track A: Add Verification Phase
- Location: Insert before "## What to build" section
- Content: Run localStorage tests 5 consecutive times before substrate code
- Lines: 12
- Test: `pnpm test substrate.test.ts --watch` passes 5x

#### Triad: Add Pre-Review Quick Gate
- Location: Insert at top of "Step 3 — Architect" section
- Content: 5-minute token/state/APCA/slop-tell scan before full review
- Lines: 25
- Test: Running the grep patterns catches hardcoded hex (if present)

**Effort:** 1 hour to integrate
**Benefit:** Fails obvious mistakes (hardcoded hex, missing `:disabled`) in 5 minutes instead of 20

---

### Phase 2 — Clarity & Deferred Work (Deploy Before Track A)
**Goal:** Prevent scope creep and define rollback path
**Risk Level:** Low (clarification only, no behavior change)

#### Track A: Add "Sandbox Binding — When Is It Exercised?"
- Location: Replace current sandbox section
- Content: Name Track A.2 explicitly; specify what it implements; note state is ephemeral
- Lines: 15 (replaces ~8, net +7)
- Test: Agent does not attempt to implement sandbox execution

#### Track A: Add "Success Definition"
- Location: Insert after "Verification" section
- Content: Six measurable success criteria; define "verified"
- Lines: 10
- Test: Agent can self-verify they're done

**Effort:** 1–2 hours to integrate
**Benefit:** Prevents scope creep (sandbox execution stays in Track A.2); clarifies rollback path

---

### Phase 3 — Operationalize Handoff (Deploy Before Triad)
**Goal:** Eliminate role overlap; sync via git commits
**Risk Level:** Medium (introduces git-based synchronization; requires discipline)

#### Triad: Add "Handoff Confirmation Protocol"
- Location: Insert after "The order matters." line
- Content: Explicit sync points using git commit messages
- Lines: 20
- Test: `git log --oneline | grep -E "narrative complete|gate green"` shows 4 commits in order

#### Triad: Add "Regression Recovery Path"
- Location: Insert in "Step 3 — Architect" section after review checklist
- Content: Type A/B/C recovery decision tree
- Lines: 20
- Test: Architect can point to a recovery path for any problem

**Effort:** 2–3 hours to integrate (requires testing the handoff protocol locally)
**Benefit:** No accidental overlap between roles; clear recovery path if Mechanic work breaks

---

### Phase 4 — Measure Success (Deploy Throughout)
**Goal:** Convert aspirational success to measurable success
**Risk Level:** Low (checkpoints only, non-breaking)

#### Track A: Add "Success Definition" (already in Phase 2)
- Six measurable criteria
- Add to end of Track A prompt

#### Triad: Replace "Success criterion" with "Success Criterion (Measurable)"
- Location: Replace final "Success criterion" section
- Content: Measurable checklists for Narrator, Mechanic, Architect
- Lines: 30 (replaces ~5, net +25)
- Test: Agent runs checklist and confirms done

**Effort:** 1 hour to integrate
**Benefit:** Eliminates "are we done?" debates; clear checkpoint before human review

---

## Deployment Steps

### Step 1: Integrate Phase 1 (Quick Gates)
```bash
# 1. Add Verification Phase to Track A
# 2. Add Pre-Review Quick Gate to Triad Step 3
# 3. Test locally: pnpm test substrate.test.ts
# 4. Commit: "docs: add verification gates (phase 1)"
```

### Step 2: Integrate Phase 2 (Clarity & Deferred Work)
```bash
# 1. Update Track A sandbox section
# 2. Add Success Definition to Track A
# 3. Test: Verify agent does not implement sandbox execution
# 4. Commit: "docs: clarify sandbox deferred work, define success (phase 2)"
```

### Step 3: Integrate Phase 3 (Operationalize Handoff)
```bash
# 1. Add Handoff Confirmation Protocol to Triad
# 2. Add Regression Recovery Path to Triad Step 3
# 3. Test locally: Simulate handoff (git commits, wait for sync)
# 4. Commit: "docs: operationalize triad handoff (phase 3)"
```

### Step 4: Integrate Phase 4 (Measure Success)
```bash
# 1. Replace Triad "Success criterion" section
# 2. Verify Track A Success Definition is in place
# 3. Test: Agent runs checklist and confirms done
# 4. Commit: "docs: make success criteria measurable (phase 4)"
```

---

## Who Needs to Review

### Before Phase 1 (Quick Gates)
- [ ] One human review of gate logic (should be obvious; 10 min)
- Approve: Yes/No

### Before Phase 2 (Clarity & Deferred Work)
- [ ] Product owner confirms Track A.2 (sandbox execution) is actually planned
- [ ] Confirm "verified" definition aligns with human's rollout plan
- Approve: Yes/No

### Before Phase 3 (Operationalize Handoff)
- [ ] Test: Simulate the handoff protocol locally (30 min)
- [ ] Confirm git-based sync is acceptable for all three agents
- [ ] Confirm recovery paths are realistic
- Approve: Yes/No

### Before Phase 4 (Measure Success)
- [ ] Confirm all checkboxes in "Measurable Success" align with actual criteria
- [ ] Confirm "reader who has never seen QPJ" is still the right success test
- Approve: Yes/No

---

## Risk Mitigation

### Risk: Phases get deployed out of order
**Mitigation:** Deploy in order (1 → 2 → 3 → 4). Each phase depends on prior phases.

### Risk: Agent ignores the new gates
**Mitigation:** Highlights in prompt ("✗ REJECT at code review", "✗ Gate will fail"). Human reads the output and enforces.

### Risk: Handoff protocol adds overhead
**Mitigation:** Overhead is ~4 git commits total (1 + 3). Time cost: 1 minute per commit message. Benefit (no overlap/confusion): saves 1+ hours of back-and-forth.

### Risk: Measurable success is too strict
**Mitigation:** All criteria are from the original prompt. This is not *new* success; it's *operationalizing* existing success. If a criterion is too strict, it was already too strict.

---

## Success Criteria for Deployment

✅ All four phases are deployed in order
✅ Verification gates prevent obvious failures (test locally)
✅ Handoff protocol is documented and tested (git log shows sync points)
✅ Success criteria are measurable (checklist is verifiable)
✅ Agent can self-verify they're done (run checklist, confirm gate passes)
✅ Human can see where workflow stalled (git log + rationale docs)

---

## Post-Deployment: First Run of Track A

### Week 1 — Pre-verification
- [ ] Run Verification Phase locally: `pnpm test substrate.test.ts --watch` (5x)
- [ ] Confirm localStorage baseline is solid
- [ ] If Verification Phase fails, fix it before proceeding

### Week 2–3 — Track A implementation
- [ ] Agent builds substrate (workers, DO, bridge)
- [ ] All three commits gate-green
- [ ] Confirm feature flag is `substrate: false` by default
- [ ] Confirm zero visual change

### Week 3–4 — Verification
- [ ] Confirm Success Definition criteria are met (all six)
- [ ] Run Verification Phase one more time (regression check)
- [ ] Confirm bridge returns `mode: 'local'` when env unset
- [ ] Human tests manually (localhost:3000 on desktop + mobile)

### Week 4 — Sign-Off
- [ ] Human confirms all Success Definition criteria
- [ ] Document when substrate is "verified" (date + commit)
- [ ] Proceed to Track A.2 (sandbox build execution)

---

## Post-Deployment: First Run of Triad

### Phase 1 — Narrator (Gemini)
- [ ] Reads three surfaces
- [ ] Produces `docs/16-UI-POLISH-NARRATIVE.md` with all four fields
- [ ] Commits and posts: "NARRATIVE GATE: SiteShell ✓ | WorkerChat ✓ | WorkshopPage ✓"

### Phase 2 — Mechanic (DeepSeek)
- [ ] Waits for Narrator commit
- [ ] Fixes SiteShell; commits; posts: "SURFACE GATE [SiteShell]: ✓"
- [ ] Fixes WorkerChat; commits; posts: "SURFACE GATE [WorkerChat]: ✓"
- [ ] Fixes WorkshopPage; commits; posts: "SURFACE GATE [WorkshopPage]: ✓"
- [ ] All three commits gate-green

### Phase 3 — Architect (Claude)
- [ ] Waits for all three Mechanic commits
- [ ] Runs quick gate (token scan, state coverage, APCA, slop tells)
- [ ] If quick gate fails: Post recovery path, wait for Mechanic fix, re-review
- [ ] If quick gate passes: Full review (verdict + corrections + leave alone + revert)
- [ ] Appends `## Review` to narrative doc
- [ ] Posts: "ARCHITECT REVIEW: Complete."

### Post-Polish — Human Sign-Off
- [ ] Read all three surfaces
- [ ] Confirm each answers: "What is this for? What's first thing I do? What happens?"
- [ ] If any answer is unclear → Triad is not done (loop back to Narrator)
- [ ] If all clear → Triad is complete; merge to main

---

## Appendix: Upgrade Checklist (Copy-Paste Ready)

### Pre-Deployment
- [ ] Read `docs/17-UPGRADE-RATIONALE.md` (understand why each gap matters)
- [ ] Read `docs/17-PROMPT-UPGRADES.md` (get the exact text to add)
- [ ] Review Phase 1 locally (test the verification gate and quick gate)
- [ ] Get approval from product owner (Track A.2 exists? Verified definition OK?)

### Phase 1 Integration
- [ ] Add Verification Phase to Track A (12 lines)
- [ ] Add Pre-Review Quick Gate to Triad Step 3 (25 lines)
- [ ] Test: Run verification gate locally; it should pass 5x
- [ ] Test: Run quick gate on a test diff; it should catch hardcoded hex
- [ ] Commit: "docs: add verification gates (phase 1)"

### Phase 2 Integration
- [ ] Update Track A sandbox binding section (15 lines, replaces 8)
- [ ] Add Success Definition to Track A (10 lines)
- [ ] Verify: No mention of "deferred" without a Track named (should reference Track A.2)
- [ ] Test: Agent does not attempt sandbox execution
- [ ] Commit: "docs: clarify sandbox deferred work, define success (phase 2)"

### Phase 3 Integration
- [ ] Add Handoff Confirmation Protocol to Triad (20 lines)
- [ ] Add Regression Recovery Path to Triad Step 3 (20 lines)
- [ ] Test: Simulate handoff locally (Narrator commits, Mechanic waits, Mechanic commits)
- [ ] Verify: `git log --oneline | grep -E "narrative complete|gate green"` shows sync points
- [ ] Commit: "docs: operationalize triad handoff (phase 3)"

### Phase 4 Integration
- [ ] Replace Triad "Success criterion" section (30 lines, replaces ~5)
- [ ] Verify Track A Success Definition is in place
- [ ] Test: Agent can run checklist and confirm done
- [ ] Verify: All checkboxes are from the original prompt (not new requirements)
- [ ] Commit: "docs: make success criteria measurable (phase 4)"

### Final Validation
- [ ] All four commits merged to main
- [ ] Run: `pnpm typecheck && pnpm lint` (no prompt syntax errors)
- [ ] Post: "All phases deployed. Track A and Triad ready for agents."
- [ ] Schedule: Post-deployment review (week 1 after first Track A run)

---

## Document Map

```
docs/
├── 01-ARCHITECTURE.md
├── 02-STATE.md
├── 03-VOICE.md
├── 04-MODES.md
├── 05-ROUTING.md
├── 06-DESIGN-SYSTEM.md
├── 07-TESTING.md
├── 08-DEPLOYMENT.md
├── 09-MESH.md
├── 10-ONBOARDING.md
├── 11-NOTIFICATIONS.md
├── 12-BRAND.md
├── 13-COMMANDS-AND-FLOOR.md
├── 14-LOVE-LEDGER.md
├── 15-DIVERGENCES.md
├── 16-MASTER-PROMPT-SUBSTRATE.md          [Track A master prompt]
├── 16-MASTER-PROMPT-TRIAD-UI.md           [Triad master prompt]
├── 17-WORKFLOW-REFERENCE.md               [Field cards — print it]
├── 17-PROMPT-UPGRADES.md                  [Copy-paste upgrades]
├── 17-UPGRADE-RATIONALE.md                [Why each gap matters]
└── 17-DEPLOYMENT.md                       [This document]
```

---

## Success Looks Like

**Week 1:** All phases deployed. Verification gates working. Handoff protocol tested locally.

**Week 2–4:** Track A runs. Feature flag is `substrate: false`. Zero visual change. All six success criteria met.

**Week 4–5:** Triad runs. Three surfaces polished. Each surface has clear hierarchy. All state coverage present. No hardcoded hex.

**Week 5+:** Workflows are operational. Agents self-verify they're done. Humans review against measurable criteria. No ambiguity about scope or success.
