<!-- P31-HEADER
id: p31_fix_plan_device_css_deprecated_token_defaults_20261012_v1.0
type: fix-plan
component: packages/design-core
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: device.css tier defaults referenced deprecated tokens

**Discovered by:** agent:subagent:canon-v2 (the vessel-contract build)
**Discovered at:** 2026-10-12T00:00:00Z
**Severity:** low (the deprecated tokens still resolve at runtime, but the
deprecation gate fails the build on any consumer)

## The bug

`packages/design-core/src/css/device.css` (the W4 device-tiers layer) used two
deprecated tokens as its `[data-device-adaptive]` defaults:

- `--p31-tier-spacing: var(--p31-space-inline-md, 16px);`
- `--p31-tier-type: var(--p31-font-size-md, 16px);`

`--p31-space-inline-md` and `--p31-font-size-md` are marked `$deprecated`
(`packages/canon/deprecations.json`, "no consumer", removal in v1.0.0). The
deprecation gate (`scripts/check-deprecated-tokens.mjs`) fails the root gate
on these references.

## The fix (value-preserving)

Repointed to live tokens with the exact same 16px resolved value:

- `--p31-space-inline-md` → `--p31-space-4` (16px, canon v2 `BASE` token)
- `--p31-font-size-md` → `--p31-body` (16px, live type token)

Both edits keep the `16px` fallback and the tier remaps untouched — no
`p31.*` token path or value changed, no visual change on any tier.