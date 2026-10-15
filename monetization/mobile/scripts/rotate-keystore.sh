#!/usr/bin/env bash
set -euo pipefail
# rotate-keystore.sh — generate a NEW Android release keystore (the committed
# one was burned), store it OUTSIDE the repo with a random 0600 password, and
# re-patch public/.well-known/assetlinks.json with the new fingerprint.
# Prereq: JDK (keytool) on PATH. Run from mobile/ (or pass WEB_DIR).
cd "$(dirname "$0")/.."

WEB_DIR="${P31_WEB_DIR:-..}"
KEYSTORE="${P31_KEYSTORE:-${HOME}/.secrets/p31-release.keystore}"
PASS_FILE="${KEYSTORE}.pass"
ALIAS="${P31_KEYSTORE_ALIAS:-p31}"

command -v keytool >/dev/null || { echo "❌ keytool not found — install a JDK (e.g. openjdk-17-jdk-headless) first."; exit 1; }
mkdir -p "$(dirname "$KEYSTORE")"
chmod 700 "$(dirname "$KEYSTORE")" 2>/dev/null || true

# Random password, stored 0600 outside the repo.
if [ ! -s "$PASS_FILE" ]; then
  umask 077
  head -c 24 /dev/urandom | base64 | tr -d '\n+/=' | head -c 24 > "$PASS_FILE"
  chmod 600 "$PASS_FILE"
fi
KEYSTORE_PASS="$(cat "$PASS_FILE")"

if [ -f "$KEYSTORE" ]; then
  echo "⏳ backing up existing keystore to ${KEYSTORE}.burned-$(date +%s)"
  mv "$KEYSTORE" "${KEYSTORE}.burned-$(date +%s)"
fi

echo "🔑 generating new keystore at $KEYSTORE (alias $ALIAS)..."
keytool -genkeypair -v \
  -keystore "$KEYSTORE" -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$KEYSTORE_PASS" -keypass "$KEYSTORE_PASS" \
  -dname "CN=P31 Capital, OU=capital-machine, O=P31 Labs, C=US" 2>&1 | tail -3

FINGERPRINT="$(keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" -storepass "$KEYSTORE_PASS" 2>/dev/null | sed -n 's/^[[:space:]]*SHA256:[[:space:]]*//p' | head -1 | tr -d ':' | tr -d '[:space:]')"
echo "🔐 SHA-256 fingerprint: ${FINGERPRINT:-<not found>}"
[ -n "$FINGERPRINT" ] || { echo "❌ fingerprint extraction failed"; exit 1; }

python3 - "$FINGERPRINT" <<'PY'
import json, sys
fp = sys.argv[1]
path = '../public/.well-known/assetlinks.json'
data = json.load(open(path))
data[0]['target']['sha256_cert_fingerprints'] = [fp]
json.dump(data, open(path, 'w'), indent=2)
print('assetlinks.json updated')
PY

echo "✅ new keystore ready. Password stored at $PASS_FILE (outside the repo)."
echo "   Build with:  P31_KEYSTORE=$KEYSTORE P31_KEYSTORE_PASS=\"\$(cat $PASS_FILE)\" bash scripts/build-android.sh"