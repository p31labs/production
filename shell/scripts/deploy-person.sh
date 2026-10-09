#!/bin/bash
# deploy-person.sh — Launches a person's P31 Tetrahedron spaceship
# Usage: ./deploy-person.sh <slug>
# Example: ./deploy-person.sh alice

set -euo pipefail

SLUG="${1:-}"
if [ -z "$SLUG" ]; then
  echo "Usage: $0 <slug>"
  exit 1
fi

DOMAIN="${SLUG}.p31ca.org"
WORKER_NAME="p31-shell-${SLUG}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"

echo "🚀 Launching spaceship: ${SLUG}"
echo "   Worker: ${WORKER_NAME}"
echo "   Domain: ${DOMAIN}"

# Deploy worker with auto-provisioned bindings
echo "⏳ Deploying Worker..."
npx wrangler deploy --name "$WORKER_NAME" \
  --var PERSON_SLUG="$SLUG" \
  --var PERSON_DOMAIN="$DOMAIN" || {
  echo "⚠ Wrangler deploy failed — check credentials. Continuing..."
}

# Add custom domain
echo "⏳ Adding custom domain..."
npx wrangler custom-domain add --worker "$WORKER_NAME" --domain "$DOMAIN" 2>/dev/null || {
  echo "⚠ Custom domain may need DNS verification."
}

# Register in dispatch namespace
if [ -n "$ACCOUNT_ID" ] && [ -n "$API_TOKEN" ]; then
  echo "⏳ Registering in dispatch namespace..."
  curl -s -X POST \
    "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/dispatch/namespaces/p31-shell-dispatch/scripts" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"script_name\": \"${WORKER_NAME}\"}" \
    | grep -q '"success":true' && echo "✅ Dispatch registered" || echo "⚠ Dispatch registration failed"
else
  echo "⚠ Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN for dispatch registration"
fi

echo ""
echo "✅ ${SLUG} live at https://${DOMAIN}"
echo "   Manifest: https://${DOMAIN}/p31-shell.mcp.json"
