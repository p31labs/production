<!-- P31-HEADER
id: p31_fix_plan_monetization_android_release_keystore_committed_20261014_v1.0
type: fix-plan
component: monetization/mobile
status: resolved
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: Android release signing keystore and its password are committed

## Symptom

`monetization/mobile/p31-release.keystore` (an Android release signing keystore
for package `org.p31.capital`) is **tracked in the parent git repo**
(`git ls-files monetization/mobile/p31-release.keystore` returns it). The
default signing password and alias are hardcoded in the build config:

- `monetization/mobile/android/app/build.gradle:22-24` — fallbacks
  `storePassword 'p31-release'`, `keyAlias 'p31'`, `keyPassword 'p31-release'`.
- `monetization/mobile/scripts/build-android.sh` — `KEYSTORE_PASS="${P31_KEYSTORE_PASS:-p31-release}"`.

The keystore's SHA-256 cert fingerprint (`6F874644…`) is also published in the
tracked `monetization/public/.well-known/assetlinks.json`, so the exposed
identity is cryptographically linked to the signing key.

## Evidence

- `git ls-files --error-unmatch monetization/mobile/p31-release.keystore` succeeds.
- Parent `.gitignore` has no `*.keystore` rule (only `.admin_token`, `*.token`,
  `credentials.json`, `secret*`).
- `file monetization/mobile/p31-release.keystore` → `data` (PKCS#12/JKS store).

## Root cause

The keystore was generated into the repo by the initial Capacitor scaffolding
(`build-android.sh` runs `keytool -genkeypair -keystore "$KEYSTORE"` where
`KEYSTORE` defaults to `$(pwd)/p31-release.keystore`), and the signing config
was wired to that file with a default password so CI/local builds "just work".

## Fix

1. `git rm --cached monetization/mobile/p31-release.keystore` and add
   `*.keystore` + `*.jks` to the parent `.gitignore`.
2. Generate a **new** keystore (the committed one is burned):
   `keytool -genkeypair` with a fresh random password, stored outside the repo
   (e.g. `~/.secrets/` or a password manager).
3. Move password/alias into env or a `.env`-style local file; delete the
   hardcoded fallbacks from `build.gradle` and `build-android.sh` (fail fast
   when `P31_KEYSTORE`/`P31_KEYSTORE_PASS` are unset).
4. Recompute the SHA-256 fingerprint, patch
   `public/.well-known/assetlinks.json`, and republish the PWA/Android asset
   links.
5. If any `org.p31.capital` APK was ever distributed under this key, treat the
   signing identity as compromised and note the supersession in the store/app
   update notes.

## Verification

- `git grep -l "p31-release" monetization` returns no hits in build config.
- `git ls-files monetization/mobile | grep -i keystore` is empty.
- `bash mobile/scripts/build-android.sh` fails cleanly with no `P31_KEYSTORE_PASS`.
- A fresh debug build signs with the new key; `keytool -list` shows the new fingerprint matching `assetlinks.json`.

## Impact

Until fixed, anyone with repo access can sign and distribute releases as
`org.p31.capital` (play-store/asset-link identity theft, supply-chain risk for
users who install the APK). No known distribution has occurred (no CI publishes
APKs), but the exposure is standing.

## Not blocking

Nothing else depends on the keystore content; the web/PWA path is unaffected.

## Resolution (2026-10-14)

- `git rm --cached monetization/mobile/p31-release.keystore` — keystore no longer tracked.
- Keystore moved to `~/.secrets/p31-release.keystore` (outside the repo, 0600).
- Parent `.gitignore` now blocks `*.keystore` / `*.jks`.
- Hardcoded fallback credentials removed from `mobile/android/app/build.gradle` and
  `mobile/scripts/build-android.sh` — signing now requires `P31_KEYSTORE` /
  `P31_KEYSTORE_PASS` (fail-fast when unset).

## Remaining (owner)

Regenerate a **new** keystore with `keytool` when a JDK/Android toolchain is
available (the moved keystore is still the burned key) and re-patch
`public/.well-known/assetlinks.json` with the new fingerprint.

## Automation (2026-10-15)

`mobile/scripts/rotate-keystore.sh` automates the rotation: generates a new
keystore in `~/.secrets/`, stores a random password (0600) outside the repo,
backs up the burned key, and patches `assetlinks.json`. Wired as
`pnpm rotate:keystore`. Not runnable in this environment (no JDK/keytool).