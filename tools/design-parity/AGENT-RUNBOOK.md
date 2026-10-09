# P31 Agent Runbook

Audience: any coding agent operating in the P31 workspace.
Prime directive: **Verify against the rendered artifact before asserting. Never narrate plausible output.**

## 0. The honesty rules (read first)

1. **Never narrate terminal output you did not run.** If you cannot execute, say so. Fabricated output is a lie the human acts on — worse than no output.
2. **Never defend a check that measures the wrong thing.** If the human says the vision model is right and your geometry check disagrees, the geometry check is asking the wrong question. Fix the check, not the human's perception.
3. **Never pipe test output to `grep`.** The pipe swallows the failure detail, forcing a full re-run to see what broke. Read the persisted report instead.
4. **Never claim a UI change is complete without having looked at the render.** This is the P2ER rule. Not optional.

## 1. The empirical verification rule (P2ER)

All claims regarding component rendering MUST be verified against the rendered DOM/browser before asserting to the user.

The failure this rule exists to prevent: the agent said done, the topbar was clipped. A `pnpm build` passing is not evidence the UI renders correctly. A visual baseline matching is not evidence either — `--update-snapshots` bakes regressions into baselines.

Before reporting any UI change done, run all three:

```bash
# 1. Structural gate (authoritative, DOM-based, instant)
node tools/design-parity/layout-invariants.mjs http://localhost:5190
# must exit 0

# 2. Vision gate (advisory diagnostic — catches gross breaks, hallucinates on chrome)
node tools/design-parity/visual-assert.mjs http://localhost:5190/catalog
# prints evidence; --strict to make it a hard gate

# 3. Human evidence — capture the render for review
# screenshot the route for the human to review
```

If the structural gate fails, do not proceed. Fix the layout first.

## 2. The verification stack

Three layers, cheapest first. Climb only when the cheaper signal cannot answer.

| Layer | Tool | Cost | Catches |
|---|---|---|---|
| Structural (authoritative) | `layout-invariants.mjs` | ~1s, deterministic | Full-width topbar, clipping, overflow, bounds |
| Vision (advisory) | `visual-assert.mjs` | ~5s, Workers AI | Gross layout breaks, spacing, overlap, aesthetics |
| Pixel (regression) | `playwright toHaveScreenshot` | ~2min full suite | Sub-pixel rendering changes |

- **Structural gates pass/fail.** Vision reports evidence. Pixel diff catches fine-grained regressions.
- **Do not use vision as the authoritative gate** — VLMs hallucinate "clipped" on correctly-rendered chrome.
- **Do not use pixel diff as the authoritative gate** — it cannot distinguish intent from regression.

### The baseline ratchet is fixed

`--update-snapshots` refuses to run unless the structural gate passes first:

```bash
pnpm snapshots:guarded visual.spec.ts   # runs structural gate, then updates
```

Never call `npx playwright test --update-snapshots` directly. It bakes broken layouts into baselines.

**Baseline commits must reference the design intent.** "Update baselines" is not a
commit message. A baseline regeneration commit names *why* — e.g.
`feat(forge): apply canon glass blur — blur(blur(12px)) was invalid → now blur(12px); regenerate home/catalog`.
Baseline generation is never approval: a separate reviewer inspects the changed
baselines (§9.2), and only approved snapshots are committed.

## 3. The efficient test loop

The failure mode this exists to kill: run full suite (400s) → `| grep passed|failed` swallows the failure → re-run (400s) → investigate.

**Run once, read the report:**
```bash
npx playwright test --workers=1 > /tmp/pw.log 2>&1 || true
```
`--workers=1` avoids the parallel contention that produces false `locator.click: timeout` failures.

**Read failures from the persisted report — no re-run:**
```bash
npx playwright show-report                        # HTML + traces + screenshots
npx playwright show-trace test-results/<name>/trace.zip  # full DOM snapshot at failure
# or: test-results/results.json (JSON reporter writes it every run)
```

