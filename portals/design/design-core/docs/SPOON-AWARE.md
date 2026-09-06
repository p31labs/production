# Spoon-Aware System

`<html data-spoons="n">` (n = 0…5) is the single input. CSS custom properties do all work — see DESIGN-BIBLE §4 for the ladder table.

Rules for component authors:
1. Never branch on spoon level in JS for styling. Read tokens (`var(--p31-motion-fast)`, `var(--p31-glass-blur)`).
2. JS may read spoons for *behavior* only (e.g., suppress nonessential polling at 0–1).
3. Ambient/infinite animations must be class-scoped so `spoon-ladder.css` + `accessibility.css` can kill them.
4. Test every component at 0 and 5 minimum; full cascade in CI matrix.

Hosts set spoons via SpoonDial composition or directly:
`document.documentElement.setAttribute('data-spoons', '3')`.
