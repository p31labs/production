#!/usr/bin/env bash
# create-loom-access-app.sh — the operator step for putting the Loom behind
# Cloudflare Access. The wrangler OAuth token is READ-ONLY for Access (writes
# return 1010 auth.forbidden), so this needs a dedicated API token with
# "Access: Apps and Policies Edit". Create it in the Cloudflare dashboard
# (My Profile → API Tokens → Create Token → Custom Token), run this once, then
# delete the token.
#
# Usage:
#   CLOUDFLARE_API_TOKEN=<token> ./scripts/create-loom-access-app.sh
#   CLOUDFLARE_API_TOKEN=<token> ./scripts/create-loom-access-app.sh --allow-emails=a@x.com,b@x.com
#   CLOUDFLARE_API_TOKEN=<token> ./scripts/create-loom-access-app.sh --with-service-token [--store-secrets]
#
# Access policies combine `include` entries as an OR. The app's Allow policy
# defaults to `everyone` = any user who can authenticate via a configured IdP
# (the org's whole user population — correct only for a family-owned account;
# use --allow-emails to scope it). The Lumi service-token policy includes ONLY
# the service token (no everyone clause), so it adds real authorization.
#
# Outputs: the Access app AUD (paste into wrangler.toml [vars]) and, with
# --with-service-token, the service-token client_id/client_secret (shown once).
set -euo pipefail

ACCOUNT="ee05f70c889cb6f876b9925257e3a2fa"
TOKEN="${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN (Access: Apps and Policies Edit)}"
BASE="https://api.cloudflare.com/client/v4/accounts/$ACCOUNT"

# Parse args
ALLOW_EMAILS=""
WITH_SERVICE_TOKEN=0
STORE_SECRETS=0
while [ $# -gt 0 ]; do
  case "$1" in
    --allow-emails) ALLOW_EMAILS="$2"; shift 2 ;;
    --with-service-token) WITH_SERVICE_TOKEN=1; shift ;;
    --store-secrets) STORE_SECRETS=1; shift ;;
    *) echo "unknown arg: $1"; exit 2 ;;
  esac
done

echo "→ Creating the Loom Access application (covers preview URLs under one AUD)…"
APP=$(curl -s -X POST "$BASE/access/apps" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Loom","domain":"loom-8z0.pages.dev","type":"self_hosted","session_duration":"24h","preview_urls_enabled":true,"app_launcher_visible":false}')
AUD=$(echo "$APP" | python3 -c "import sys,json;print(json.load(sys.stdin)['result']['aud'])" 2>/dev/null)
if [ -z "$AUD" ]; then echo "✗ app creation failed:"; echo "$APP" | python3 -c "import sys,json;[print(' ',e['code'],e['message']) for e in json.load(sys.stdin)['errors']]" 2>/dev/null; exit 1; fi
APP_ID=$(echo "$APP" | python3 -c "import sys,json;print(json.load(sys.stdin)['result']['id'])")
echo "  aud: $AUD"
echo "  app_id: $APP_ID"

# Allow policy — scoped to emails when given; otherwise EVERYONE (warn loudly).
# NOTE: policies MUST be created under /access/apps/{app_id}/policies. The
# top-level /access/policies endpoint creates ORPHAN policies with no app
# attachment (app_id comes back empty) — the app then has NO allow policy and
# locks everyone out (found the hard way, 2026-09-22).
if [ -n "$ALLOW_EMAILS" ]; then
  INCLUDE_JSON=$(python3 -c "
import json,sys
emails=sys.argv[1].split(',')
print(json.dumps([{'email':{'email':e}} for e in emails]))" "$ALLOW_EMAILS")
  echo "→ Adding Allow policy for: $ALLOW_EMAILS"
else
  INCLUDE_JSON='[{"everyone":{}}]'
  echo "→ Adding Allow policy: EVERYONE (any user who can authenticate via a configured IdP)."
  echo "  For a family-only org this is fine; use --allow-emails to scope it."
fi
curl -s -X POST "$BASE/access/apps/$APP_ID/policies" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"Allow family\",\"decision\":\"allow\",\"include\":$INCLUDE_JSON}" \
  >/dev/null && echo "  policy added (attached to app $APP_ID)"

if [ "$WITH_SERVICE_TOKEN" = "1" ]; then
  echo "→ Creating the Lumi service token (server-side writes)…"
  ST=$(curl -s -X POST "$BASE/access/service_tokens" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"name":"lumi-write"}')
  CLIENT_ID=$(echo "$ST" | python3 -c "import sys,json;print(json.load(sys.stdin)['result']['client_id'])" 2>/dev/null)
  CLIENT_SECRET=$(echo "$ST" | python3 -c "import sys,json;print(json.load(sys.stdin)['result']['client_secret'])" 2>/dev/null)
  if [ -z "$CLIENT_ID" ]; then echo "✗ service token failed:"; echo "$ST" | python3 -c "import sys,json;[print(' ',e['code'],e['message']) for e in json.load(sys.stdin)['errors']]" 2>/dev/null; exit 1; fi
  echo "  client_id: $CLIENT_ID"
  echo "  client_secret: $CLIENT_SECRET   ← shown once; store as a secret"
  # Policy scoped to the service token ONLY (no everyone clause — the include
  # array is an OR, so adding everyone would make the token grant meaningless).
  # ACTION MUST BE "non_identity" (Service Auth), NOT "allow": Access evaluates
  # Service Auth policies FIRST (before any Allow policy), which is what lets a
  # service token authenticate without an IdP login. With "allow" the token is
  # treated as an Allow-policy match and the alias 302s to the IdP login
  # (verified the hard way, 2026-09-22 — the fix was decision:"non_identity").
  echo "→ Scoping the Lumi policy to the service token only (Service Auth)…"
  curl -s -X POST "$BASE/access/apps/$APP_ID/policies" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"Lumi writes events\",\"decision\":\"non_identity\",\"include\":[{\"service_token\":{\"token_id\":\"$CLIENT_ID\"}}],\"precedence\":1}" \
    >/dev/null && echo "  policy added"
  if [ "$STORE_SECRETS" = "1" ]; then
    printf '%s' "$CLIENT_ID" | npx wrangler pages secret put CF_ACCESS_CLIENT_ID --project-name loom >/dev/null 2>&1 && echo "  stored CF_ACCESS_CLIENT_ID"
    printf '%s' "$CLIENT_SECRET" | npx wrangler pages secret put CF_ACCESS_CLIENT_SECRET --project-name loom >/dev/null 2>&1 && echo "  stored CF_ACCESS_CLIENT_SECRET"
  fi
fi

cat <<'EOF'

────────────────────────────────────────────────────────────────────────────
Next steps (operator):
1. Set CLOUDFLARE_ACCESS_AUD = "<AUD>" in apps/loom/wrangler.toml [vars] and
   `wrangler pages deploy dist --project-name loom`.
2. Verify FAIL-CLOSED: unauthenticated `curl https://loom-8z0.pages.dev/api/loom/events`
   → 401/redirect. Also test a preview URL (<hash>.loom-8z0.pages.dev) → 401.
3. (Service token) Lumi sends CF-Access-Client-Id / CF-Access-Client-Secret on
   her writes (already stored as Pages secrets with --store-secrets).
4. Delete this API token — it is Write-scoped and no longer needed.
EOF