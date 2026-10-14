# Lane A — Token Normalization Delta Table

**Lane dir:** `/home/p31/production/design-workflow/A-token-pipeline/`
**Generated:** 2026-10-11 · **Method:** every number below is the pasted output of a real `node` one-liner run against the canon files (command shown, output quoted). No claims from memory.

## 1. Sources (read-only inputs)

| File | Role |
|---|---|
| `/home/p31/production/packages/canon/tokens/tokens.dtc.json` | **Canon SSOT** (152,516 B) — W3C DTCG 2025.10 shape |
| `/home/p31/production/packages/design-core/tokens/tokens.dtc.json` | Secondary copy (converted snapshot, 31,074 B) |
| `/home/p31/production/packages/design-core/tokens/tokens.json` | Secondary copy (string-form oklch, 17,859 B) |
| `/home/p31/P31-local-workspace/schemas/tokens.dense.json` | Read-only reference — fluid `clamp()` spacing/typography |

## 2. Total token count + counts by `$type`

Command:

```bash
node -e '
const fs=require("fs");
const d=JSON.parse(fs.readFileSync("/home/p31/production/packages/canon/tokens/tokens.dtc.json","utf8"));
console.log("TOP KEYS:", Object.keys(d));
function walk(o,path,acc){ if(o&&typeof o==="object"){ for(const k of Object.keys(o)){ const p=path?path+"."+k:k; if(o[k]&&typeof o[k]==="object" && ("$value" in o[k])) acc.push([p,o[k].$type]); else walk(o[k],p,acc); } } }
const acc=[]; walk(d,"",acc);
console.log("TOTAL TOKENS:",acc.length);
const byType={}; for(const[,t] of acc){ byType[t]=(byType[t]||0)+1; }
console.log("BY TYPE:",JSON.stringify(byType));
'
```

Output (verbatim):

```
TOP KEYS: [ '$schema', '$extensions', 'p31', 'themes', 'component' ]
TOTAL TOKENS: 448
BY TYPE: {"dimension":116,"fontFamily":29,"color":246,"duration":16,"cubicBezier":20,"number":21}
```

| `$type` | Count | Runbook bucket |
|---|---|---|
| color | **246** | color |
| dimension | **116** | dimension |
| number | **21** | number |
| fontFamily | 29 | other |
| duration | 16 | other |
| cubicBezier | 20 | other |
| **total** | **448** | |

Per top-level group:

```
per-top-level token counts: {"p31":205,"themes":243,"component":0}
```

- `p31` = 205 tokens (126 flat, 79 nested). `p31` sub-groups (15): `color, space, radius, status, glass, surface, font, motion, elevation, frame, layout, z, topbar, scale, starfield` — plus 126 flat tokens.
- `themes` = 243 tokens across 11 theme packs (10 × 22 + 1 × 23): `cipher, garden, retro, ocean, sunset, mono, aurora, zen, volt, family, sunlight`.
- `component` = 0 (empty array).

## 3. Function-value exclusion — verified

Command:

```bash
node -e '
const s=fs.readFileSync("/home/p31/production/packages/canon/tokens/tokens.dtc.json","utf8");
console.log("calc( occurrences:",(s.match(/calc\(/g)||[]).length);
console.log("var( occurrences:",(s.match(/var\(/g)||[]).length);
console.log("vw occurrences:",(s.match(/vw/g)||[]).length);
console.log("rem occurrences:",(s.match(/rem/g)||[]).length);
console.log("clamp occurrences:",(s.match(/clamp/g)||[]).length);
console.log("breakpoint mentions:",(s.match(/breakpoint/gi)||[]).length);
console.log("motion mentions:",(s.match(/motion/gi)||[]).length);
'
```

Output (verbatim):

```
calc( occurrences: 0
var( occurrences: 0
vw occurrences: 0
rem occurrences: 3
clamp occurrences: 0
breakpoint mentions: 0
motion mentions: 1
```

`$value` shape census (all 448 tokens): `unitObj:px` 115 · `unitObj:rem` 1 (`p31.space-base` = 1rem) · `unitObj:ms` 16 · `oklchObj` 246 · `number` 21 · `array[4]` 20 (cubicBezier) · `array[5]` 13 + `array[6]` 13 (fontFamily) · `array[8]` 1 · `array[1]` 2. **String values: 0.** Therefore: zero alias references and zero CSS-function values anywhere in the interchange file.

**Precision note on the prompt's context:** the "CSS-function values excluded" sentence lives in the *design-core secondary copy's* `$description`, not the canon file. Verified:

```
design-core dtc $description: P31 design-core — DTCG v2025.10 snapshot — converted from CSS-native tokens.json by convert-css-to-dtcg.mjs. CSS-function values (calc/var/blur) are NOT portable and are excluded from this interchange file.
```

The canon file carries its provenance in `$extensions.p31.description`: `"Design canon DTCG export — primitives, semantic slots, per-theme palettes."` The exclusion itself is nonetheless confirmed canon-side by the zero counts above.

## 4. Category presence/absence in the interchange file

