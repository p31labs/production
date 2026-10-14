# Lane A — Style Dictionary v4 Upgrade Path (recorded decision)

**Decision (settled — recorded, not relitigated):** do NOT install Style Dictionary.
This lane ships a native zero-dependency tier emitter (`tier-emitter.mjs`). This note
documents why, and the exact SD v4 path for when the constraint lifts.

## 1. Why SD v4 is not used now

| Reason | Evidence |
|---|---|
| **Disk at 97%** (5.6 GB free, per `production/STATE.md` blockers) | `npm install style-dictionary` is a new dependency; this run's hard boundary: zero new dependencies, no installs. |
| **Canon already owns a compiler** | `/home/p31/production/packages/design-core/scripts/gen-tokens.mts` (custom TS, emits CSS vars + DTCG). Introducing SD would create a third compiler and drift risk against the canon pipeline. |
| **Canon is read-only for us** | `packages/design-core/AGENTS.md:54–55` mistake #10: "Editing `packages/canon` or `packages/design-core` to work around a gap — that is a contribution proposal, not a fix in place." Wiring SD into either package would violate it; lane outputs stay under `design-workflow/A-token-pipeline/`. |
| **The DTCG gap is value-shaped, not compiler-shaped** | The canon DTCG file excludes CSS-function values (0 `calc`/`var`/`clamp` — delta-table.md §3). SD would faithfully emit *fixed* values from canon alone; the missing fluid/breakpoint/motion categories need authoring (supplement), not a fancier compiler. A 200-line native emitter covers that today. |

## 2. What the SD v4 config would look like

SD v4 is ESM-only and DTCG-native. When the install constraint lifts (disk), the
config below replaces `tier-emitter.mjs` verbatim-equivalently — same five outputs,
same subset filters, `outputReferences: true` everywhere to preserve `var(--p31-…)`
alias chains (runbook §2.2):

```js
// style-dictionary.config.mjs  (SD v4, ESM) — upgrade path, NOT built today
export default {
  source: [
    'tokens/canon.tokens.json',      // merged canon + supplement, v4-safe DTCG shape
    'tokens/supplement.tokens.json',
  ],
  platforms: {
    'css-full': {
      transformGroup: 'css',
      outputReferences: true,
      files: [{ destination: 'dist/css-full/tokens.css', format: 'css/variables' }],
    },
    'css-mobile': {
      transformGroup: 'css',
      outputReferences: true,
      filter: tierFilter('mobileCritical'),          // subset filter (A-4)
      files: [{ destination: 'dist/css-mobile/tokens.mobile.css', format: 'css/variables' }],
    },
    'embedded-css': {
      transformGroup: 'css',
      outputReferences: true,
      filter: tierFilter('embedded'),
      files: [{ destination: 'dist/embedded/tokens.min.css', format: 'custom/minified-css' }],
    },
    'js': {
      files: [{ destination: 'dist/js/tokens.mjs', format: 'javascript/esm' }],
    },
    'lvgl-c': {                                       // Lane D consumes this later
      files: [{ destination: 'dist/lvgl/p31_theme.h', format: 'custom/lvgl' }],
    },
  },
};

// tierFilter reads tier-config.json token name lists (same source the native
// emitter uses) — tiers stay SUBSETS of one source, never forks (Seven Laws #3).
```

Migration mapping from today's native emitter → SD v4:
`tier-emitter.mjs` serialize() → SD `css` transforms · alias `{a.b.c}` → `outputReferences: true` ·
`tier-config.json` → SD `filter` per platform · manifest → SD `json` custom format ·
gz budget gate → CI step on `dist/embedded/tokens.min.css` (unchanged).

## 3. DTCG caveat (do not block on v5)

- SD v4 has first-class DTCG support, but **full 2025.10-format support is WIP in SD v5** (runbook §2.1, verified). Our canon declares `$schema: https://design-tokens.org/schemas/format/2025.10` and uses 2025.10-style `$value` objects (`{value, unit}`, OKLCH `{colorSpace, components, alpha}`).
- This lane therefore normalizes to a **v4-safe DTCG shape now**: `$type` on every token, `{a.b.c}` alias refs, string `$value` for CSS passthrough (oklch/clamp verbatim) — all features SD v4's DTCG parser handles today.
- When SD v5 lands with full 2025.10 support: the supplement merges into canonical `tokens/*.tokens.json` (runbook A-1), the `$schema` stays 2025.10, and the platforms above carry over unchanged. Nothing in this lane's output shapes needs to change; only the compiler swaps.

## 4. What is NOT in scope of this note

- Style Dictionary install / `package.json` changes (forbidden this run: disk + zero-dep rule).
- Editing canon or design-core packages (AGENTS.md mistake #10 — contribution proposal territory, not lane work).
- The `lvgl-c` platform (Lane D's deliverable; config shown only as the seam).