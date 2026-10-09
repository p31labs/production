/**
 * gate.mjs — the SIC-POVM completeness gate.
 *
 * The truth-seeking layer of the tetrahedral engine. Four specialists
 * (layout-parity, sensory-safety, identity-surface, motion-interaction)
 * each measure the SAME design state ρ across one axis. In the qubit SIC-POVM
 * these are four equiangular effects with overlap |⟨ψⱼ|ψₖ⟩|² = 1/3 — the
 * measurements are informationally complete: together they determine the
 * state fully. This gate operationalizes that:
 *
 *   1. COMPLETENESS — every axis must report non-trivial probability mass
 *      (p_j = mean_j / 10 ≥ floor). A collapsed axis (mean < floor) means the
 *      specialist "could not see" the design → the design is INCOMPLETE and
 *      must return to the Dreamer. This is NOT majority voting — it is
 *      informational completeness.
 *
 *   2. 1/3-OVERLAP CORROBORATION — the equiangular overlap means each
 *      specialist's view partially overlaps the others while staying
 *      independent. A severity=critical finding only GATES (blocks deploy)
 *      when at least `minCorroborators` (default 2) specialists independently
 *      flag it. One lone critic does not collapse the design; two agreeing
 *      critical observations do.
 *
 *   3. QBism BELIEF UPDATE — the design state is the shared belief of the
 *      four specialists. Each iteration updates a prior over the 4-vector;
 *      the loop halts at erotetic equilibrium when ‖Δp‖ < ε (further
 *      measurement induces negligible belief change).
 *
 * The gate is pure and deterministic — no LLM on the critical path. It is the
 * computational home of the "1/3 overlap constant" from the Tetrahedron
 * Protocol: the corroboration threshold (2 of 4) is the discrete analog of
 * the equiangular overlap.
 */

export const AXES = [
  'layout-parity',
  'sensory-safety',
  'identity-surface',
  'motion-interaction',
];

export const FLOOR = 0.4;         // p_j ≥ 0.4 (mean ≥ 4/10) on every axis
export const MIN_CORROBORATORS = 2; // critical findings gate at ≥2 specialists
export const EPSILON = 0.05;      // ‖Δp‖ below this = erotetic equilibrium

/** Extract the 4-vector from a review set. Missing axes are treated as 0
 *  (a specialist that did not report measured nothing). */
export function toStateVector(reviews) {
  const state = { 'layout-parity': 0, 'sensory-safety': 0, 'identity-surface': 0, 'motion-interaction': 0 };
  for (const r of reviews) {
    if (r.axis in state) state[r.axis] = Math.max(0, Math.min(1, r.mean / 10));
  }
  return state;
}

/** Which axes collapsed (below the floor) — the informational-completeness
 *  check. */
export function collapsedAxes(state, floor = FLOOR) {
  return AXES.filter((a) => state[a] < floor);
}

/** Critical findings corroborated by >= minCorroborators independent
 *  specialists — the 1/3-overlap rule. Returns the corroborated issues. */
export function corroboratedCriticalFindings(reviews, minCorroborators = MIN_CORROBORATORS) {
  const critical = [];
  for (const r of reviews) {
    for (const f of r.findings ?? []) {
      if (f.severity === 'critical') critical.push({ issue: f.issue, axis: f.axis, fix: f.fix });
    }
  }
  const byIssue = new Map();
  for (const c of critical) {
    if (!byIssue.has(c.issue)) byIssue.set(c.issue, { issue: c.issue, axes: [], fixes: [] });
    const row = byIssue.get(c.issue);
    if (!row.axes.includes(c.axis)) row.axes.push(c.axis);
    if (c.fix && !row.fixes.includes(c.fix)) row.fixes.push(c.fix);
  }
  return [...byIssue.values()].filter((row) => row.axes.length >= minCorroborators);
}

/** ‖Δp‖ between two belief states — the QBism update magnitude. */
export function beliefDelta(prev, next) {
  let acc = 0;
  for (const a of AXES) {
    const d = (next[a] ?? 0) - (prev[a] ?? 0);
    acc += d * d;
  }
  return Math.sqrt(acc);
}

export function atEquilibrium(prev, next, eps = EPSILON) {
  return beliefDelta(prev, next) < eps;
}

/** Run the gate. Pure — takes the four specialist reviews + options,
 *  returns the verdict. */
export function runGate(reviews, options = {}) {
  const floor = options.floor ?? FLOOR;
  const minCorroborators = options.minCorroborators ?? MIN_CORROBORATORS;

  const state = toStateVector(reviews);
  const collapsed = collapsedAxes(state, floor);

  // QBism confidence semantics: a measurement with a known instrument fault
  // (`degraded:true`, e.g. /vision fell back to a different model/rubric or
  // returned a neutral 'unmeasured') does NOT count as a normal score. It
  // must be reviewed by a human — a degraded axis is never silently passed.
  const degradedAxes = reviews.filter((r) => r.degraded === true).map((r) => r.axis);

  // Informational completeness: every axis must measure. A missing/collapsed
  // axis means the design is invisible to that measurement — incomplete.
  if (collapsed.length > 0) {
    return { status: 'incomplete', collapsedAxes: collapsed, degradedAxes, state };
  }

  // Degraded-but-not-collapsed: the axis reported but with a known instrument
  // fault. Needs review, not a pass — the belief is lower-confidence.
  if (degradedAxes.length > 0) {
    return { status: 'needs-review', degradedAxes, issues: [`measurement degraded on: ${degradedAxes.join(', ')}`], state };
  }

  // 1/3-overlap corroboration: critical findings must be corroborated by
  // >= minCorroborators specialists to gate. Lone critics are recorded but
  // do not block.
  const corroborated = corroboratedCriticalFindings(reviews, minCorroborators);
  if (corroborated.length > 0) {
    return {
      status: 'needs-revision',
      issues: corroborated.map((c) => `${c.issue} (flagged on ${c.axes.join(', ')})`),
      degradedAxes,
      state,
    };
  }

  // Major findings below corroboration threshold → needs-revision too, but
  // with a softer message. Collect non-critical fails across axes.
  const majors = [];
  for (const r of reviews) {
    for (const f of r.findings ?? []) {
      if (f.severity === 'major') majors.push(`${r.axis}: ${f.issue}`);
    }
  }
  if (majors.length > 0) {
    return { status: 'needs-revision', issues: majors, degradedAxes, state };
  }

  return { status: 'pass', degradedAxes, state };
}