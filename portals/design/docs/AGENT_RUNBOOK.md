# AGENT_RUNBOOK.md — P31 Design System Portal

**Version:** 1.0.0 · **Date:** 2026-09-24 · **Audience:** crew agents + generic coding agents.
**Modeled on:** Google IMAG (roles, Prepare→Respond→Learn), Anthropic Agent Skills (progressive disclosure,
deterministic validation gates), Kilo workflows (recipe files).

> Rule: a claim is true when a gate or command output says it is — never when an agent asserts it.

---

## §1 How to use

| You are | Read first | Then |
|---|---|---|
| Any agent entering the repo | `AGENTS.md` (root) | `docs/SYSTEM_ARCHITECTURE.md`, then this file |
| Changing a surface | SYSTEM_ARCHITECTURE §2 + BUILD_SPEC §4 | R1 / R2 |
| Changing a token / color | BUILD_SPEC §3 | R3 |
| Re-vendoring the canon | SYSTEM_ARCHITECTURE §5 | R4 |
| Responding to an outage | §5 | `docs/INCIDENT_LOG.md` |

## §2 Roles (IMAG-aligned)

| Role | P31 name | Responsibility |
|---|---|---|
| Incident Commander | **Portal Architect** | Spec integrity; gate sign-off |
| Operations Lead | **Surface Artisan** | Edits surfaces; runs gates |
| Communications Lead | **Handoff Scribe** | Updates AGENTS.md / docs |
| Planning Lead | **Gate Auditor** | Runs gates; blocks on failure |
| Logistics Lead | **Vendor Steward** | Canon tarball re-pack + v:gate |

Announce role transitions in output before acting.

## §3 Standard Workflow

0 **Tag-in** — read AGENTS.md → SYSTEM_ARCHITECTURE → BUILD_SPEC.
1 **Competence** — `soulsafe_tagout`; hand off if out of lane.
2 **Plan** — files, invariants touched, gates to run.
3 **Execute** — minimal diff; per-file gates.
4 **Verify** — full chain (§4). Failure → revert → report → back to 3.
5 **Tag-out** — Scribe updates docs; Architect signs off.

## §4 Deterministic Gates

| Gate | Command | Pass | Blocking |
|---|---|---|---|
| Types | `pnpm typecheck` | exit 0 | yes |
| Lint | `pnpm lint` | 0 errors | yes |
| Unit | `pnpm test` | all pass | yes |
| Build | `pnpm build` | dist/ | yes |
| Tokens | `node <dc>/scripts/token-audit.mjs` | `Token audit OK` | yes |
| Vendor | `pnpm v:gate` | `PASS` | yes |
| Live | `curl -I https://design.p31ca.org` | 200 | deploy only |

Failure protocol: revert → record (`gate=<name> cmd=<cmd> output=<last 3 lines>`) → escalate to Portal
Architect. Never disable a gate.

## §5 Incident Response

| Sev | Definition | Responder |
|---|---|---|
| S1 | design.p31ca.org non-200 / blank | Portal Architect |
| S2 | one surface broken | Surface Artisan |
| S3 | cosmetic (token drift) | Gate Auditor |
| S4 | docs drift | Handoff Scribe |

**S1:** `curl -I https://design.p31ca.org` → gate chain → `pnpm deploy` → roll back last known-good
`dist/` if deploy fails → `git diff HEAD~1` (suspect: canon tarball, token-audit, wrangler drift) →
blameless entry in `docs/INCIDENT_LOG.md`.
**S2:** console error / `data-mcp-tool` probe → `pnpm test -- src/__tests__/Routes.test.tsx` → check the
surface's route + shell wrapper.

## §6 Recipes

### R1 — Add a surface
1. `src/routes/<Name>/<Name>.tsx` per BUILD_SPEC §4.
2. Register in `src/lib/nav.ts` (NAV_SECTIONS) + `src/lib/mcpTools.ts` (MCP_TOOLS/HANDLERS).
3. Route + redirect in `src/App.tsx`; footer/bottom-nav auto via NAV_SECTIONS.
4. Test in `src/__tests__/Routes.test.tsx`. 5. Full gate. 6. Update SYSTEM_ARCHITECTURE §2.

### R2 — Fix a token-audit failure
1. `node <dc>/scripts/token-audit.mjs` → file:line.
2. Convert hex/rgba to OKLCH via BUILD_SPEC §3 map (or `scripts/migrate-oklch.mjs`).
3. Re-audit → full gate.

### R3 — Change a portal token
1. Edit `src/tokens.css` (OKLCH). 2. Contrast check vs `--p31-text`. 3. grep usages.
4. `node <dc>/scripts/token-audit.mjs`. 5. Full gate.

### R4 — Re-vendor the canon (3.0.0)
1. Edit `P31-local-workspace/packages/design-core` source.
2. `cd design-core && node scripts/token-audit.mjs && npm pack` → rename to
   `p31-design-core-3.0.0.tgz` if scoped (`p31ca-design-core-*`).
3. Copy to `design/vendor/` + `workspace/vendor/`.
4. `cd design && rm -f pnpm-lock.yaml && pnpm install --ignore-workspace` (lockfile integrity changes).
5. Full gate + `pnpm v:gate`.

### R5 — Deploy
1. Gate chain. 2. `./scripts/freeze-baseline.sh`. 3. `pnpm deploy`. 4. `curl -I` → 200.

## §7 Known Pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| `@p31ca/design-core` import | build: css not exported | rename to `@p31ca/design-core` (canon name) |
| genui catalog ZodError at import | module crashes | re-pack canon (parse fix wraps array in envelope) |
| stale `file:` tarball | fix not visible | `rm pnpm-lock.yaml && pnpm install --ignore-workspace` |
| `workspace:*` resolution fails | install error | use `file:vendor/*.tgz` for design-core + ui |
| `@import` ordering | tokens don't apply | keep `./tokens.css` LAST in `index.css` |

## §8 Ownership

- **Owner:** Portal Architect. **Review:** after every S1/S2, after each canon release, every 30 days.
- Any fix that changes a documented fact updates the doc in the same commit.