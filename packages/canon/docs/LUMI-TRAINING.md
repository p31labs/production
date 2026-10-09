# LUMI Ecosystem Training — the path from log to model

The Loom's append-only log is the training substrate ("The Log is the Agent").
This is the operational path — data export → fine-tune → serve — plus the
parameter-free path that ships first (no weights change, no data leaves the
device).

## 0. The privacy posture (literal, not advisory)

- **`shared` events only** for training. `personal` events are never eligible.
- **Consent is a gate, not a checkbox**: `--consent` must be passed to export.
  Without it, nothing is produced. (COPPA / People-First Chatbot posture.)
- `personal` events may be used for **local experience replay** of that
  individual (`--include-personal`, replay-only) but never for fine-tuning.

## 1. Parameter-free path (ships first — no training required)

`scripts/lumi-prompt.mjs <transcript.jsonl> "<query>"` assembles Lumi's context
from the deterministic memory fold + retrieved replay experiences. The log is
the memory; retrieval is the adaptation; nothing leaves the device.

## 2. Export training data

```bash
node scripts/export-training-data.mjs ./path/to/transcript.jsonl \
  --out ./data --consent
```

Produces:
- `lumi.sft.jsonl` — instruction examples `{ context, decision, outcome }`
  (the KurrentDB pattern: fine-tune a small model to predict Lumi's next
  proposal given the family history).
- `lumi.pref.jsonl` — preference pairs for DPO (`{ prompt, chosen, rejected }`)
  and single-signal KTO (`{ prompt, completion, label }`) when the log has only
  one signal per context.

## 3. Fine-tune (QLoRA, family scale)

The KurrentDB prototype reached 100% anomaly recall with ~1.5k examples and
~30 min on a laptop GPU on a 360M model. P31's scale (bounded surface, sparse
family log) is the same regime:

- Base: 0.5–3B instruct model (SmolLM2/Qwen3-class).
- Method: QLoRA (4-bit), SFT on `lumi.sft.jsonl`, then DPO on `lumi.pref.jsonl`
  with the co-presence invariant as a system-prefix constraint.
- Reward shape: coPresenceScore (approve/reject per proposal id; writer-per-kind
  compliance from the gate) — the family's decisions ARE the reward.

## 4. Serve on-device

- Export to **GGUF**, serve via **llama.cpp** — the family's hardware is the
  deployment target (a fine-tuned model must fit the device, not a datacenter).
- Wire `retrieveReplay` into the served prompt (hybrid: fine-tuned weights +
  retrieved episodic/procedural memory).

## 5. Governance

- **Scope is enforced**, not declared: `packages/canon/src/loom/scope.ts`
  (`ScopeGuard` — surface/kind conformance, per-session cap, capability-token
  verify) and `gateway.ts` (`dispatchAgentAction` — propose or structured
  refusal). The Lumi identity (`@p31ca/agent-engine/src/lumi-identity.ts`) mints
  the PQC capability token the guard verifies.
- **Evaluation**: `scripts/lumi-eval.mjs` — five phases (planning, safety,
  coPresence, memory, reasoning), exit 1 on a missed floor; memory precision@1
  checks replay retrieval against the family's own log.

## 6. The loop

```
family log → extract (context, decision) → SFT + DPO data
    → QLoRA fine-tune → GGUF → llama.cpp (on-device)
    → lumi-eval gates each release
    → replay retrieval + memory fold at inference (parameter-free)
    → new decisions append to the log (the loop continues)
```