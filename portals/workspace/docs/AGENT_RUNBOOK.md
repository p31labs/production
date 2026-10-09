# AGENT_RUNBOOK.md — P31 Quantum Material Workspace

**Version:** 1.0.0 · **Date:** 2026-09-24 · **Audience:** crew agents (Home Guardian, Sandbox Artisan,
SOULSAFE Architect, …) and any generic coding agent.
**Modeled on:** Google IMAG incident management (roles, Prepare→Respond→Learn), Anthropic Agent Skills
(root entrypoint + on-demand skills, deterministic validation gates, stepwise runbooks with rollback,
failure-signature runbooks), and Kilo Code workflows (slash-command recipe files, orchestrator delegation).

> Operating rule: **a claim is true when a gate, test, or command output says it is — never when an agent
> asserts it.** (SOULSAFE OQE discipline.) Five-sentence procedures; explicit decision trees; no long prose.

---

## §1 How to use this runbook

| You are | Read first | Then |
|---|---|---|
| Any agent entering the repo | `AGENTS.md` (root) | `docs/SYSTEM_ARCHITECTURE.md`, then this file |
| Changing a surface | SYSTEM_ARCHITECTURE §5 + BUILD_SPEC §4 | Recipe R1 / R2 below |
| Changing a token / color | BUILD_SPEC §3 | Recipe R3 below |
| Deploying | SYSTEM_ARCHITECTURE §7 | Recipe R5 below |
| Responding to an outage | §5 (S1–S4) | `docs/INCIDENT_LOG.md` after |

Workflow files are also mirrored as Kilo-style slash commands in `.kilo/commands/`.

---

## §2 Roles (IMAG-aligned)

Adapted from Google's Incident Management at Google (IMAG) roles. An agent may hold multiple roles and must
**announce role transitions** in its output before acting under the new role.

| Role | P31 name | Responsibility | Primary tools |
|---|---|---|---|
| Incident Commander | **Workspace Architect** | Strategic decisions; spec integrity; owns GAPs + tag-out sign-off | read, grep, edit |
| Operations Lead | **Surface Artisan** | Tactical execution; edits surfaces; runs gates | edit, bash, test |
| Communications Lead | **Handoff Scribe** | Updates AGENTS.md, spec deltas, migration notes | edit, write |
| Planning Lead | **Gate Auditor** | Runs verification gates; blocks merge on failure | bash, vitest, tsc |
| Logistics Lead | **Vendor Steward** | Vendored tarballs, sync, integrity (`v:gate`, `sync:vendor`) | bash |

Crew surface ownership (competence-boundary cross-check): Home/Dashboard → Home Guardian; Sandbox/artifacts →
Sandbox Artisan; orchestration + 3-gate verification → SOULSAFE Architect. Run `soulsafe_tagout` before
crossing an ownership boundary.

---

## §3 Standard Workflow (six phases)

Structural changes run all six phases. Trivial edits (typos, comments) may compress 0–3 but never skip 4.

```
PHASE 0  TAG-IN      Read AGENTS.md → SYSTEM_ARCHITECTURE → BUILD_SPEC. Classify: which surface/area?
PHASE 1  COMPETENCE  Run soulsafe_tagout. Is this inside your lane? If not, hand off to the owner.
PHASE 2  PLAN        Architect drafts plan: files, invariants touched, gates to run. Output numbered plan.
PHASE 3  EXECUTE     Artisan edits (minimal diff, no drive-by refactors). Run per-file gates.
PHASE 4  VERIFY      Auditor runs the full gate chain (§4). Failure → block, revert, report, back to 3.
PHASE 5  TAG-OUT     Scribe updates AGENTS.md / BUILD_SPEC deltas; Architect signs off.
```

