<!-- P31-HEADER
id: p31_fix_plan_monetization_mobile_build_artifacts_20261014_v1.0
type: fix-plan
component: monetization/mobile
status: resolved
retention: archive-90d
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: mobile build products are tracked and bloat the checkout

## Symptom

`monetization/mobile` mixes source with build output. The iOS project ships
**built web bundles** in git
(`monetization/mobile/ios/App/App/public/assets/*.js` + `.js.map`, `sw.js`,
`index.html`), and the Android tree carries a full generated project
(`gradle-wrapper.jar`, native wrapper, app sources). Meanwhile the working
tree also contains ~177 MB of untracked Android intermediates
(`mobile/android/capacitor-*/build/**`) that are not cleaned.

This makes the mobile subtree hard to review (generated code is "tracked
source"), risks stale embedded assets (the built bundles go stale independently
of `dist/`), and wastes disk — which is already at 97% per STATE.md.

## Evidence

- `git ls-files monetization/mobile` includes `ios/App/App/public/assets/*.js.map`, `sw.js`, `gradle-wrapper.jar`, native app sources.
- `du -sh monetization/mobile` → 177M (mostly untracked `build/` intermediates).
- Parent `.gitignore` covers `dist/` and `node_modules/` but not the mobile
  generated tree.

## Root cause

Capacitor's native projects were committed wholesale, and `mobile/android`
local builds were never cleaned.

## Fix

1. Decide the source-of-truth model for the native shells. Recommended:
   commit `mobile/capacitor.config.json` + `mobile/scripts/*` only, and
   regenerate the native projects via `npx cap add`/`npx cap sync` on demand
   (see `mobile/README.md`).
2. If the native projects must stay tracked, at minimum delete the built web
   bundles (`ios/App/App/public/assets/**`) and `gradle-wrapper.jar` from git
   (regenerate with `cap sync`), and add ignore rules for
   `mobile/**/build/`, `mobile/ios/App/App/public/assets/`, `*.jar`.
3. Clean the local `mobile/android/*/build/**` intermediates.

## Verification

- `git ls-files monetization/mobile | grep -E "assets/.*\.js|\.jar$|build/"` is empty.
- `npx cap sync` reproduces the native projects from committed config.
- `du -sh monetization/mobile` back under ~10M of source.

## Impact

Reduces review noise, prevents stale embedded JS, and frees disk on a
97%-full machine.

## Resolution (2026-10-14)

Corrected scope from the original audit: the iOS built web bundles
(`mobile/ios/App/App/public/assets/*`) are **not tracked** — they are excluded
by `mobile/ios/.gitignore` (`App/App/public`). The tracked build product was
only `mobile/android/gradle/wrapper/gradle-wrapper.jar`, which is now
`git rm --cached` (regenerable by Gradle). Local untracked Android
intermediates (`capacitor-*/build/**`, ~60 MB) were cleaned from the tree.
`mobile/android/app/build`/`capacitor-*/build` now have no intermediate output.

## Remaining (owner)

If the native projects must stay committed, decide whether to also ignore the
remaining generated wrapper (or fully regenerate native shells via
`npx cap add`/`cap sync` on demand).