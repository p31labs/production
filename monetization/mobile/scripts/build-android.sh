#!/usr/bin/env bash
# =============================================================================
# build-android.sh — full Android APK build for P31 Capital (Capacitor 8).
#
# Prereqs (NOT in this sandbox — run on a machine with a JDK + Android SDK):
#   sudo apt-get install openjdk-17-jdk-headless
#   export ANDROID_HOME=$HOME/Android/Sdk   (or wherever the SDK lives)
#   export ANDROID_SDK_ROOT=$ANDROID_HOME
#   sdkmanager --install "platforms;android-34" "build-tools;34.0.0" "platform-tools"
#
# Usage:  bash scripts/build-android.sh   (from mobile/)
# Output: mobile/dist/P31-Capital-<ver>.apk  (debug, installable)
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${P31_APP_VERSION:-1.0.0}"
# Keystore lives outside the repo (never commit signing keys). The old
# p31-release.keystore was burned by being committed — regenerate a fresh one.
KEYSTORE="${P31_KEYSTORE:-${HOME}/.secrets/p31-release.keystore}"
KEYSTORE_ALIAS="${P31_KEYSTORE_ALIAS:-p31}"
KEYSTORE_PASS="${P31_KEYSTORE_PASS:?P31_KEYSTORE_PASS is required (release signing password)}"
WEB_DIR="${P31_WEB_DIR:-..}"

log() { echo "[build-android] $*"; }

command -v java >/dev/null || { echo "❌ JDK missing — install openjdk-17-jdk-headless first."; exit 1; }
[ -n "${ANDROID_HOME:-}" ] || { echo "❌ ANDROID_HOME unset — install the Android SDK first."; exit 1; }

# 1. Build the portal web assets and sync into the native project.
log "building portal (dist/)…"
(cd "$WEB_DIR" && pnpm build:pwa)
log "cap sync…"
npx cap sync

# 2. Create the release keystore if missing (keytool, part of the JDK).
if [ ! -f "$KEYSTORE" ]; then
  log "generating release keystore…"
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" -alias "$KEYSTORE_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$KEYSTORE_PASS" -keypass "$KEYSTORE_PASS" \
    -dname "CN=P31 Capital, OU=capital-machine, O=P31 Labs, C=US"
fi

# 3. Derive the SHA-256 cert fingerprint and patch .well-known/assetlinks.json.
FINGERPRINT="$(keytool -list -v -keystore "$KEYSTORE" -alias "$KEYSTORE_ALIAS" -storepass "$KEYSTORE_PASS" 2>/dev/null | sed -n 's/^[[:space:]]*SHA256:[[:space:]]*//p' | head -1 | tr -d ':' | tr -d '[:space:]')"
log "SHA-256 fingerprint: ${FINGERPRINT:-<not found>}"
if [ -n "${FINGERPRINT:-}" ]; then
  python3 - "$FINGERPRINT" <<'PY'
import json, sys
p = sys.argv[1].replace(':', '')
path = '../public/.well-known/assetlinks.json'
data = json.load(open(path))
data[0]['target']['sha256_cert_fingerprints'] = [p]
json.dump(data, open(path, 'w'), indent=2)
print('assetlinks.json updated')
PY
  # Re-sync so the patched assetlinks lands in the native project.
  (cd "$WEB_DIR" && pnpm build:pwa >/dev/null)
  npx cap sync
fi

# 4. Build the debug APK.
log "gradle assembleDebug…"
(cd android && ./gradlew assembleDebug -PcdvMinSdkVersion=23 -PcdkVersion=$(node -e "process.stdout.write(require('../node_modules/@capacitor/core/package.json').version)"))

# 5. Copy the APK out.
APK="android/app/build/outputs/apk/debug/app-debug.apk"
mkdir -p dist
if [ -f "$APK" ]; then
  cp "$APK" "dist/P31-Capital-$VERSION.apk"
  log "✅ dist/P31-Capital-$VERSION.apk ($(du -h "dist/P31-Capital-$VERSION.apk" | cut -f1))"
else
  log "⚠️  APK not found at $APK — check gradle output."
  exit 1
fi
log "Done. Install on device:  adb install dist/P31-Capital-$VERSION.apk"