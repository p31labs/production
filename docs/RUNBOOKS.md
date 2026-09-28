# P31 Runbook Index

Each runbook is an executable recipe for a recurring procedure. When a session
resolves a repeatable procedure, the last step is writing the runbook. Every
runbook has an Owner + Last-verified date (enforced by `runbooks:check`).

| Runbook | Trigger | Owner |
|---|---|---|
| RUNBOOK-generated-artifact.md | About to edit a generated/orphaned file | design-core |
| RUNBOOK-gate-self-test.md | Added/changed a gate, or suspect a gate measured nothing | design-portal |
| RUNBOOK-canonical-source.md | About to edit a design token | design-core |
| RUNBOOK-baseline-approval.md | A visual baseline changed / running `--update-snapshots` | design-portal |
| RUNBOOK-root-cause-proof.md | Writing a root cause into a doc/issue/commit | design-core |
| RUNBOOK-config-blast-radius.md | Adding a named project / config key / snapshot template | design-portal |
| RUNBOOK-ratchet-wiring.md | Added a ratchet, or found one nothing calls | design-portal |

Check: `node tools/runbooks-check.mjs` (from the production repo root).