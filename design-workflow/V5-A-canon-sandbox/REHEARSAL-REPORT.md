<!-- P31-HEADER
id: p31_v5a_rehearsal_report_20261011_v1.0
type: rehearsal-report
component: design-workflow/V5-A-canon-sandbox
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-a-v5
runbook: P31-local-workspace/DESIGN-SYSTEM-PARALLEL-PATHS-RUNBOOK-V5.md §3
-->

# V5-A REHEARSAL-REPORT — Canon adoption sandbox (Lane A v5.0)

**Date:** 2026-10-11 · **Node:** v24.16.0 · **Mode:** rehearsal on a sandbox COPY.
**Boundary honored:** every write is under
`design-workflow/V5-A-canon-sandbox/` (+ scratch `/tmp/opencode`). Zero edits to
`packages/canon/**` or `packages/design-core/**` — verified by sha256 at the end
(real canon files byte-identical to session start). Zero npm installs. Gate
scripts were READ ONLY (apply-patches, validates-v3, migration-test,
policy-scan, policy-validate, dtcg-shape-audit, cross-target-parity,
tier-emitter, token-audit) — logic reused via import or CLI, never modified.

---

## A-1 Sandbox build — PASS

Commands (see `A1-copy.log`): `cp -p` of both json files under
`packages/canon/tokens/` into `V5-A-canon-sandbox/tokens/`.

```
2ed16e7518c3078b25511410f88ece80f1fcce1854b5c11af6421543891af446  packages/canon/tokens/tokens.dtc.json
2ed16e7518c3078b25511410f88ece80f1fcce1854b5c11af6421543891af446  V5-A-canon-sandbox/tokens/tokens.dtc.json
cfef583d6167aff278ce2e27adf8d8841bbcf202acf15ffad8459b2d49323fbb  packages/canon/tokens/dist/tokens.resolved.json
cfef583d6167aff278ce2e27adf8d8841bbcf202acf15ffad8459b2d49323fbb  V5-A-canon-sandbox/tokens/dist/tokens.resolved.json
```

**Finding A1-1 (documented):** the runbook/context wording "tokens/{tokens.dtc.json,
tokens.json}" does not match disk — `packages/canon/tokens/` holds only
`tokens.dtc.json` + `dist/tokens.resolved.json`; there is NO tokens.json mirror
in packages/canon. The patch files' "applies-to" names a mirror that does not
exist on disk. v3.0 C3 precedent (V3-C-canon/fixtures/canon-copy/) is followed:
the mirror `tokens.json` is created as a byte-copy of the patched dtc file
(needed for the token-audit gate, which scans `tokens/tokens.json` relative to
cwd). See A1-copy.log NOTE.

## A-2 Patches F1 + F2 — PASS

```
node V3-C-canon/canon-diff/apply-patches.mjs V5-A-canon-sandbox/tokens/tokens.dtc.json \
  V3-C-canon/canon-diff/C3-F1-sunlight-text.patch.json \
  V3-C-canon/canon-diff/C3-F2-extensions-themes-equals-11.patch.json
```

Diff vs pristine copy (`/tmp/opencode/a2-diff-check.mjs`, summary in `A2-diff-summary.txt`):

```
A-2 diff summary:
  total differing paths: 26
  of which unexpected (not F1/F2): 0
  $extensions.p31.themes entries: 239 -> 264 (expect 239 -> 264)
  sunlight.p31 keys: 23 -> 22 (expect 23 -> 22)
  sunlight has 'text' after F1: false
A-2 RESULT: PASS
```

26 differing paths = 25 F2 adds (ocean on all 24 mirror maps + aurora on
accent.green.muted) + 1 F1 removal. **Zero value drift anywhere else.**

**Finding A2-1 (quirk, harmless):** apply-patches.mjs:80 logs the COMPACT
`JSON.stringify(doc)` byte count ("63027 bytes") while writing the
pretty-printed file (157886 bytes). The written file is correct (verified:
disk bytes == JSON.stringify(doc,null,2)+"\n"). No fix — script is read-only.

## A-3 Governance deltas — PASS (`a3-governance.mjs`, decision in `A3-governance-decision.md`)

```
A-3 part 1: versionPolicy "minor" added to 11/11 brand packs
A-3 part 2: brands-rehearsal tree — Base/tokens.json (22 structural names) + 11 brand files (242 override entries)
A-3 RESULT: PASS
```

