# fix: Wave 7 runbook negative controls plant and never restore

<!-- P31-HEADER
id: p31_fix_plan_wave7_restore_20261006_v1.0
type: fix-plan
component: workspace
status: resolved
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

## Symptom

`docs/enterprise/build-package/runbooks/wave-7-streaming-sharing.md` (The
negative control) has three plants and **zero restore steps**. An agent that
runs the section verbatim leaves the plants in the tree and ships broken
code. Compounding it: the only restorable revert for shell files in this repo
would be `git checkout`, but `portals/shell/**` is **untracked** (`git ls-files
portals/shell` → 0 files; `git status` → `?? portals/shell/`), so a
`git checkout portals/shell/...` restore fails with "pathspec did not match".

## Evidence

`docs/enterprise/build-package/runbooks/wave-7-streaming-sharing.md:234-249`
(the code block ends after the third plant; no `restore` / `cp` / `git
checkout` line exists anywhere in the section).

```bash
sed -i 's/stream: true/stream: true, tools: toolsForModel()/' portals/shell/functions/api/chat/stream.ts
node scripts/gate.mjs --feature streaming-protocol --quick   # MUST exit 1
# ...and no restore step.
```

## Fix

Back up to `/tmp/opencode/nc/` before planting and restore with `cp` after the
gate — for every control (same rule the Wave 8 runbook codifies as correction
#10). Applied to the Wave 7 runbook's three controls.