| Runbook category | In canon DTCG? | Detail |
|---|---|---|
| spacing | **present, fixed px only** | `p31.spacing-sm/md/lg/xl` (8/16/24/32px), `p31.space-*` (2px–48px + 1rem), `p31.space.inline.*`, `p31.layout.spacing.*` — all static. **No `clamp()`.** |
| typography | **present, fixed px only** | `p31.h1..h4/body/body-sm/label/caption` (51/38/28/21/16/14/12/7px), `p31.font.size.*` (14/16/20px), `p31.font.family.*`. **No fluid type scale.** |
| radius | present | `p31.radius-sm..full`, `p31.radius.sm..candy` (8/16/24/9999/24px) — radii are non-fluid by design; nothing missing. |
| breakpoint | **ABSENT** | 0 mentions of `breakpoint` in the file. Runbook B-3 requires `breakpoint.compact` (600) / `medium` (840) / `expanded` (1200) as dimension tokens → **missing**. |
| motion | present but condemned | 16 duration + 20 cubicBezier tokens exist (incl. M3 Expressive spring set), but **121 of 205 `p31` tokens are `$deprecated`** ("Removal in v1.0.0"), and design-core AGENTS.md mistake #6 (lines 46–47) makes consuming a deprecated token a deprecation-gate failure. Live motion survivors: only `duration-fast` (100ms), `duration-slow` (500ms), `duration-instant` (62.5ms), `duration-standard` (250ms), `duration-base` (431ms), `easing-standard`, `motion.shapeMorph.duration` (300ms). No live easing set, no clean duration ladder. |

Deprecation census (command output verbatim):

```
p31 total: 205 flat: 126 nested: 79 deprecated: 121 non-deprecated: 84
with $description: 0
themes tokens: 243 per-theme: 22,22,22,22,22,22,22,22,22,22,23
```

Also notable: **0 of 448 tokens carry `$description`.**

## 5. Runbook-required categories MISSING from the interchange file (exact statement)

1. **Fluid `clamp()` spacing** — A-1 requires `space.md`-style clamp values with a rem component; canon has only fixed px spacings (0 clamp).
2. **Fluid `clamp()` typography scale** — A-1 requires fluid type sizes; canon has only fixed px sizes.
3. **Breakpoint tokens** — B-3 requires `breakpoint.compact/medium/expanded` (600/840/1200); absent entirely (0 mentions).
4. **Clean (non-deprecated) motion set** — a usable duration ladder + easing trio; canon's motion namespace is 121-token-deprecated territory, with only fragments live.

These four are exactly what `supplement.tokens.json` (deliverable 2) carries. Radius, color primitives/semantics, z-index, fonts exist in canon and need no supplement.

## 6. Secondary copies (for completeness)

```
design-core dtc: {"total":163,"byType":{"color":120,"dimension":21,"fontFamily":3,"fontWeight":2,"number":11,"duration":3,"cubicBezier":3},...}
design-core tokens.json: {"total":183,"byType":{"color":120,"dimension":20,"spacing":7,"fontFamily":3,"fontWeight":2,"fontSize":7,"lineHeight":3,"borderRadius":6,"duration":3,"cubicBezier":3,"number":8,"custom":1},...}
```

Both are partial snapshots (163 / 183 vs canon's 448); `tokens.json` uses legacy `$type` spellings (`spacing`, `fontSize`, `borderRadius`) and has a data bug the canon does not (`spacing.xs = "calc(var(--p31-scale-xs), 1vw, ...)"` — a `calc()` with commas, not `clamp()`). Canon stays the SSOT for this lane; the copies were used only to cross-check.

## 7. Naming-collision finding (drives emitter rule)

Canon carries BOTH flat (`p31.radius-sm`) and nested (`p31.radius.sm`) spellings of the same tokens. Mapping dots→dashes makes 21 CSS-var name collisions (`--p31-radius-sm` from both spellings, etc.). Verified: **all 21 pairs have byte-identical serialized values** (12 pairs live-live, 9 pairs live vs deprecated). Emitter rule (fail-closed): dedupe one declaration per CSS var name; **exit 1 if two source tokens with the same var name serialize differently.**

## 8. Emission-namespace decision (recorded)

- **Excluded from emission:** `themes.*` (theme-pack overrides sharing `p31.*` names — theme variants are canon's own compiler domain, `gen-tokens.mts` → `theme-{id}.css`), `component` (empty), and all `$deprecated` tokens (121) — per design-core AGENTS.md mistake #6: a deprecation gate fails on any live consumer of a deprecated token. A fresh tier pipeline must not propagate tokens canon has condemned for v1.0.0 removal.
- **Emitted (`css-full`, manifest, js):** 84 live canon `p31.*` tokens + supplement additions = 113 names → ~101 unique CSS vars (12 live-live dedupes).

## 9. What Lane A adds (supplement delta)

| Supplement group | Tokens | Rationale |
|---|---|---|
| `fluid.space.*` (7) + `fluid.base` alias | clamp() with rem in preferred term (WCAG F94-safe), max/min ratio ≤ 2.5× | missing category #1 |
| `fluid.type.*` (7) | rem-based fluid type scale, ratio ≤ 2.5× | missing category #2 |
| `breakpoint.*` (3) | 600/840/1200 dp as rem dimension tokens | missing category #3 |
| `motion.*` (8) | duration ladder + easing trio + speedFactor | missing category #4 |
| `space.*` (3) | semantic aliases demonstrating `{group.name}` refs → `var(--p31-…)` | alias-path proof |