**DECISION A-3 (placement):** `versionPolicy` is a **brand-level field** —
sibling of `name`/`$extends`/`tokens` per `multi-brand-schema.md:64` — NOT
`$extensions.p31.versionPolicy`. Rationale: (1) the rehearsed RFC-0006 shape is
brand-level; (2) validates-v3.mjs R6 (fixture mode, :287) reads `b.versionPolicy`
at brand level — a `$extensions` placement would be invisible to the gate;
(3) `$extensions.p31` is the per-Token extension namespace; version policy
governs the brand PACK. In today's flat canon the theme pack IS the brand, so
the field lands as `themes.<name>.versionPolicy`.
**Values:** brands = `"minor"` (RFC-0006 operator-runbook starting value);
Base = `"exact"` (decision: a silently-moving Base breaks every child's semver;
Base moves only by explicit operator action) — rehearsed in
`brands-rehearsal/Base/tokens.json`.
**C1-P4 shape rehearsal:** `brands-rehearsal/` tree + `A3-brands-shape-manifest.json`
(`name`, `$extends:["../../Base/tokens.json"]`, `versionPolicy`, `tokens`) —
shape only; the canon file was NOT renamed.

## A-4 P5–P9 policy descriptors — PASS (`a4-policy-descriptors.mjs`, log `A4-descriptors.log`)

Reused `applyRewrites` (EXPORTED by migration-test.mjs); `applyP9` replicated
verbatim (NOT exported); scan/validate imported from policy-scan/policy-validate.

```
BEFORE: 70 finding(s) — [A]21 [B]8 [C]25 [D]16
rewrites applied: P5-P8 on 70/70 flagged tokens; P9 on 6 elevation tints
AFTER:  0 finding(s)
descriptor validation: 76 descriptors, 76 valid, 0 invalid
A-4 RESULT: PASS — 0 findings on sandbox; all descriptors valid
```

## A-5 Gates — all green (tables below), negative controls all fail as designed

