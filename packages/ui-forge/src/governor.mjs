/**
 * governor.mjs — the third tetrahedral vertex.
 *
 * GOVERNOR: cut — kill momentum wearing the shape's clothes. The Governor
 * eliminates candidates, never generates them.
 *
 * Selection is DETERMINISTIC and CALIBRATED, never an LLM judge. THAKI's
 * finding is unambiguous: "an LLM judge is worse than no selection (-4.5%)".
 * The Governor therefore scores each shaped candidate on objective axes:
 *
 *   structure   — every node type is known, required props present, enum
 *                 props in-range (the Shaper already repaired these; the
 *                 Governor scores how few repairs were needed — a candidate
 *                 that needed no repairs outranks one that needed many)
 *   tokenUse    — fraction of referenced tokens that are canon-valid AND
 *                 in the component's allowed contract (token discipline)
 *   binding     — dataBinding coverage: does the tree bind to the grounded
 *                 entities/actions (it must actually surface the data)
 *   diversity   — (among survivors) how different this candidate is from
 *                 others; the Governor keeps K diverse survivors, not K
 *                 near-identical ones
 *
 * The Governor returns the survivors + kill reasons. The kill reason is the
 * "named next gate" the Center needs, and (via the Loom) the training label.
 */
import { nearestBinding } from './repair.mjs';

export const STRUCTURE_WEIGHT = 0.4;
export const TOKEN_WEIGHT = 0.25;
export const BINDING_WEIGHT = 0.35;

function countIssues(issues) {
  const byCode = {};
  for (const i of issues) byCode[i.code] = (byCode[i.code] ?? 0) + 1;
  return byCode;
}

/** Structure score: 1.0 minus a penalty per repair needed, capped at 0.
 *  A candidate the Shaper barely touched scores high. */
export function structureScore(auditIssues, totalNodes) {
  const issues = countIssues(auditIssues);
  const weight = totalNodes > 0 ? (issues['unknown-type'] ?? 0) * 0.6 + (issues['undeclared-prop'] ?? 0) * 0.2 + (issues['enum-violation'] ?? 0) * 0.2 + (issues['non-p31-token'] ?? 0) * 0.1 + (issues['token-not-allowed'] ?? 0) * 0.15 : 1;
  return Math.max(0, 1 - Math.min(1, weight));
}

/** Token discipline: fraction of referenced tokens that survived the Shaper
 *  (i.e., were canon-valid and contract-allowed). */
export function tokenScore(tree, auditIssues) {
  let total = 0;
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    total += Array.isArray(n.tokens) ? n.tokens.length : 0;
    for (const c of n.children ?? []) walk(c);
  };
  walk(tree);
  if (total === 0) return 0.5; // no tokens declared → neutral, not a win
  const issues = countIssues(auditIssues);
  const dropped = (issues['non-p31-token'] ?? 0) + (issues['token-not-allowed'] ?? 0);
  return Math.max(0, 1 - dropped / total);
}

/** Binding coverage: does the tree surface the grounded data (entities and
 *  actions)? Uses dataBinding refs + action names. */
export function bindingScore(tree, grounded) {
  const entities = grounded?.entities ?? [];
  const actions = grounded?.actions ?? [];
  if (entities.length === 0 && actions.length === 0) return 1; // nothing to bind
  const refs = new Set();
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (typeof n.dataBinding === 'string' && n.dataBinding) refs.add(n.dataBinding);
    for (const c of n.children ?? []) walk(c);
  };
  walk(tree);
  // Match dataBinding refs against entity names / action names (prefix match).
  let matched = 0;
  for (const e of entities) {
    const en = e.name ?? e.id;
    if (en && [...refs].some((r) => r.includes(en) || en.includes(r))) matched++;
  }
  for (const a of actions) {
    const an = a.name ?? (typeof a === 'string' ? a : null);
    if (an && [...refs].some((r) => r.includes(an) || an.includes(r))) matched++;
  }
  const targets = entities.length + actions.length;
  return Math.max(0, Math.min(1, matched / targets));
}

/** The composite score (0..1) — the calibrated reward the Governor cuts on. */
export function scoreCandidate(tree, auditIssues, grounded) {
  const totalNodes = countNodes(tree);
  const s = structureScore(auditIssues, totalNodes);
  const t = tokenScore(tree, auditIssues);
  const b = bindingScore(tree, grounded);
  return {
    total: STRUCTURE_WEIGHT * s + TOKEN_WEIGHT * t + BINDING_WEIGHT * b,
    structure: s,
    tokenUse: t,
    binding: b,
    nodes: totalNodes,
  };
}

function countNodes(tree) {
  let n = 0;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    n++;
    for (const c of node.children ?? []) walk(c);
  };
  walk(tree);
  return n;
}

/** Pick the top-K by score, then greedily enforce diversity: a survivor must
 *  differ from every already-kept survivor by at least `minDist` (a
 *  tree-difference heuristic). Returns { survivors, kills } where each kill
 *  carries its reason. */
