# Loom — Service Token Rotation Runbook (security incident closure)

**Status:** ✅ **CLOSED 2026-09-23.** The Lumi service token was exposed in a
plaintext transcript (`downloads/Executing the review s fixes…txt`). The secret
was rotated via the Cloudflare API on 2026-09-23 and the Pages secret updated.
This runbook records how it was done and how to do it again.

## What was done (2026-09-23)

1. **Rotated the secret** via the API (account token with Access write scope):
   `POST /accounts/ee05f70c…/access/service_tokens/bb17c313-8929-4d60-9619-6ad5cf561a3d/rotate`
   → `client_secret_version` 1→2, same `client_id` `59a1cac5…`.
2. **Updated the Pages secret** `CF_ACCESS_CLIENT_SECRET` (wrangler pages
   secret put) — the client_id was unchanged, so `CF_ACCESS_CLIENT_ID` needed
   no change.
3. **Redeployed** the Pages project (a deploy applies the new secret).
4. **Verified**:
   - Old exposed secret (`cfast_bol8…`) → `HTTP 302` (rejected) ✅
   - New secret → `HTTP 200`, `/api/loom/verify` → `valid:true` (16 events) ✅

## How to do it again (if a future rotation is needed)

The rotation itself requires an **account-level API token with Access write
scope** (or the Zero Trust dashboard). The wrangler OAuth token is NOT
sufficient (verified `auth.forbidden` on service-token endpoints).

### Via API (account token with Access: Apps and Policies Write)

```bash
# 1. List service tokens to find the id (the client_id minus ".access" suffix
#    is NOT the API id; the API id is a UUID):
curl -s "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/access/service_tokens" \
  -H "Authorization: Bearer <ACCOUNT_TOKEN>" \
  | python3 -m json.tool
# 2. Rotate the secret:
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/access/service_tokens/<TOKEN_UUID>/rotate" \
  -H "Authorization: Bearer <ACCOUNT_TOKEN>" -H "Content-Type: application/json"
# 3. Update the Pages secret (from apps/loom):
printf '%s' '<new-client-secret>' | npx wrangler pages secret put CF_ACCESS_CLIENT_SECRET --project-name loom
# 4. Redeploy:
npx wrangler pages deploy dist --project-name loom
```

### Via dashboard (no token)

Cloudflare Dashboard → Zero Trust → Access → Service Auth → find
`lumi-write-2` → Rotate → copy the new secret → Pages → `loom` → Variables and
Secrets → update `CF_ACCESS_CLIENT_SECRET` → redeploy.

## Post-rotation verification

```bash
# New secret must work:
curl -s "https://loom.p31ca.org/api/loom/verify" \
  -H 'CF-Access-Client-Id: <client-id>' \
  -H 'CF-Access-Client-Secret: <new-secret>'
# → {"valid":true,...} HTTP 200

# Old secret must be rejected:
curl -s -o /dev/null -w "%{http_code}\n" "https://loom.p31ca.org/api/loom/verify" \
  -H 'CF-Access-Client-Id: <client-id>' \
  -H 'CF-Access-Client-Secret: <old-secret>'
# → 302 or 401 (NOT 200)
```

## Blast radius (what the old token could touch)

- **Write** to `/api/loom/event` (append to the hash chain) as
  `service:59a1cac5…` — append-only, no rewrite/delete; `/verify` detects
  tampering.
- **Read** `/api/loom/events` (shared + anonymous scope) and `/api/loom/verify`.
- No access to Pages secrets, D1 admin, or the dashboard itself.

## Checklist (current state — all done 2026-09-23)

- [x] Service-token secret rotated (`client_secret_version` 2)
- [x] `CF_ACCESS_CLIENT_SECRET` updated on Pages `loom`
- [x] Pages project redeployed
- [x] `/api/loom/verify` → `valid:true` with the new secret
- [x] Old secret → `HTTP 302` (rejected)