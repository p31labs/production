# Path 0 — Acceptance baseline freeze (Agent 0)

Status: DONE
Reference SHA: cb847d2b9a68de2d8b5cdf2944eea828cc57193d
Capture: 18 routes (3 routes × 2 themes × 3 dials) × 2 passes = 36 images
Determinism: 18/18 pass1/pass2 pairs pixel-identical (cmp -s)
Cross-run: within-run double-capture proven identical; cross-run re-runs matched
Nondeterminism sources found & fixed during freeze:
  1. `.starfield-bg`/`.dome-bg` ambient canvas not masked (mask was `.starfield` only) → fixed mask
  2. Lazy route/preview mount race → added `waitForLoadState('networkidle')` + `document.fonts.ready` + 500ms settle
  3. motion/react WAAPI animations (not CSS) at spoons=5 → added `emulateMedia({reducedMotion:'reduce'})`
  4. `mesh_peer` toast from AmbientStarfield → masked `.notif-stack`/`.notif-toast`
Manifest: test-results/acceptance/baseline/manifest.json (status PENDING_HUMAN)
Approval: NOT approved — awaiting H0/H2 human sign-off
