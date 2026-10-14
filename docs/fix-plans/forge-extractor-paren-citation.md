# fix: forge extract-claims parenthetical citations never match (0 claims extracted)

<!-- P31-HEADER
id: p31_fix_plan_forge_extractor_paren_citation_20261012_v1.0
type: fix-plan
component: software/p31-forge/scripts/extract-claims.mjs
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

## Symptom

Running the forge research-report pipeline on a new session
(`/tmp/phos-jitterbug/btc-callkit`, the Big Think Capital bridge-funding call
kit) extracted **0 claims**: `claims extracted: 0 synthesis + 0 facet`.

The convergence markdown cites sources in the form the module's own doc
comment promises — "a parenthetical citation" — e.g. `ineligible (SBA 2026).`
Yet none matched.

## Evidence

`extract-claims.mjs` defines:

```js
const CITATION_RE =
  /\b(FIPS[\s-]*[\d.\/-]+)\b|\b(WCAG[\s-]*[\d.]+)\b|\b(NIST\s*[A-Z]*[\s-]?[\d-]*)\b|\b(ISO[\s-]*\d+)\b|\b(?:\(([A-Z][A-Za-z][^()]*?\d{4}[^()]*?)\))\b|\[(\d+)\]/g
```

The parenthetical alternative is wrapped in `\b ... \b`. `(` and `)` are
non-word characters, and they are preceded/followed by spaces or punctuation
(also non-word), so a `\b` boundary can never exist on either side.

Empirical test (node, 2026-10-12):

| Input | Match |
|---|---|
| `nonprofits are explicitly ineligible (SBA 2026).` | none |
| `explicitly ineligible (SBA 2026) under the rules.` | none |
| `ineligible (SBA 2026)under the rules.` | none |
| `the study (Mordor Intelligence 2024) found X.` | none |
| `FIPS 204 mandates ML-DSA.` | `FIPS 204` ✓ |
| `NIST SP 800-208 is the standard.` | `NIST SP 800-208` ✓ |
| `see [3] for details.` | `[3]` ✓ |

Only the FIPS/WCAG/NIST/ISO and `[n]` alternatives ever match. The doc comment
("author-year, an uppercase name ... or a parenthetical citation") overstates
the implemented behavior.

## Fix

Replace the `\b` boundaries on the parenthetical alternative with a
whitespace/start anchor on the leading side and no trailing boundary:

```js
const CITATION_RE =
  /\b(FIPS[\s-]*[\d.\/-]+)\b|\b(WCAG[\s-]*[\d.]+)\b|\b(NIST\s*[A-Z]*[\s-]?[\d-]*)\b|\b(ISO[\s-]*\d+)\b|(?:^|\s)\(([A-Z][A-Za-z][^()]*?\d{4}[^()]*?)\)|\[(\d+)\]/g
```

Group numbering is unchanged (group 5 stays the parenthetical source), so the
`(m[1] || m[2] || ... || m[6])` consumer is unaffected.

## Verification

1. Re-run `node scripts/extract-claims.mjs --session btc-callkit --out /tmp/report/claims.json`
   → **12 synthesis claims extracted** (was 0), each carrying the `(Source 2026)` group.
2. Full report chain re-run 2026-10-12: verify (12/12 VERIFIED against
   CITATION_LEDGER funding-bridge section) → render → check-report gate PASS
   (FK 6.9 ≤ 10) → render-pdf (chromium) → check-layout PASS (13 pages, no
   widow/orphan/cover-leak). Output: `/home/p31/BIG-THINK-CALL-KIT.pdf`.
3. Standards markers unaffected (FIPS/NIST/ISO/WCAG alternatives untouched;
   unit behavior spot-checked via node regex probe).

**Also repaired in this session:** `software/p31-forge/node_modules/marked`
was a dangling symlink (→ `marked@18.0.14`, absent from the pnpm store).
Repointed to the store's `marked@16.4.2`; render-report works. Note for a
future `pnpm install` pass in the forge package.

## Rollback

Revert the one-line `CITATION_RE` change; no other file is touched.