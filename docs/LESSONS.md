# P31 Lessons Ledger

> This file documents incidents and lessons — what went wrong and how to prevent
> recurrence. Entries are point-in-time. Distinct from AGENTS.md (stable
> conventions) and the runbooks (procedures). Every lesson's Prevention must
> resolve to a real runbook or gate ID. Root causes are proven, or explicitly
> "unproven" with what was ruled out.

| # | Symptom | Root cause | Fix | Prevention | Incident |
|---|---|---|---|---|---|
| L-001 | 390 `oklch(NaN NaN NaN)` literals reached production (90 served live on design.p31ca.org) | A generator that couldn't fail on unparseable input (no `throw`/`exit`). The exact NaN mechanism is **unproven** — `migrate-oklch.mjs`'s `atan2(0,0)` yields 0, not NaN; ruled out "generator produces NaN for achromatic," not ruled out "a NaN literal entered by hand/edit." | Recovered values from baseline + canon; `canon-purity` gate added. | RUNBOOK-canonical-source + gate `canon-purity` + gate:self-test | 9522dea9 / 0757e24 |
| L-002 | `GOVERNANCE` imported by 7 components, defined nowhere; package compiled nothing because nothing consumed it | A published package that never compiled because it was never consumed — no consumer ran its typecheck. | Defined `GOVERNANCE` + `DENSITY`/`densityForSpoons` in `math/colors.ts`; governance pkg now compiles + tests pass. | gate:self-test (a gate/package with no consumer must still be proven) + RUNBOOK-gate-self-test | — |
| L-003 | Five token sources (`theme-store.ts`, `tokens.css`, `manifest.json`, `tokens.json`, `tokens.yml`) all hand-edited, none canonical, hue drifted 270/240/266 | Declared a single source of truth without a parity gate wired to the build. | `verify-token-parity.mjs`; declared `theme-store.ts` canonical per the published package. | RUNBOOK-canonical-source + parity gate | 0757e24 |
| L-004 | Visual baselines regenerated and committed without human approval (first freeze) | `--update-snapshots` treated as a build step, not an approval gate. | Manifest `PENDING_HUMAN` → human approval required before commit. | RUNBOOK-baseline-approval | 857edf6 |
| L-005 | `DESIGN-GOVERNANCE.md` asserted `migrate-oklch.mjs` "emitted NaN where it couldn't parse" — wrong for 3 passes | Asserted a root cause without a reproduction. The script's `atan2(0,0)=0` for achromatic, so "produces NaN" was not the mechanism. | **Prevention is the lesson:** never write a cause into a doc without a reproduction; label unproven causes. | RUNBOOK-root-cause-proof | 0757e24 |
| L-006 | Adding named Playwright projects changed the legacy snapshot path (`-legacy-visual` suffix), bypassing 39 committed baselines | A config change altered behavior elsewhere in the same file; the default `snapshotPathTemplate` appends `{-projectName}`. | Pinned per-project `snapshotPathTemplate`. | RUNBOOK-config-blast-radius | 9425a58 |
| L-007 | D4's selector matched zero elements and reported "REFUTED" | A gate (triage check) measured nothing — zero-match selector reported a verdict. | Fixed the selector (case-insensitive `.badge`), found 34 stable badges. | gate:self-test (a gate that measures nothing must fail) | — |
| L-008 | The ratchet was built, mutation-verified, and nothing called it | A ratchet with no caller is furniture. | Wired `audit:orphans` → count → `ratchet.mjs`. | RUNBOOK-ratchet-wiring + gate `acceptance-ratchet` | 45bfc99 |

<!-- Prevention must resolve to a real runbook (runbooks/RUNBOOK-*.md) or a registry gate (tests/acceptance/gates.json). -->