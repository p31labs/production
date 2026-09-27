# 08 — Deployment

## Entry

`/home/p31/production/portals/deploy-unified.mjs` → the `qpj` portal in `PORTALS`:

```js
qpj: {
  subdir: 'qpj',
  domain: 'qpj.p31ca.org',        // ⚠ custom domain bound in dashboard (Cloudflare API rejects this TLD)
  project: 'p31-portal-qpj',
  type: 'react',
  sentryProject: 'qpj-portal',
  port: 5196,
  entryHtml: 'index.html',
  manualChunks: ['src/machines/modeGate.ts', 'src/store/useQpjStore.ts', 'src/lib/routes.ts'],
 },
 ```

Deploy paths (wrangler v4, manual):

```bash
wrangler pages project create p31-portal-qpj --production-branch main
wrangler pages deploy ./dist --project-name p31-portal-qpj --branch main
# Custom domain: bind in the Cloudflare dashboard — qpj.p31ca.org is not API-creatable via wrangler
```

`p31-portal-qpj` is live at `https://b3c8c15b.p31-portal-qpj.pages.dev` (deployed 2026-09-12).
`dist/` must include `_redirects` (`/* /index.html 200`) for SPA hash routing on Pages.

## Current state

- Project `p31-portal-qpj` created and deployed via `wrangler pages deploy`.
- Live at `https://b3c8c15b.p31-portal-qpj.pages.dev` (HTTP 200, `/workshop` hash route 200).
- Custom domain `qpj.p31ca.org` — bind in the Cloudflare dashboard (user). The API returned `invalid TLD`; the dashboard can bind it against the account's `p31ca.org` zone.

## Pipeline

1. `pnpm install` (inside the portal — shielded by its own `pnpm-workspace.yaml`).
2. `pnpm run build` (runs `prebuild` → `public/routes.json`, then `vite build`).
3. Stage `dist/` into `/tmp/p31-portal-deploy/qpj`, inject `/assets/p31-ui.umd.js`,
   emit `wrangler.toml` (Pages, `compatibility_date 2026-07-29`, observability on).
4. `wrangler pages deploy … --project-name=p31-portal-qpj --branch=main`.

## Vendor gate

`pnpm v:gate` → `tools/portal-vendor-sync/v-gate.mjs` asserts installed packages are
canonical: `@p31/design-core@2.3.0`, `@p31/ui@1.3.1` (from `vendor/*.tgz`). All four
portals (qpj, chat, design, template) currently pass. Tarballs live in each portal's
`vendor/`; bump = copy new tarball → re-install (see `CLAUDE.md` gotchas).

## Domains

| portal | domain | project |
|---|---|---|
| qpj | `qpj.p31ca.org` (bound) | `p31-portal-qpj` |
| chat | — | `p31-portal-chat` |
| design | `design.p31ca.org` | `p31-portal-design` |
| willow/tetra/sixseven/meatspace | `.p31ca.org` | legacy persona portals |

## Before a release

`pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm v:gate` and a dry-run
stage (currently green for qpj: 1 staged / 0 failed). Then deploy
`qpj` only and smoke `https://<pagesURL>`; bind
`qpj.p31ca.org` → project before announcing the domain as stable.