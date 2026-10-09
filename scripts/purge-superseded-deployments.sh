#!/usr/bin/env bash
# purge-superseded-deployments.sh — close the Pages deployment-URL leak.
#
# Every `wrangler pages deploy` creates a new <hash>.loom-8z0.pages.dev URL
# that serves the API UNAUTHENTICATED (the Access preview_urls_enabled toggle
# gates preview deployments, not production deployment hash URLs — verified
# 2026-09-22). Run this after each deploy (or from a CI step) to keep only the
# canonical deployment live; superseded URLs become 404.
#
# Lists deployments via the wrangler CLI (the raw API list is empty for the
# wrangler OAuth token) and deletes via the API.
#
# Usage:
#   ./scripts/purge-superseded-deployments.sh loom
set -euo pipefail

PROJECT="${1:?usage: purge-superseded-deployments.sh <project-name>}"

# Prefer a scoped API token (CI pattern); fall back to the wrangler OAuth token.
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  TOKEN="$CLOUDFLARE_API_TOKEN"
else
  TOKEN=$(rg "^oauth_token" "$HOME/.wrangler/config/default.toml" | sed 's/.*= *"//;s/"$//')
fi
ACCT="ee05f70c889cb6f876b9925257e3a2fa"
BASE="https://api.cloudflare.com/client/v4/accounts/$ACCT/pages/projects/$PROJECT"

CANONICAL=$(curl -s "$BASE" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;print(json.load(sys.stdin)['result']['canonical_deployment']['id'])" 2>/dev/null)
if [ -z "$CANONICAL" ]; then echo "✗ could not read canonical deployment"; exit 1; fi
echo "canonical deployment: $CANONICAL"

# Deployment IDs from the wrangler CLI (the dash URLs carry the UUIDs).
IDS=$(wrangler pages deployment list --project-name "$PROJECT" 2>/dev/null | rg -o "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" | sort -u || true)

DELETED=0
for id in $IDS; do
  if [ "$id" != "$CANONICAL" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/deployments/$id" -H "Authorization: Bearer $TOKEN")
    echo "  deleted $id → $code"
    DELETED=$((DELETED+1))
  fi
done
echo "purged $DELETED superseded deployment(s); canonical $CANONICAL retained."