Decision tree — when to escalate:
```
Is the task >2 competence boundaries?      → Workspace Architect
Does a gate fail after reverting my edit?  → Workspace Architect
Is the live site down (S1)?                → §5 S1 sequence, log in INCIDENT_LOG.md
Is a vendored tarball mismatched?          → Vendor Steward (sync:vendor)
```

---

## §4 Deterministic Gates

Only command output is evidence. Pass = exact condition.

| Gate | Command | Pass condition | Blocking |
|---|---|---|---|
| Types | `pnpm typecheck` | exit 0 | yes |
| Lint | `pnpm lint` | exit 0 | yes |
| Unit | `pnpm test` | all tests pass | yes |
| Build | `pnpm build` | `dist/index.html` exists | yes |
| Tokens | `node scripts/token-audit.mjs` | prints `Token audit OK` | yes |
| Vendor | `pnpm v:gate` | exit 0 | ⚠ currently fails here (GAP-07) |
| Live | `curl -sfI https://workspace.p31ca.org` | HTTP 200 | deploy only |

> **GAP-07:** `pnpm v:gate` and therefore `pnpm gate` fail in this portal — `v-gate.mjs` hardcodes
> `@p31ca/design-core` while the package is `@p31ca/design-core`. The green chain is
> `pnpm typecheck && pnpm lint && pnpm test && pnpm build && node scripts/token-audit.mjs`. Fix recipe is in
> BUILD_SPEC §9. A gate that lies is worse than no gate — this table tells the truth.

**Failure protocol:**
1. Revert the change that caused the failure.
2. Record: `gate=<name> cmd=<command> output=<last 3 lines>` in the task log.
3. If it still fails after revert → escalate to Workspace Architect.
4. Never disable a gate, `eslint-disable` it away, or paper over it with a comment.

---

## §5 Incident Response (Prepare → Respond → Learn)

Severity table:

| Sev | Definition | Response time | Responder |
|---|---|---|---|
| S1 | `workspace.p31ca.org` non-200 or blank page | immediate | Workspace Architect |
| S2 | one surface fails to render; others work | 15 min | Surface Artisan |
| S3 | cosmetic degradation (token drift, layout shift) | 1 hr | Gate Auditor |
| S4 | documentation / spec inconsistency | next sprint | Handoff Scribe |

### S1 sequence (live down)
1. **Detect.** `curl -I https://workspace.p31ca.org`; check Cloudflare Pages dashboard for latest deploy.
2. **Mitigate.** `cd production/portals/workspace` → run the green chain
   (`pnpm typecheck && pnpm lint && pnpm test && pnpm build && node scripts/token-audit.mjs`) then
   `pnpm deploy`. If deploy fails, roll back:
   redeploy the last known-good `dist/` from `git log --oneline dist/`.
3. **Resolve.** `git diff HEAD~1` — suspect in order: vendored tarball mismatch (`v:gate`), token-audit
   regression, `wrangler.toml` drift, deployer `manualChunks` change.
4. **Learn.** Append a blameless entry to `docs/INCIDENT_LOG.md` (template at the bottom of that file).

### S2 sequence (single surface broken)
1. Identify surface via console error or `data-mcp-tool` probe.
2. `git log --oneline src/features/<surface>/`.
3. `pnpm test -- src/features/<surface>/`.
4. If tests pass but browser fails, check `useModeGate`/`useSpoonDial` state corruption and GAP-01 bypass.

### S3 sequence (cosmetic)
1. `node scripts/token-audit.mjs` — confirm no hex leak.
2. Diff `src/tokens.css` + `src/workspace.css` against last tag.
3. Fix → Phase 4 full gate.

### S4 sequence (docs drift)
1. Diff AGENTS.md / docs against source.
2. Scribe updates; Scribe never edits code.

---

## §6 Recipes (decision-tree, ≤10 steps each)

