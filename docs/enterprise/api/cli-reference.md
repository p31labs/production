# CLI Reference — ui-forge.mjs and sic-povm-gate.mjs

Both CLIs live in `packages/ui-forge`. All exit codes documented below are the
*current* behavior; the exit-code differentiation (0/1/2/3) is a documented
follow-up (STATUS.md).

## `ui-forge.mjs` — run the generation tetrahedron

Generates a P31 component tree from a backend spec.

```bash
node ui-forge.mjs --spec <backend-spec.json> [--k 4] [--reviews reviews.json] [--json] [--endpoint <url>]
```

| Flag | Description |
|---|---|
| `--spec` | **Required.** Path to the backend spec (entities/actions/relations). |
| `--k` | Dreamer candidate count (default 4). |
| `--reviews` | Path to a JSON array of `/vision` specialist reviews — when present, the Center runs the SIC-POVM gate. |
| `--json` | Print the full Center report as JSON. |
| `--endpoint` | Override the phos-ai-proxy URL the Dreamer provider calls. |

### Output

Human-readable summary + the artifact tree (or, with `--json`, the full report:
`artifact`, `nextGate`, `survivors`, `kills`, `gate`, `propose`, `logs`).

Example spec: `packages/ui-forge/examples/spoon-tracker.json`.

## `sic-povm-gate.mjs` — run the SIC-POVM deploy-precheck

Runs the four `/vision` specialists against a screenshot and exits non-zero
when the gate is not `pass`.

```bash
node sic-povm-gate.mjs --image <screenshot.png> | --reviews <reviews.json> [--json]
```

| Flag | Description |
|---|---|
| `--image` | Screenshot to review (required unless `--reviews`). |
| `--reviews` | Use a pre-collected reviews JSON instead of calling `/vision`. |
| `--json` | Print the full `{ verdict, reviews }` as JSON. |

### Gate verdicts and current exit codes

| Verdict | Meaning | Exit (current) |
|---|---|---|
| `pass` | All four axes report, no degraded axis, no corroborated critical | `0` |
| `incomplete` | An axis collapsed (mean < floor) or is missing | `1` |
| `needs-revision` | Corroborated critical finding or major finding | `1` |
| `needs-review` | A degraded axis (instrument fault) — human must re-run | `1` |

### Environment variables

| Var | Purpose |
|---|---|
| `P31_VISION_URL` | `/vision` base (default the deployed proxy) |
| `P31_VISION_MODEL` | Critique model key (default `llama-3.2-11b`) |
| `P31_FORGE_ENDPOINT` | Dreamer chat endpoint (ui-forge) |
| `P31_DREAMER_MODEL` | Dreamer chat model (default `@cf/meta/llama-3.1-8b-instruct-fast`) |

## Related

- `scripts/rldf-train.mjs` — RLDF training-data export
  (`--log <transcript.jsonl> --consent [--out dir] [--qlora]`). See
  [runbooks/RUNBOOK-rldf-training.md](../runbooks/RUNBOOK-rldf-training.md).
- `scripts/gen-ui-schema.mjs` — regenerates `ui-schema.json` from the canon
  registries.