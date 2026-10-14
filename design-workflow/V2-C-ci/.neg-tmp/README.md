# .neg-tmp — negative-control fixtures (evidence chain)

Negative-control fixtures for V2-C-ci gates. Each dir is a planted-sabotage
copy of the real sources. Regenerate with:

```
cd /home/p31/production/design-workflow/V2-C-ci
mkdir -p .neg-tmp/<case> && cp /home/p31/production/packages/canon/tokens/tokens.dtc.json .neg-tmp/<case>/tokens.dtc.json && cp /home/p31/production/design-workflow/A-token-pipeline/supplement.tokens.json .neg-tmp/<case>/supplement.tokens.json && cp /home/p31/production/design-workflow/B-device-tiers/breakpoints.tokens.json .neg-tmp/<case>/breakpoints.tokens.json
```

| Dir | Sabotage | Gate | Expected |
|---|---|---|---|
| nc1-missing-type | `fluid.space.lg.$type` deleted | C-2 | exit 1 — "token without string $type" |
| nc2-broken-alias | `fluid.space.md.$value = "{nonexistent.token}"` | C-2 / C-1 | exit 1 — "unresolved alias reference" |
| nc3-deprecated-ref | `fluid.base.$value = "{p31.accent-alt}"` (deprecated) | C-2 | exit 1 — "live token references deprecated token" |
| dist-deleted | copy of A dist with `--p31-neon:` deleted from css-full | C-3 | exit 1 — "missing emitted CSS var --p31-neon" |

Logs: `ci-normal.log` (exit 0), `ci-expectfail.log` (exit 1),
`ci-sabotaged.log` (exit 1, planted broken token through --sources).