### R1 — Add a new surface
1. `src/features/<name>/<Name>Surface.tsx` per BUILD_SPEC §4.
2. Register in `src/lib/routes.ts` (ROUTES) and `src/lib/mcpTools.ts` (MCP_TOOLS + MCP_HANDLERS).
3. Add to `SURFACE_COMPONENTS` (`App.tsx:34`) + `APP_HASHES` (`App.tsx:48`) if deep-linking.
4. Nav entry in `SidebarNav.tsx` (auto via ROUTES) + `MobileBottomNav.tsx` if mobile-worthy.
5. Elevated? → add to `ELEVATED` in `useModeGate.ts`; badge `maker`; never `setSurface` directly.
6. ⌘ shortcut only if within ROUTES[0..6] scope; otherwise document.
7. `data-mcp-tool` on root + `aria-label`.
8. Companion test file. 9. Full gate (§4). 10. Update SYSTEM_ARCHITECTURE §5.

### R2 — Fix the direct-hash gate bypass (GAP-01)
1. In `App.tsx` `onHashChange`, replace `setSurface(surface)` with `useModeGate().navigate(surface)`.
2. Keep `#/setup` and `#/app` direct.
3. Add a test: deep link to `#/sheets` while `spark` opens the gate, not the surface.
4. Full gate. 5. Update BUILD_SPEC §9 (remove GAP-01).

### R3 — Change a design token
1. Edit `src/tokens.css` `:root`. OKLCH only.
2. Verify contrast ≥4.5:1 vs `--p31-text-primary` (APCA/culori).
3. `grep` every usage of the token in `src/`; update hardcoded `calc()`s.
4. `node scripts/token-audit.mjs`. 5. Full gate. 6. If the token ships from design-core, change the source
   package then `pnpm sync:vendor` (Vendor Steward).

### R4 — Fix a token-audit failure
1. Run `node scripts/token-audit.mjs` → file:line.
2. Convert hex/rgba using BUILD_SPEC §3.2 table (nearest token).
3. Re-audit → full gate.

### R5 — Deploy one portal
1. Green chain: `pnpm typecheck && pnpm lint && pnpm test && pnpm build && node scripts/token-audit.mjs`.
2. `pnpm deploy`. 3. `curl -I https://workspace.p31ca.org` → 200. 4. Note deployment ID.

### R6 — Calm mode is destructive (state loss)
1. Confirm symptom: exiting calm resets surfaces.
2. Check `CalmOverlay` renders conditionally (it does — `App.tsx:193`); surfaces are never unmounted by calm.
3. If state resets, the store slice is being re-seeded on mount — move seed to module scope (see
   `SheetsSurface.tsx:10-15` pattern). 4. Test + gate.

---

## §7 Known Pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| `process is not defined` | blank page in console | deployer injects shim; rebuild + redeploy (SYSTEM_ARCHITECTURE §7) |
| `p31-ui.umd.js` 404 | vendor UI missing | `pnpm sync:vendor` then rebuild |
| deep link opens elevated surface in spark | GAP-01 | Recipe R2 |
| ⌘7 opens Calendar not Drive | shortcut surprise | documented truth (§5); reorder ROUTES if desired |
| reduced-motion user still sees motion | GAP-03 | short-circuit `useSpoonDial` on `matchMedia` |
| token-audit false positive on your file | raw value leaked | move to `tokens.css` or convert (R4) |
| vendor drift suspected | `v:gate` fails / SHA512 mismatch | `pnpm sync:vendor` (SHA512 tracked); never hand-edit tarballs. `pnpm v:gate` itself is broken here (GAP-07) |
| calm overlay traps input | can't exit | it can't — button + Esc; verify `z-index` below modals |

---

## §8 Runbook ownership & review cadence

- **Owner:** Workspace Architect (one named owner keeps the doc from rotting — Google SRE practice).
- **Review:** after every S1/S2 incident, after every design-core release, and on a 30-day cadence.
- **Rule:** any fix that changes a documented fact must update the relevant doc in the same commit
  (Phase 5). A runbook that lies is worse than no runbook.