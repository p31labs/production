# V6-C-taskgate — wiring note (C-3)

How `V6-run-all-gates.mjs` invokes `task-completion.mjs`, what the exit codes
mean, and the MCP skip-with-note contract.

Runbook: DESIGN-SYSTEM-PARALLEL-PATHS-RUNBOOK-V6.md §6 (WORKSTREAM C).
DeskCert model: YAML-shaped JS task suites + Playwright + gate gating; a
forbidden-action violation fails the gate regardless of score.

## 1. Invocation contract

| Invocation | Expectation | Meaning |
|---|---|---|
| `node task-completion.mjs --positive` | **exit 0** | tasks 1–3 all pass, zero forbidden-action violations |
| `node task-completion.mjs --negative` | **exit 1** | NEGATIVE CONTROL — the suite executes a forbidden action (hardcode `#ffffff` into a styles.css copy) → MUST fail regardless of its 4/4 task score |
| `node task-completion.mjs --suite <suite.mjs>` | 0 or 1 | any custom suite module (relative or absolute path) |
| `node task-completion.mjs --list` | exit 0 | lists built-in suites |
| exit 2 | — | usage error (no/bad args) |

Exit codes: `0` = all graded tasks passed and zero violations; `1` = any step
failure OR any forbidden-action violation; `2` = usage error.

## 2. V6-run-all-gates.mjs wiring (house pattern, cf. V3-run-all-gates.mjs)

```js
// ── Lane C: task-completion gate ─────────────────────────────────
run('C task gate POSITIVE', 'node', ['task-completion.mjs', '--positive'], { cwd: C });
run('C task gate NEGATIVE (forbidden action MUST fail)', 'node',
    ['task-completion.mjs', '--negative'], { cwd: C, mustFail: true });
```

- The positive gate is a GREEN gate (`exit === 0` required).
- The negative gate is the **negative control** (`exit !== 0` required) — per
  runbook v6.0 §9: `task-completion | C | task-completion.mjs --suite positive
  | forbidden action → fail`. If the negative suite ever exits 0, the control
  is broken and the whole gate is furniture — fail the V6 suite loudly.

## 3. MCP task needs the local worker (skip-with-note)

`RESOLVE-TOKEN` boots `wrangler dev --port 8790 --persist-to
<V6-C-taskgate>/.tmp/<run>/wrangler-state` as a detached process group
(killed on exit — SIGTERM group reaches workerd; verified: no orphaned
workers, port released every run).

If the worker cannot boot (health never answers within `timeoutMs`, default
90 s), the task prints exactly:

```
SKIPPED: MCP task — worker did not boot
```

and the suite continues; the skip **does not fail the gate** (positive suite
still exits 0). V6-run-all-gates.mjs should treat a `SKIPPED` line in the
positive run's output as pass-with-note (the MCP assertions did not execute),
and record it in the run summary. Proven end-to-end: `.tmp/test-skip.mjs`
(bogus wrangler dir + 3000 ms timeout) → `SKIPPED` note, exit 0.

Preconditions for the MCP task:
- port 8790 free (runner assumes exclusive use; other lanes' dev servers run
  on 8781–8783 and are never touched);
- wrangler resolves to `/home/p31/node_modules/.bin/wrangler` (the runbook's
  `npx wrangler dev` from V3-B-mcp resolves to the same binary — the gate
  spawns the bin directly so the SIGTERM group kill reaches workerd);
- **no deploy** — local dev only.

## 4. Boundary & byproduct notes (for the V6 run summary)

- The gate WRITES only under `V6-C-taskgate/` (runtime scratch in `.tmp/`,
  incl. the negative suite's modified styles.css copy). The real
  `D-embedded/ui/**` fixture and `packages/canon/**` are read-only
  references; the runner refuses any write target outside the scratch dir.
- `wrangler dev` stages build bundles into
  `V3-B-mcp/.wrangler/tmp/` (~0.5 MB, wrangler's own dev cache — inherent to
  the runbook-sanctioned boot; `--persist-to` confines durable state to the
  scratch dir). Expect this dir to (re)appear on every gate run.
- Browser: system Chromium `/usr/bin/chromium` via Playwright 1.62.0 from
  `/home/p31/node_modules`; `PLAYWRIGHT_BROWSERS_PATH=0` — browsers are never
  downloaded.

## 5. Suite format (DeskCert-shaped)

Suites are ESM modules exporting a default data object:

```js
export default {
  name: 'positive',
  description: '…',
  forbiddenActions: ['modify any .css file', 'write raw hex', 'call an unknown MCP tool'],
  tasks: [
    { id: 'LOAD-UI', viewport: [320, 844], steps: [ { action: 'goto', file: 'index.html' }, { action: 'assert', kind: 'exists', selector: '#spoon-value' }, … ] },
  ],
};
```

- Actions: `goto`, `click`, `fill`, `select`, `assert` (kinds: `exists`,
  `text`, `no-horizontal-overflow`, `no-interactive-elements`, `json-path`,
  `file-contains`), `spoon-toggle`, plus the MCP/FS actions the built-in tasks
  need: `mcp-boot`, `mcp-post`, `mcp-kill`, `read-json`, `copy-fixture`,
  `modify`.
- A step may declare `violation: '<string>'` — the string MUST appear in
  `forbiddenActions` or the runner refuses (suite-authoring error, exit 1);
  a matching declaration fails the suite regardless of score. Implicit
  detectors fire the canonical strings automatically (`.css` modify → "modify
  any .css file"; raw hex in a modify → "write raw hex"; `tools/call` of a
  tool not advertised by `tools/list` → "call an unknown MCP tool").

## 6. Evidence (pasted, 2026-10-11)

- `--positive` → `VERDICT: PASS — tasks passed 3/3`, exit 0 (three consecutive
  runs; worker `/health` → `{"status":"ok",…,"tools":17}`; `mcp-kill` →
  `worker exited (code 0)`).
- `--negative` → `FORBIDDEN-ACTION VIOLATIONS: 3` (declared hardcode + two
  implicit detectors), `VERDICT: FAIL — forbidden-action violation (fails
  regardless of task score 4/4)`, exit 1.
- `.tmp/test-skip.mjs` → `SKIPPED: MCP task — worker did not boot`, exit 0.