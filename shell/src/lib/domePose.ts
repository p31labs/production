// domePose.ts — canonical shared dome pose (lives in @p31ca/shell-chrome).
// Re-exported here so existing imports (`../../lib/domePose`) resolve and stay
// wired to the *same* mutable object the canonical DomeGeometry writes each
// frame — this is what lets QuantumFX's house ring track the rotating dome.
export { domePose } from '@p31ca/shell-chrome';
