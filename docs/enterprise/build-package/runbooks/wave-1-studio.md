<!-- P31-HEADER
id: p31_wave_1_studio_20261005_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-05T00:00:00Z
owner: will
-->

# Wave 1 — Studio Surface

## The DAG

Every node is one of three types: `deterministic` (command + args), `agentic`
(prompt — the agent reads the spec), `approval` (a human gate). The agent reads
only the documents this runbook names.

```yaml
version: "1.0"
name: wave-1-studio
inputs:
  - name: scope_lock
    required: true
    description: "portals/shell/src/faces/studio/**, portals/shell/src/shell/Workbench.tsx, portals/shell/src/shell/Workbench.css, scripts/gate.mjs"
  - name: role
    required: false
    default: operator

nodes:
  # ── Phase 1 — Read (deterministic) ─────────────────────────────────────
  - id: read-master
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/00-MASTER.md]

  - id: read-spec
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/surfaces/studio.md]
    depends: [read-master]

  - id: read-current-face
    type: deterministic
    command: cat
    args: [portals/shell/src/faces/studio/StudioFace.tsx]
    depends: [read-spec]

  - id: read-stagetrace
    type: deterministic
    command: cat
    args: [portals/shell/src/components/StageTrace.tsx]
    depends: [read-spec]

  # ── Phase 2 — Build (agentic) ─────────────────────────────────────────
  - id: install-deps
    type: deterministic
    command: pnpm
    args: [add, react-resizable-panels@^4]
    depends: [read-spec]

  - id: build-workbench
    type: agentic
    prompt: |
      Read the spec at docs/enterprise/build-package/surfaces/studio.md.
      Build the 3-panel workbench exactly as described:
      1. Create portals/shell/src/shell/Workbench.tsx (Group + Separator, v4 API)
      2. Create portals/shell/src/shell/Workbench.css (geometry + mobile drawer)
      3. Rewrite portals/shell/src/faces/studio/StudioFace.tsx (chat timeline)
      4. Wire the artifact panel (renderA2UISurface)
      5. Wire the role gate (useAdapters().identity.role)
      Only touch the files in the scope lock.
    depends: [install-deps, read-current-face, read-stagetrace]

  # ── Phase 3 — Gate (deterministic) ────────────────────────────────────
  - id: gate-surface
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --surface, studio]
    depends: [build-workbench]

  - id: gate-build
    type: deterministic
    command: npm
    args: [run, build]
    cwd: portals/shell
    depends: [build-workbench]

  - id: gate-typecheck
    type: deterministic
    command: npm
    args: [run, typecheck]
    cwd: portals/shell
    depends: [build-workbench]

  # ── Phase 4 — Approval (human) ────────────────────────────────────────
  - id: review
    type: approval
    prompt: "Studio built, gated, and typed. Deploy to production?"
    depends: [gate-surface, gate-build, gate-typecheck]

  # ── Phase 5 — Deploy (deterministic) ──────────────────────────────────
  - id: deploy
    type: deterministic
    command: npm
    args: [run, deploy]
    cwd: portals/shell
    depends: [review]

  - id: verify-live
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --surface, studio, --live]
    depends: [deploy]

edges:
  - from: read-master
    to: read-spec
    contract: { requires: [package-exists], ensures: [spec-read] }
  - from: read-spec
    to: read-current-face
    contract: { requires: [spec-read], ensures: [face-read] }
  - from: build-workbench
    to: gate-surface
    contract: { requires: [workbench-built], ensures: [surface-gate-green] }
  - from: build-workbench
    to: gate-build
    contract: { requires: [workbench-built], ensures: [build-green] }
  - from: build-workbench
    to: gate-typecheck
    contract: { requires: [workbench-built], ensures: [types-green] }
  - from: gate-surface
    to: review
    contract: { requires: [surface-gate-green], ensures: [human-approval] }
  - from: review
    to: deploy
    contract: { requires: [human-approval], ensures: [deployed] }
  - from: deploy
    to: verify-live
    contract: { requires: [deployed], ensures: [live-verified] }

error_handlers:
  - on: gate-surface-failed
    action: abort
    message: "Studio surface gate red. File a fix-plan and refine the spec."
  - on: gate-build-failed
    action: abort
    message: "Build red. The emitted bundle is broken."
  - on: gate-typecheck-failed
    action: abort
    message: "Typecheck red. A type contract was violated."
  - on: live-verify-failed
    action: rollback
    message: "Live verification failed. Roll back to the prior deployment."
```

## The nodes in prose

**Phase 1 — Read.** The agent reads the master, the spec, and the current files.
Deterministic — `cat`, no judgment.

**Phase 2 — Build.** Two nodes: install the dependency, then one agentic node that
builds the workbench, the CSS, the rewritten face, the artifact panel, and the role
gate. The prompt names the exact files in the scope lock.

**Phase 3 — Gate.** Three deterministic nodes: the surface gate, the build, and the
typecheck. All three must pass.

**Phase 4 — Approval.** The human reviews the artifact; the gate output + deployed
preview is the evidence.

**Phase 5 — Deploy + verify.** Deploy, then run the gate against the live URL.

## The gate

```bash
node scripts/gate.mjs --surface studio
```

Exits 0 when the studio surface passes all assertions.

## The evidence

Capture after the wave:

- `git diff --stat` — the files touched
- `node scripts/gate.mjs --surface studio` — the gate output
- the screenshot of the deployed workbench
- the curl output proving the card fix (`card-body{padding:24px}`)