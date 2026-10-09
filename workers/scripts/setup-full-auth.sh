#!/usr/bin/env bash
#
# Full auth setup for the forum + projection workers.
#
# What "full auth" means here:
#   • forum-api validates every write via an AIC-JWT capability token
#     (composite Ed25519 + ML-DSA-65, self-contained public keys) with
#     audience FORUM_AUD. Writes fail closed without a valid token.
#   • standard-site-projection's POST /publish requires PUBLISH_TOKEN.
#   • The workspace portal mints tokens (see scripts/mint-forum-token.mjs)
#     and sends them in `Authorization: Bearer`.
#
# Run:  bash scripts/setup-full-auth.sh
# Requires: wrangler authenticated (wrangler whoami), Workers Paid (DOs).

set -euo pipefail

cd "$(dirname "$0")/.."   # workers/

echo "→ 0 · wrangler identity"
npx wrangler whoami --json | python3 -c "import json,sys; d=json.load(sys.stdin); print('  account:', d.get('account_id'))" || { echo "  not authenticated — run: npx wrangler login"; exit 1; }

echo "→ 1 · D1 database"
if ! grep -q 'database_id = "REPLACE_ME\|<fill after' forum-api/wrangler.toml; then
  echo "  database_id already set — skipping create"
else
  OUT=$(npx wrangler d1 create p31-forum 2>&1)
  DB_ID=$(echo "$OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
  if [ -z "$DB_ID" ]; then echo "  ❌ could not parse database_id from output"; echo "$OUT"; exit 1; fi
  python3 - "$DB_ID" <<'PY'
import re, sys
id = sys.argv[1]
p = 'forum-api/wrangler.toml'
s = open(p).read()
s = re.sub(r'database_id = "[^"]*"', f'database_id = "{id}"', s, count=1)
open(p, 'w').write(s)
print(f"  database_id = {id}")
PY
fi

echo "→ 2 · schema (remote + local)"
npx wrangler d1 execute p31-forum --remote --file=forum-api/schema.sql
npx wrangler d1 execute p31-forum --local  --file=forum-api/schema.sql
echo "  verify:"
npx wrangler d1 execute p31-forum --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"

echo "→ 3 · deploy forum-api"
(cd forum-api && npx wrangler deploy)

echo "→ 4 · projection worker secret + deploy"
npx wrangler secret put PUBLISH_TOKEN --name standard-site-projection 2>&1 | sed 's/PUBLISH_TOKEN/<paste-a-random-token>/' || echo "  (set PUBLISH_TOKEN in the dashboard: Cloudflare → standard-site-projection → Settings → Variables and Secrets)"
(cd standard-site-projection && npx wrangler deploy)

echo "→ 5 · portal env (FORUM_ORIGIN already in workspace/wrangler.toml)"
echo "  confirm:"
grep FORUM_ORIGIN /home/p31/production/portals/workspace/wrangler.toml || echo "  ⚠ add FORUM_ORIGIN to workspace/wrangler.toml vars"

echo "→ 6 · smoke: mint a token and hit /health"
node scripts/mint-forum-token.mjs 2>/dev/null | head -1 || echo "  (mint helper at scripts/mint-forum-token.mjs — run it after deploy)"

echo
echo "✅ Full auth setup complete."
echo "  forum-api:        https://forum-api.trimtab-signal.workers.dev"
echo "  projection:       https://standard-site-projection.trimtab-signal.workers.dev"
echo "  portal:           https://workspace.p31ca.org"
echo
echo "Next: deploy the portal with `pnpm deploy` from production/portals/workspace,"
echo "and set FORUM_AUD to the deployed host if it differs from forum.p31ca.org."