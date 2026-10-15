#!/usr/bin/env bash
set -euo pipefail
# rotate-keystore.sh — rotate the Android release signing keystore using the
# in-house key rotation system (docs/enterprise/operations/secret-rotation-runbook.md):
#   1. Key material: p31-key-rotator /genkey (X-Rotator-Token) when the shared
#      secret is provisioned; otherwise scripts/key-rotate.mjs keygen — the same
#      32-byte base64url key encoding either way.
#   2. keytool (JDK) generates a NEW keystore outside the repo with that key as
#      the password; the old (burned) keystore is backed up as *.burned-<ts>.
#   3. public/.well-known/assetlinks.json is re-patched with the new fingerprint.
#   4. Password stored 0600 in ~/.secrets; rotation appended to
#      ~/.secrets/keystore-rotations.jsonl (0600).
# Owner-executed: key material must also be vaulted (runbook §Who runs this).
cd "$(dirname "$0")/.."
PARENT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

WEB_DIR="${P31_WEB_DIR:-..}"
KEYSTORE="${P31_KEYSTORE:-${HOME}/.secrets/p31-release.keystore}"
PASS_FILE="${KEYSTORE}.pass"
ALIAS="${P31_KEYSTORE_ALIAS:-p31}"
ROTATOR_URL="${P31_ROTATOR_URL:-https://p31-key-rotator.trimtab-signal.workers.dev}"
ROTATOR_TOKEN="${ROTATOR_SHARED_SECRET:-$(cat "${HOME}/.secrets/rotator-shared-secret" 2>/dev/null || true)}"

command -v keytool >/dev/null || { echo "❌ keytool not found — install a JDK (e.g. openjdk-17-jdk-headless) first."; exit 1; }
[ -f "$PARENT_ROOT/scripts/key-rotate.mjs" ] || { echo "❌ scripts/key-rotate.mjs not found (expected at $PARENT_ROOT/scripts)."; exit 1; }

echo "🔑 rotating Android release keystore via the in-house key rotation system"
echo "   rotator: $ROTATOR_URL"

# 1. Key material — prefer the remote worker, fall back to the in-house CLI.
KEY=""
if [ -n "$ROTATOR_TOKEN" ]; then
  echo "   requesting fresh key from p31-key-rotator /genkey..."
  RESP="$(curl -s -m 10 -X POST "$ROTATOR_URL/genkey" -H "X-Rotator-Token: $ROTATOR_TOKEN")"
  KEY="$(printf '%s' "$RESP" | python3 -c 'import json,sys
try:
  d=json.load(sys.stdin); print(d.get("key") or d.get("generated_key") or "")
except Exception: print("")' 2>/dev/null || true)"
  if [ -z "$KEY" ]; then
    echo "   ⚠ remote /genkey failed (is ROTATOR_SHARED_SECRET provisioned?) — response: $(printf '%s' "$RESP" | head -c 120)"
  fi
fi
if [ -z "$KEY" ]; then
  echo "   generating key via scripts/key-rotate.mjs keygen (in-house CLI)..."
  KEY="$(node "$PARENT_ROOT/scripts/key-rotate.mjs" keygen --count 1 | cut -f1)"
fi
[ -n "$KEY" ] || { echo "❌ no key material generated"; exit 1; }
KEY_SOURCE="key-rotate.mjs"
[ -z "$ROTATOR_TOKEN" ] || KEY_SOURCE="remote-rotator"
echo "   key: ${KEY:0:6}…${KEY: -4} (43 chars) — store the FULL value in the vault"

mkdir -p "$(dirname "$KEYSTORE")"
chmod 700 "$(dirname "$KEYSTORE")" 2>/dev/null || true

# 2. New keystore (backup the burned old one first).
if [ -f "$KEYSTORE" ]; then
  TS="$(date +%s)"
  echo "   backing up old keystore → ${KEYSTORE}.burned-${TS}"
  mv "$KEYSTORE" "${KEYSTORE}.burned-${TS}"
fi
echo "   generating keystore with keytool..."
keytool -genkeypair -v \
  -keystore "$KEYSTORE" -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$KEY" -keypass "$KEY" \
  -dname "CN=P31 Capital, OU=capital-machine, O=P31 Labs, C=US" 2>&1 | tail -2

FINGERPRINT="$(keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" -storepass "$KEY" 2>/dev/null | sed -n 's/^[[:space:]]*SHA256:[[:space:]]*//p' | head -1 | tr -d ':' | tr -d '[:space:]')"
echo "   SHA-256 fingerprint: ${FINGERPRINT:-<not found>}"
[ -n "$FINGERPRINT" ] || { echo "❌ fingerprint extraction failed"; exit 1; }

# 3. Patch assetlinks.json with the new fingerprint.
python3 - "$FINGERPRINT" <<'PY'
import json, sys
fp = sys.argv[1]
path = '../public/.well-known/assetlinks.json'
data = json.load(open(path))
data[0]['target']['sha256_cert_fingerprints'] = [fp]
json.dump(data, open(path, 'w'), indent=2)
print('   assetlinks.json updated')
PY

# 4. Store the password (0600) + append the rotation record.
umask 077
printf '%s' "$KEY" > "$PASS_FILE"
chmod 600 "$PASS_FILE"
printf '{"ts":"%s","keystore":"%s","alias":"%s","fingerprint":"%s","key_source":"%s"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$KEYSTORE" "$ALIAS" "$FINGERPRINT" "$KEY_SOURCE" \
  >> "${HOME}/.secrets/keystore-rotations.jsonl"

echo "✅ rotation complete"
echo "   new keystore:  $KEYSTORE"
echo "   password file: $PASS_FILE (0600, outside the repo)"
echo "   build with:    P31_KEYSTORE=$KEYSTORE P31_KEYSTORE_PASS=\"\$(cat $PASS_FILE)\" bash scripts/build-android.sh"