<!-- P31-HEADER
id: p31_agents_md_20261004_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
owner: will
-->

# AGENTS.md — P31 Production Harness

**Authority:** This file governs all agent work in `/home/p31/production`. The runbook
(`AGENT-RUNBOOK.md`) is the authority; if a chat instruction conflicts with the
runbook or this file, the runbook wins.

**First read (in order):**
1. `STATE.md` — the persistent brain: current focus, blockers, open loops
2. `.workspace/manifest.json` — the derived workspace index
3. `docs/plans/*.md` (latest) — the current feature plan
4. `docs/components.manifest.json` — what canon components exist (in portals/shell)

---

## The Seven Laws (non-negotiable — enforced by `pnpm gate`)

1. **The shell owns geometry. Canon owns appearance.** Shell CSS may set
   position/size/flow/flex/grid/gap/padding/width/height/overflow only. It may
   NEVER set color, background, border, radius, shadow, or typography.
2. **No ported JSX. No foreign classes. No Tailwind utilities.** Compose from canon.
3. **Theming is a value swap at the semantic tier, never a component fork.**
4. **Compositions belong to the feature. Primitives belong to the canon.**
5. **Every visual decision routes through a token or a catalog component.**
6. **The catalog is the contract. The agent composes within it.**
7. **Prose is advice. Sensors are enforcement.** If a rule matters, it is a test
   that fails the build. Not a sentence in a brief.

## Canon consumption (the enforcement loop)

Before writing any UI against canon, read the machine surface — never prose,
never memory:

1. `list_components` — what has a contract today. An uncontracted component
   does not exist for the agent.
2. `get_contract` — the closed token list, props, required ARIA, and states for
   the component you are composing.
3. `validate_output` — run on every file you change; flags hardcoded hex and
   out-of-contract props.

The gate (`pnpm gate`) is the sensor for these rules. A token not in the
contract's `tokenContract`, a prop not in `props`, or an aria attribute not in
`requiredAria` is a build failure — not a code-review comment.

## The Ownership Contract

**It's all our work. Every problem is filed work.**

Any agent that discovers a bug, a violation, or a gap writes
`docs/fix-plans/<issue-id>.md` **before continuing its task**. The gate
(`fix-plan-scan.mjs`) fails on any unfiled TODO/FIXME/known-broken marker.

## Commands

- Full gate: `pnpm gate` (from the portal root)
- Token conformance: `node scripts/token-conformance.mjs`
- Naming check: `node scripts/namecheck.mjs`
- Frontmatter check: `node scripts/frontmatter.mjs`
- Workspace probe: `node scripts/probe-workspace.mjs`
- Fix-plan scan: `node scripts/fix-plan-scan.mjs`

## Context Discipline

- Byte-cap all command output: `COMMAND 2>&1 | head -c 4000`
- Grep before read — never read a full file to find one function
- Return evidence packets (file:line + one-line explanation), not dumps
- One plan packet at a time

## The Session Start (every session)

```bash
cat /home/p31/production/STATE.md
cat /home/p31/production/.workspace/manifest.json 2>/dev/null | head -40
```

State, in one sentence, the current focus, the blockers, and the next action —
before touching code.