| Gate | Command | Result | Exit |
|---|---|---|---|
| (a) token-audit | `node packages/design-core/scripts/token-audit.mjs` (cwd=sandbox; scans `tokens/tokens.json`) | `Token audit OK — no raw hex/rgba in design sources.` | 0 |
| (b) validates-v3 canon report | `node V3-C-canon/validates-v3.mjs` (real canon, hardcoded path — before-evidence) | `REPORT: 11 brands … 11 versionPolicy violation(s) → 0/11 brands adopted.` | 1 (documents live F3) |
| (b) validates-v3 fixture | `--fixture fixtures/sandbox-brands-union.fixture.json` (12 brands FROM sandbox: Base+11, all versionPolicy'd, depth ≤1) | `RESULT: PASS (0 violations)` | 0 |
| (c) policy-scan | `node V3-D-resilience/policy-scan.mjs --fixture fixtures/sandbox-policy-scan.fixture.json` | `RESULT: CLEAN (0 findings)` | 0 |
| (c) policy-validate | `node V3-D-resilience/policy-validate.mjs V5-A-canon-sandbox/tokens/tokens.dtc.json` | `descriptors: 76 valid: 76 invalid: 0 — RESULT: ALL DESCRIPTORS VALID` | 0 |
| (d) dtcg-shape-audit | `node V2-C-ci/dtcg-shape-audit.mjs --sources V5-A-canon-sandbox/gate-sources` | `canon: 447 tokens … findings: 0 — RESULT: PASS` (447 = 448 − F1) | 0 |
| (e) tier-emitter + parity | scratch emitter copy (CANON_PATH→sandbox) rebuilt dist; `node V2-C-ci/cross-target-parity.mjs --dist /tmp/opencode/emitter-rehearsal/dist --sources V5-A-canon-sandbox/gate-sources` | `merged 234 … emitted 113 live (121 deprecated skipped)` → `findings: 0 — RESULT: PASS (cross-target parity OK)` | 0 |
| (f) validates-v3 --strict | real canon (before-evidence) | `sunlight 23 tokens 2 VIOLATION(S) … REPORT: … 1 inheritance violation(s)` | 1 (documents live F1) |
| (f) strict fixture | `--fixture fixtures/sandbox-brands-strict.fixture.json` (intersection Base = --strict semantics; sunlight 22, no text) | `RESULT: PASS (0 violations)` — **F1 stays resolved on the sandbox** | 0 |

Gate (e) limitation, documented: `tier-emitter.mjs` hardcodes
`CANON_PATH` (tier-emitter.mjs:38) and `DIST` — no CLI override. Per runbook
A-5(e): rehearsed on a SCRATCH copy of the emitter+inputs in
`/tmp/opencode/emitter-rehearsal/` with ONLY the copy's CANON_PATH redirected to
the sandbox file (the original script is untouched — sha
`5270dc79…` unchanged). `cross-target-parity.mjs` DOES accept `--sources` and
`--dist` (D_HEADER/D_MAP stay hardcoded to the real D-embedded files, read-only).
Baseline runs (real dist + real sources) also PASS (0 findings each).

### Negative controls — each MUST fail (all failed exactly as designed)

| NC | Command | Output tail | Exit |
|---|---|---|---|
| (i) F1 re-added | `validates-v3.mjs --fixture fixtures/neg-F1-readded.fixture.json` (sunlight.text restored, strict/intersection Base) | `RESULT: FAIL (1 violation(s)) [R2] text: override name 'text' does not exist in the parent chain (new structure forbidden)` | 1 |
| (ii) one brand's versionPolicy removed | `validates-v3.mjs --fixture fixtures/neg-no-versionpolicy.fixture.json` (garden) | `RESULT: FAIL (1 violation(s)) [R6] -: versionPolicy missing (RFC-0006: explicit, never implicit …)` | 1 |
| (iii) raw #000000 planted | `token-audit.mjs` cwd=`neg-rawhex/` (C3-NEG-raw-hex.patch.json applied to mirror) | `✗ tokens/tokens.json: #000000` / `Token audit FAILED — 1 file(s) contain raw color literals.` | 1 |

Real-canon audit baselines (report-only, separate): policy-scan on real canon =
70 findings `[A]21 [D]16 [C]25 [B]8` (exit 1); validates-v3 canon report = 0/11
versionPolicy (exit 1); --strict = sunlight R2 (exit 1). These are the live
gaps the real merge closes.

### Real files untouched — PASS

```
2ed16e75…  packages/canon/tokens/tokens.dtc.json            (== A-1 log)
cfef583d…  packages/canon/tokens/dist/tokens.resolved.json  (== A-1 log)
b5d11b0d…  packages/design-core/tokens/tokens.json
680cd5c1…  design-workflow/A-token-pipeline/dist/tokens.manifest.json
5270dc79…  design-workflow/A-token-pipeline/tier-emitter.mjs
a6bd4849…  design-workflow/V3-D-resilience/migration-test.mjs
```

Sandbox final state: themes-mirror 264 · sunlight 22 · versionPolicy 11/11 ·
descriptors 76 · mirror tokens.json ≡ tokens.dtc.json (byte-identical).

## A-6 Operator action list for the REAL merge (numbered; each = command + verification)

> The real merge edits `packages/canon/**` — an explicit OPERATOR action
> (REHEARSAL RULE: rehearsal here, shipping as operator action). Every step
> below was replayed from the pristine copy in this rehearsal; the replay
> produced a file **byte-identical** to the rehearsed sandbox state
> (`sha256 a07f6702…` both) — proving the list is complete and ordered.

1. **Baseline + backup.**
   `cd /home/p31/production && sha256sum packages/canon/tokens/tokens.dtc.json packages/canon/tokens/dist/tokens.resolved.json > /tmp/opencode/merge-baseline.sha256 && cp -p packages/canon/tokens/tokens.dtc.json /tmp/opencode/backup-tokens.dtc.json`
   VERIFY: baseline hashes equal `2ed16e75…` and `cfef583d…` (drift check).

2. **Apply F1 + F2 patches to the real canon file.**
   `node design-workflow/V3-C-canon/canon-diff/apply-patches.mjs packages/canon/tokens/tokens.dtc.json design-workflow/V3-C-canon/canon-diff/C3-F1-sunlight-text.patch.json design-workflow/V3-C-canon/canon-diff/C3-F2-extensions-themes-equals-11.patch.json`
   VERIFY: `node /tmp/opencode/a2-diff-check.mjs`-style check (point it at the real file + backup) → extensions entries 239→264, sunlight.p31 keys 23→22, 0 unexpected diffs.

3. **Apply governance + policy deltas (single parameterized operator script, replay-proven).**
   `node design-workflow/V5-A-canon-sandbox/operator-apply-deltas.mjs packages/canon/tokens/tokens.dtc.json`
   VERIFY: output ends `OPERATOR DELTAS RESULT: PASS` with `versionPolicy … 11/11`, `P5-P8 rewrites: 70/70`, `P9 elevation tints: 6`, `after: 0 findings; descriptors: 76 valid: 76 invalid: 0`.

4. **Mirror sync (only if a mirror exists at merge time — see Finding A1-1).**
   If the canon build keeps a mirror: `cp -p packages/canon/tokens/tokens.dtc.json <mirror-path>` (or regenerate via the canon publish script).
   VERIFY: `sha256sum` of mirror == dtc file; if no mirror exists on disk, nothing to do (documented).

5. **Re-run the close-the-loop gates against REAL canon (runbook C-1 step 1):**
   - Regenerate fixtures from the merged real canon:
     `node design-workflow/V5-A-canon-sandbox/a5-fixtures.mjs /home/p31/production/packages/canon/tokens/tokens.dtc.json`
   - `node packages/design-core/scripts/token-audit.mjs` (cwd = design-core) → `Token audit OK`; plus the raw-hex gate on the merged canon itself: `mkdir -p /tmp/opencode/hexgate/tokens && cp -p packages/canon/tokens/tokens.dtc.json /tmp/opencode/hexgate/tokens/tokens.json && node packages/design-core/scripts/token-audit.mjs` (cwd = /tmp/opencode/hexgate) → `Token audit OK`.
   - `node design-workflow/V3-C-canon/validates-v3.mjs --fixture design-workflow/V5-A-canon-sandbox/fixtures/sandbox-brands-union.fixture.json` → PASS (fixture now generated FROM real canon post-merge; see Finding A6-1 for why the bare canon report is not used).
   - `node design-workflow/V3-D-resilience/policy-scan.mjs` → now 0 findings against real canon (was 70).
   - `node design-workflow/V2-C-ci/dtcg-shape-audit.mjs` → PASS (0 findings).
   - `node design-workflow/A-token-pipeline/tier-emitter.mjs` (regenerates dist from real canon) then `node design-workflow/V2-C-ci/cross-target-parity.mjs` → PASS (0 findings).
   - Negative controls (i)-(iii) MUST still fail (re-run against real-canon-derived fixtures/copy).
   VERIFY: every gate exit 0 (except the three negative controls, exit 1).

6. **Close the loop.** `node design-workflow/V4-run-all-gates.mjs` → exit 0, plus the three live-artifact checks per runbook C-1 step 4.

## Findings (filed, not fixed — none are blockers)

- **A1-1** — no `tokens.json` mirror exists in `packages/canon/tokens/` on disk
  (patch "applies-to" names one). Mirror convention rehearsed per v3.0 C3.
- **A2-1** — apply-patches.mjs:80 logs compact byte count, not written size
  (cosmetic; script read-only).
- **A6-1 (important for close-the-loop)** — `validates-v3.mjs:234` calls
  `checkVersionPolicy(name, undefined)` with a HARDCODED undefined, so the canon
  report will STILL print "0/11 brands adopted" even after step 3 lands
  versionPolicy in the packs. R6 works correctly in fixture mode (reads the
  brand field — this rehearsal's gate). Until the `brands/<name>/tokens.json`
  split lands, the close-the-loop R6 gate should use fixture mode on a
  fixture generated from the real canon (step 5), not the bare canon report.
  Fixing runReport:234 is a design-workflow edit for a future lane — out of
  this lane's boundary (would be a modification of a gate script).

## Deliverables present in V5-A-canon-sandbox/

A1-copy.log · A2-diff-summary.txt · A3-governance-decision.md ·
A3-brands-shape-manifest.json · A4-descriptors.log · tokens/ (patched +
mirror + resolved) · brands-rehearsal/ · fixtures/ (5) · gate-sources/ ·
neg-rawhex/ · a3-governance.mjs · a4-policy-descriptors.mjs · a5-fixtures.mjs ·
operator-apply-deltas.mjs · this report.

**RESULT: ALL GATES GREEN. ALL NEGATIVE CONTROLS FAIL AS DESIGNED. READY FOR OPERATOR MERGE.**