<!-- P31-HEADER
id: p31_gates_surface_20261005_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-05T00:00:00Z
owner: will
-->

# Surface Gates

Every surface gate runs through `scripts/gate.mjs`. Each gate is a list of
runnable assertions. The gate exits 0 when all pass, 1 when any fails.

## The Studio gate

```bash
node scripts/gate.mjs --surface studio
```

| # | Assertion | What it proves |
|---|---|---|
| 1 | StudioFace.tsx exists | The face is present |
| 2 | Workbench.tsx exists | The 3-panel frame is built |
| 3 | Workbench.tsx exports Workbench | The frame is exported |
| 4 | StudioFace renders a chat thread | The card layout is replaced |
| 5 | `.card-body` padding is 24px | The cascade fix holds |
| 6 | viewer is forbidden from studio | The authz gate is enforced |
| 7 | typecheck passes | No type contract violated |
| 8 | build passes | The bundle builds |

Assertions 7–8 are skipped under `--quick` (they are the slow ones).

## The negative control (the gate must be able to fail)

Plant a broken studio and confirm the gate exits 1:

```bash
# Plant: rename StudioFace.tsx so assertion #1 fails
mv portals/shell/src/faces/studio/StudioFace.tsx /tmp/StudioFace.tsx.bak
node scripts/gate.mjs --surface studio --quick   # MUST exit 1 (assertion 1 fails)
mv /tmp/StudioFace.tsx.bak portals/shell/src/faces/studio/StudioFace.tsx

# Plant: set the card-body padding to 0
sed -i 's/padding: 24px/padding: 0px/' portals/shell/src/index.css
node scripts/gate.mjs --surface studio --quick   # MUST exit 1 (assertion 5 fails)
git checkout portals/shell/src/index.css
```

## The live gate

```bash
node scripts/gate.mjs --surface studio --live
```

Two additional assertions against the deployed URL (reads `P31_SHELL_URL`, defaults
to the production shell):

| # | Assertion | What it proves |
|---|---|---|
| 9 | The shell serves HTTP 200 | Deployed and reachable |
| 10 | The deployed CSS pins card-body to 24px | The cascade fix shipped |

## The escalation

When a surface gate fails, the agent:

1. Reads the failing assertion name
2. Checks if it's a spec ambiguity or an agent error
3. If spec ambiguity → refine `surfaces/studio.md`; bump the version
4. If agent error → re-run the agentic node with the same spec
5. Re-runs the gate