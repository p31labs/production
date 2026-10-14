# B — Device-Tier Contract: Interfaces

Lane B ships the tier contract. This file is the consumption contract for
Lane A (token pipeline) and the shell/MCP (runtime). One source, many consumers
(runbook §3, Law 1).

## Files in this lane

| File | Role |
|---|---|
| `device-tiers.json` | The manifest contract — four tiers, capability→tier mapping (runbook §6 B-1) |
| `device-tiers.mjs` | Pure ESM resolver, zero deps. Reads the manifest, never re-declares it |
| `breakpoints.tokens.json` | DTCG dimension tokens for the window size classes (§6 B-3) |
| `device-tiers.test.mjs` | The tier-resolver gate — `node --test` |
| `negative-control.mjs` | Proven failing copy (flags.coarse sabotaged). Must fail: `node --test negative-control.mjs` |

---

## 1. For Lane A (token pipeline / tier-emitter)

### Breakpoint tokens — path and merge note

Lane A's Style Dictionary v4 config should include this file BY REFERENCE:

```jsonc
// style-dictionary.config.mjs — source list excerpt
sources: [
  'tokens/**/*.tokens.json',                        // A's canonical set (source of truth)
  '../B-device-tiers/breakpoints.tokens.json',      // B's supplement
]
```

**Merge note (binding):**
- **Canon is the source of truth.** `breakpoints.tokens.json` is a SUPPLEMENT,
  not a second canon. If a breakpoint already exists in A's canonical token
  tree, A's value wins and this file must be deleted from B — there is one
  definition, one place (runbook Law 1, §11.1 "ONE SOURCE").
- If A's tree has no `breakpoint.*` group, this file IS the definition; do not
  copy the values into A's tree, reference the file.
- The three tokens define the only breakpoints. Component CSS must consume the
  emitted `--p31-breakpoint-*` rem custom properties — **no hardcoded
  breakpoints** (Law 7; runbook §6 B-3). Media queries stay `min-width` only,
  rem-based (runbook §2.3).
- DTCG shape is v4-safe: `$type: "dimension"`, string px `$value`,
  `$description`, `$extensions.remValue` (runbook §2.1: no 2025.10-only
  features until SD v5).
- Expected emission (16px root): `--p31-breakpoint-compact: 37.5rem;`
  `--p31-breakpoint-medium: 52.5rem;` `--p31-breakpoint-expanded: 75rem;`.

### Tier manifest — what A's platform filters may use

A's `css-mobile` / `css-full` / `embedded-css` platform split is named by
`delivery` in `device-tiers.json`. If A's config wants to filter by tier, it
should import the manifest and iterate `TIERS[tier].delivery` — never
hardcode platform names (one source).

---

## 2. For the shell / MCP (runtime consumers)

### Resolver call

```js
import { resolveDeviceTier, resolveEmbedded, TIERS } from '/home/p31/production/design-workflow/B-device-tiers/device-tiers.mjs';

// Web surface (browser media queries supply the input):
const r = resolveDeviceTier({
  widthDp: window.innerWidth,                 // number, dp
  pointer: matchMedia('(pointer: coarse)').matches ? 'coarse'
         : matchMedia('(pointer: fine)').matches   ? 'fine'
         : 'none',                            // 'mixed' only from platforms that report it
  hover: matchMedia('(hover: hover)').matches ? 'hover' : 'none',
});
// -> { tier, windowSizeClass, touchTargetMin, navigation, delivery,
//      flags: { coarse, fine, canHover } }

// Embedded surface (Node Zero — explicit hardware context):
const e = resolveEmbedded();
// -> { tier: 'embedded', windowSizeClass: null, touchTargetMin: 44,
//      navigation: 'minimal-html', delivery: ['embedded-css','lvgl-c'],
//      flags: { coarse: null, fine: null, canHover: null } }
```

### Rules consumers MUST honor

1. **Flags never override the tier.** `tier`/`windowSizeClass` come from width
   alone (M3: <600 compact, 600–839 medium, ≥840 expanded). Use `flags` for
   capability decisions only (runbook §2.5, §6 B-2).
2. **The coarse tension (the gate's core).** When `flags.coarse` is true,
   apply the 44px touch floor even if the tier says 34 (desktop + touchscreen
   Chromebook — the operator's own dev box). The resolver deliberately does
   NOT auto-swap `touchTargetMin`; it surfaces the flag so the *consumer* is
   the one that reconciles. A consumer that ignores `flags.coarse` on a
   coarse device reintroduces the exact bug `negative-control.mjs` proves.
3. **Fail closed.** Unknown pointer/hover values throw `TypeError` — treat a
   throw as "ask a human", never catch-and-guess (runbook §11.10).
4. **Embedded is opt-in.** `resolveDeviceTier` never returns `embedded`;
   callers of the web path cannot accidentally classify a browser as hardware.
5. **Introspection:** `TIERS` is the frozen manifest tiers object;
   `MANIFEST` is the full frozen manifest (version, $schema, rationale).

### MCP exposure (Lane E wires this)

Proposed surface (Lane E implements): `resolve_device_tier({ width_dp,
pointer, hover })` returning the resolver shape verbatim, and
`get_tier_tokens(tier)` returning `TIERS[tier]`. No new logic in E — call B's
resolver directly (one source, runbook §9 E-3).

---

## 3. Contract invariants (checked by the gate)

- Resolver output for tier fields equals the manifest values (integrity test).
- Breakpoint token px values equal the manifest's `breakpointMinDp` /
  `breakpointMaxDp` (integrity test).
- `flags.coarse` is true whenever pointer is coarse or mixed — the
  negative-control assertion that `negative-control.mjs` proves fail-able.
## Integration note (2026-10-11)
`breakpoints.tokens.json` deleted per this files