export function selectSurvivors(scored, minDist = 2) {
  const ordered = [...scored].sort((a, b) => {
    // Primary: deterministic structure/token/binding score. Tie-break: the
    // RLDF reward score (fidelity — learned P31 taste). Admissibility is
    // NON-compensatory and lives in classifyAdmissibility; the reward only
    // breaks ties among already-admissible candidates — it never vetoes.
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    const ra = a.reward ?? -Infinity;
    const rb = b.reward ?? -Infinity;
    return rb - ra;
  });
  const survivors = [];
  const kills = [];
  for (const c of ordered) {
    if (survivors.length >= (minDist > 0 ? 2 : 1)) {
      kills.push({ candidate: c, reason: `ranked below survivor (score ${c.score.total.toFixed(2)}${c.reward != null ? `, reward ${c.reward.toFixed(2)}` : ''})` });
      continue;
    }
    const near = survivors.find((s) => treeDist(c.tree, s.tree) < minDist);
    if (near) {
      kills.push({ candidate: c, reason: `too similar to a kept survivor (dist < ${minDist})` });
      continue;
    }
    survivors.push(c);
  }
  return { survivors, kills };
}

/** A cheap tree-difference heuristic: count differing node types + prop keys. */
export function treeDist(a, b) {
  const sig = (n) => (n ? `${n.type}:${Object.keys(n.props ?? {}).join(',')}` : 'null');
  const aSet = new Set();
  const bSet = new Set();
  const walk = (n, set) => {
    if (!n || typeof n !== 'object') return;
    set.add(sig(n));
    for (const c of n.children ?? []) walk(c, set);
  };
  walk(a, aSet);
  walk(b, bSet);
  let diff = 0;
  for (const s of aSet) if (!bSet.has(s)) diff++;
  for (const s of bSet) if (!aSet.has(s)) diff++;
  return diff;
}

// ─────────────────────────────────────────────────────────────────────────
// NON-COMPENSATORY ADMISSIBILITY — "bound the judge's blast radius rather
// than trying to make it accurate" (arxiv: When the Judge Should Not Decide).
// The Governor is a FALSIFIER, not a ranker. It applies hard, deterministic
// rules and marks each candidate admissible / inadmissible. A single rule
// violation is non-compensatory — a candidate that binds no data is
// inadmissible no matter how structurally clean it is. No LLM has unilateral
// selection authority. The Center picks among ADMISSIBLE survivors by the
// deterministic score (a tie-break, never a judge).
// ─────────────────────────────────────────────────────────────────────────

export const ADMISSIBILITY_RULES = {
  // A valid candidate must reference a known component type everywhere.
  unknownType: 'tree contains an unknown component type',
  // A candidate that binds to NO grounded entity/action is inert — it
  // surfaces no backend data. (Non-compensatory: clean structure cannot
  // rescue an unbound surface.)
  noBinding: 'tree binds to no grounded entity or action',
  // Token discipline: any non-p31 / contract-violating token ref is a
  // falsification (the token contract is closed).
  tokenViolation: 'tree references a non-p31 or contract-violating token',
};

/** Whether a candidate is admissible — a boolean, not a score. Rules are
 *  evaluated AND: any one violation flips the whole candidate. */
export function isAdmissible(tree, auditIssues, grounded, { minBinding = true } = {}) {
  const issues = countIssues(auditIssues);
  if (issues['unknown-type'] > 0) return { ok: false, reason: ADMISSIBILITY_RULES.unknownType };
  let binding = bindingScore(tree, grounded);
  // Non-compensatory: a candidate that binds NOTHING is inert (structure does
  // not rescue an unbound surface). The threshold is > 0 — one real binding
  // (entity or action) is enough; it is NOT a coverage ratio.
  if (minBinding && binding <= 0) {
    // REPAIR before falsifying: attempt nearest-binding alignment on every
    // dataBinding ref. A near-miss ("spoons" → "spoon") is aligned in place
    // and re-evaluated; only a ref with NO grounded near-match is a real
    // noBinding. Nothing is ever invented — an unbound ref stays unbound.
    alignBindingRefs(tree, grounded);
    binding = bindingScore(tree, grounded);
    if (binding <= 0) return { ok: false, reason: ADMISSIBILITY_RULES.noBinding };
  }
  const tokenViolations = (issues['non-p31-token'] ?? 0) + (issues['token-not-allowed'] ?? 0);
  if (tokenViolations > 0) return { ok: false, reason: ADMISSIBILITY_RULES.tokenViolation };
  return { ok: true, reason: null };
}

/** Mutate a tree in place: for each node whose dataBinding ref has no grounded
 *  near-match, align the ref's base segment to the closest grounded
 *  entity/action name (preserving any field suffix). Returns true if any ref
 *  was aligned. */
function alignBindingRefs(tree, grounded) {
  let changed = false;
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (typeof n.dataBinding === 'string' && n.dataBinding) {
      const base = n.dataBinding.split('.')[0];
      const suffix = n.dataBinding.slice(base.length);
      const aligned = nearestBinding(base, grounded);
      if (aligned) {
        const newRef = suffix ? `${aligned}${suffix}` : aligned;
        if (newRef !== n.dataBinding) {
          n.dataBinding = newRef;
          changed = true;
        }
      }
    }
    for (const c of n.children ?? []) walk(c);
  };
  walk(tree);
  return changed;
}

/** Partition a pool of shaped candidates into admissible / inadmissible with
 *  the rule that rejected each one. */
export function classifyAdmissibility(shaped, grounded, options = {}) {
  const admissible = [];
  const inadmissible = [];
  for (const s of shaped) {
    const verdict = isAdmissible(s.tree, s.audit, grounded, options);
    if (verdict.ok) admissible.push(s);
    else inadmissible.push({ ...s, reason: verdict.reason });
  }
  return { admissible, inadmissible };
}