**Re-run only the failures — seconds, not minutes:**
```bash
npx playwright test --last-failed --reporter=line
```
`.last-run.json` is written to `test-results/`. It survives the run.

**Target one test:**
```bash
npx playwright test -g "dial axis is real" --reporter=line
npx playwright test tests/acceptance-freeze.spec.ts:113 --reporter=line
```

**Stop on first failure:**
```bash
npx playwright test --max-failures=1 --reporter=line
```

**Do not run the full `build:pwa` for iteration.** That's the pre-merge gate. Run only the project you touched:
```bash
npx playwright test --project=acceptance --reporter=line
npx playwright test --project=legacy-visual --reporter=line
```

## 4. The canon workflow (changing `@p31ca/design-core`)

The design portal consumes a vendored tarball, not the workspace source. Any canon change needs a re-pack + reinstall:

```bash
cd /home/p31/production/packages/design-core
node scripts/token-audit.mjs      # must pass
pnpm typecheck                     # must pass
npm pack                           # produces p31ca-design-core-3.0.0.tgz
cp p31ca-design-core-3.0.0.tgz /home/p31/production/portals/design/vendor/p31-design-core-3.0.0.tgz
cd /home/p31/production/portals/design
pnpm install                       # picks up the fresh tarball
pnpm build                         # rebuild the portal
```

**Then kill any running preview and restart it** — `reuseExistingServer: true` means a stale preview serves an old build and produces false failures:

```bash
ss -tlnp | grep 5190 | grep -oE 'pid=[0-9]+' | cut -d= -f2 | xargs -I{} kill -9 {} 2>/dev/null
(setsid npx vite preview --port 5190 --strictPort > /tmp/dpv.log 2>&1 &)
sleep 5; curl -s -o /dev/null -w "preview: %{http_code}\n" http://localhost:5190/
```

**Registry regeneration** — when `componentDefs.ts` or `catalog.json` changes:
```bash
npx tsx scripts/storybook-to-catalog.mts   # regen catalog
node scripts/gen-registry.mjs              # regen registry.json (carries derived confidence tiers)
node scripts/gen-registry.mjs --check      # validate
```

## 5. The Jitterbug migration pattern

One component at a time, leaves first, verified at each fold.

**The per-component sequence:**
1. **Barrel redirect** — replace the portal's hand-rolled `src/components/<Name>.tsx` with a wrapper that composes the canon component (preserving the portal's props contract, so `App.tsx` is unchanged).
2. **Structural gate** — `layout-invariants.mjs` must pass.
3. **Parity gate** — `parity_chrome <Name>` must be ≤2% vs its isolated baseline.
4. **Delete the hand-rolled internals** — only after parity holds.
5. **Fork-gate** — the wrapper imports the same name it exports (consumer, not fork); fork count drops by 1.
6. **Full suite** — 73/73 must pass.

**The wrapper must not re-implement canon primitives.** If a canon primitive lacks a prop the wrapper needs (e.g. `SpoonDial` had no crisis button), extend the canon — do not hand-roll a replacement inside the wrapper. The wrapper is a compatibility shim, not a place for local forks:

```ts
// SpoonDial.tsx — add the prop, render conditionally
onCrisis?: () => void;
{onCrisis && <button className="spoon-crisis-btn" onClick={onCrisis}>Calm</button>}
```
The wrapper passes `onCrisis={() => setSpoons(0)}` and deletes its local dial. Same behavior, canon-owned.

## 6. The fork-gate (R2 discipline)

A file is a consumer only when it imports **the same name** it exports from `@p31ca/design-core`. A file that imports one canon symbol and hand-rolls a different same-named component is still a fork.

```ts
// CONSUMER (not a fork) — passes the gate
import { Topbar } from '@p31ca/design-core/compositions/Topbar';
export function Topbar(props) { return <CanonTopbar {...props} />; }

// FORK — flagged by the gate
import { Crown } from '@p31ca/design-core';
export function Topbar() { /* hand-rolled */ }
```

