# LOOM → Workers-with-assets migration (documented, deferred)

**Status**: deferred — the URL fallback works, the current architecture is
stable. Revisit when (a) a second service binding is needed, or (b) preview-URL
leakage becomes a real concern.

## Why

Cloudflare Pages Functions **ignore the `services` block in `wrangler.toml`** —
service bindings for Pages live in the Pages project's deployment config
(dashboard/API), not source-controlled. This was confirmed live:
`production.services` is `undefined` on the Loom Pages project, which is why
`guardAgentEvent` uses the `LOOM_SSE_URL` + secret fallback (the same path
`/stream` uses). The `env.LOOM_SSE` branch in the guard is **dead on Pages**
and is retained only for a future Workers host.

The strategic fix is the 2026 Cloudflare pattern: a **Worker with a
static-assets binding** (service bindings are natively authoritative, one
`wrangler deploy`, no per-deployment preview-URL leak — Workers previews live at
`<name>-<account>.workers.dev/<version>`, not public `<hash>.pages.dev` URLs).

## Target shape

```toml
# apps/loom/wrangler.toml (Workers form)
name = "loom"
main = "worker/index.ts"
compatibility_date = "2026-07-04"
assets = { directory = "./dist", binding = "ASSETS", not_found_handling = "single-page-application" }

[[d1_databases]]
binding = "LOOM_D1"   # same database_id

[[services]]
binding = "LOOM_SSE"
service = "loom-sse"
```

## Migration steps (when it happens)

1. Fold `functions/api/loom/**` `onRequest*` handlers into a `worker/index.ts`
   fetch router (they are already `PagesFunction` handlers with a `context.env`
   — mechanical).
2. Drop `wrangler pages deploy` for `wrangler deploy` (one command).
3. The `LOOM_SSE` service binding becomes real → the guard can drop the URL
   fallback (or keep it as belt-and-suspenders).
4. Move the Access application to the new hostname (Workers route/custom domain)
   — Access is hostname-scoped.
5. Re-run the PIP drill, the refusals chain tests, and the live verification.

## Risks

- Access hostname change (users get a new URL or a redirect must be added).
- The `worker/worker-configuration.d.ts` regenerates (run `wrangler types`).
- The Backup worker and the SSE worker are unaffected.

## Deferral note

The URL fallback is documented in `docs/GOVERNANCE.md` §3 as the active path;
`env.LOOM_SSE` is dead-on-Pages, not a bug. Nothing is blocked until a second
service binding is needed.