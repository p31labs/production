# p31-forge-render — deploy runbook

## What this is

The production render path for workspace.p31ca.org: Document IR → template →
theme → HTML → **PDF (Cloudflare Browser Run)** or **DOCX (pure-JS docx)**.
The local `render-doc.mjs` CLI in `software/p31-forge` remains the development
and fixture-test path; this worker is the edge path.

## Prerequisites

- **Workers Paid plan** ($5/mo — the existing plan). Browser Run is included:
  10 browser-hours/month, then $0.09/hr. The free plan (10 min/day) is a trial
  tier and cannot host this service.
- Zero Trust org for Access service tokens (strict mode on by default for orgs
  created after 2026-10-05).

## Setup (one-time)

1. **Browser binding** — dashboard: Workers & Pages → `p31-forge-render` →
   Settings → Bindings → Add → **Browser Rendering**, name it `BROWSER`.
   Then uncomment the `[[browser]]` block in `wrangler.toml`.

2. **Install the Playwright fork** (needed only at deploy time):
   `npm install @cloudflare/playwright`

3. **Deploy**:
   `npx wrangler deploy` (or `npm run deploy`)

4. **Access service token** — Zero Trust → Access → Service Auth → create a
   token; add an Access Application on the worker route with an Include rule
   for the token. The workspace Pages Function holds the token as env vars
   `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` and sends the headers
   automatically (already wired in `functions/api/forge/[[path]].ts`).
   Strict service-token auth (401/403 instead of login redirect) is the
   default for orgs created after 2026-10-05 — verify it's on.

5. **Workspace env** — Pages dashboard: set `FORGE_RENDER_ORIGIN` to
   `https://p31-forge-render.<subdomain>.workers.dev`. The proxy already
   routes `/api/forge/render*` there.

6. **Optional — R2 artifact storage (recommended)**:
   ```bash
   npx wrangler r2 bucket create p31-forge-artifacts
   npx wrangler secret put R2_ACCESS_KEY_ID    # R2 API token
   npx wrangler secret put R2_SECRET_ACCESS_KEY
   npx wrangler secret put R2_ACCOUNT_ID
   npx wrangler secret put R2_BUCKET           # "p31-forge-artifacts"
   ```
   Uncomment the `[[r2_buckets]]` block in wrangler.toml and redeploy. With
   the secrets present, `/render` returns `{ url, key, bytes }` with a
   15-minute presigned URL instead of streaming bytes; the workspace client
   already handles both shapes. Add an R2 lifecycle rule: delete objects
   after 24 hours.

## Smoke test

```bash
curl -X POST https://<worker>/render \
  -H 'content-type: application/json' \
  -d @fixtures/letter.json -o letter.pdf
curl -X POST https://<worker>/render/docx \
  -H 'content-type: application/json' \
  -d @fixtures/letter.json -o letter.docx
```

Then open the workspace → Docs → Export PDF / Export DOCX.

## What is verified here vs at deploy

- ✅ Verified locally: IR validation, HTML build (parity PDF via local
  chromium), DOCX generation, all 11 fixtures, workspace gates green.
- ⚠️ Deploy-time only: the Browser Run binding (needs a live account), Access
  auth, live latency/limits. First deploy: check one PDF byte-for-byte against
  `/tmp/report/worker-parity.pdf` from the local run.

## Limits to respect

- Browser time: 10 h/mo on Paid. A typical render is 2–5 s of browser time.
- `browser.close()` is mandatory — pooled instances consume quota otherwise
  (already handled in `renderPdf`).
- The HTML is passed inline; keep documents under ~30 MB (images should go to
  R2 first — not yet wired; see the commented R2 block in wrangler.toml).