**Negative controls must prove the gate can fail:**
```bash
node tools/canon-audit/nc/canon-source-audit-nc.mjs
# NEGATIVE_CONTROL_OK: failed on fork + import-escape-hatch fixture, spared genuine consumers
```
If the NC does not flag every fork AND spare every consumer, the gate is broken. Do not trust a green gate that has not proven it can go red.

## 7. The K₄ audit

Four vertices (Human / Agent / Device / OS) and six edges (their interfaces). Vertices existing is not K₄ — the edges must resolve.

```bash
node tools/design-parity/sierpinski-audit.mjs --probe
# 4/4 scales, 6/6 edges, K₄ complete
```
`--probe` makes the three live edges actually invoke the MCP surface, parity tool, and CLI. Without it, the audit is a static check — a documentation artifact, not a gate.

## 8. Incident response

**"The layout looks broken but the tests pass"**
The pixel baselines baked the regression in. Do not update snapshots. Run the structural gate:
```bash
node tools/design-parity/layout-invariants.mjs <url>
```
If it fails, fix the layout, then re-run the guarded snapshot update. If it passes but the render looks broken, the structural gate's assertion is wrong — extend it (the topbar/sidebar occlusion was invisible to a width measurement).

**"The agent said done but the UI is clipped"**
P2ER was violated — the agent did not run the structural gate against the render. Escalate to the human; do not fix forward without evidence.

**"Tests fail only in parallel"**
Resource contention. Run `--workers=1`. `locator.click: timeout` failures are almost certainly false — verify by running the single test in isolation.

**"The preview shows a different result than the last build"**
The preview is stale. Kill port 5190, rebuild, restart. `reuseExistingServer` will happily serve an old bundle.

**"The canon change didn't take effect"**
The tarball wasn't re-packed, or the portal wasn't reinstalled. See §4.

## 9. Escalation

| Situation | Action |
|---|---|
| Structural gate fails after a fix attempt | Escalate to human with the gate output + screenshot |
| Fork-gate NC fails | Stop. The gate is untrustworthy. Fix it before proceeding |
| Canon API needs a new prop | Pre-production, no third-party consumers — free to extend. Announce in the commit |
| Vision model disagrees with structural gate | Structural gate is authoritative. Report vision as a diagnostic, not a blocker |
| Two consecutive fixes fail the same gate | Stop iterating. The gate is measuring the wrong thing. Escalate |

## 10. Command reference

```bash
# --- Verification ---
node tools/design-parity/layout-invariants.mjs <url>        # structural gate (authoritative)
node tools/design-parity/visual-assert.mjs <url>            # vision diagnostic
node tools/design-parity/sierpinski-audit.mjs --probe       # K₄ completeness

# --- Testing ---
npx playwright test --workers=1                             # serial full run
npx playwright test --last-failed                           # only the failures
npx playwright test -g "<title>"                            # one test
npx playwright test <spec>:<line>                           # one test by line
npx playwright show-report                                  # read the persisted report
npx playwright show-trace test-results/<name>/trace.zip     # inspect one failure

# --- Canon ---
cd packages/design-core && npm pack                         # re-pack tarball
cp p31ca-design-core-3.0.0.tgz <portal>/vendor/p31-design-core-3.0.0.tgz
cd <portal> && pnpm install && pnpm build                   # reinstall + rebuild
node scripts/gen-registry.mjs --check                       # validate registry

# --- Gates ---
node tools/canon-audit/canon-source-audit.mjs               # fork count
node tools/canon-audit/nc/canon-source-audit-nc.mjs         # NC: prove the gate can fail
node packages/design-core/scripts/token-audit.mjs           # no raw colors
node packages/design-core/scripts/canon-purity.mjs          # no NaN colors

# --- Guarded snapshots ---
pnpm snapshots:guarded visual.spec.ts                       # structural gate → then update
```

## 11. The one rule

**Look at the render before claiming it works.** Everything else in this runbook is machinery in service of that. The agent that looks catches the bug; the agent that trusts a green gate ships the bug. The human reviews evidence, not the app.

Geometry for the deterministic invariants. Vision for the diagnostic. Your eyes on the evidence. That is the loop.