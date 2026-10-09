/**
 * center.mjs — the synthesis step.
 *
 * CENTER: the developed artifact + the named next gate. Never one of the
 * vertices wearing two hats — it orchestrates the tetrahedron and reports
 * what it did, and it hands the final tree to the SIC-POVM measurement
 * tetrahedron (the /vision four specialists) for the completeness gate.
 *
 * GATE PROVENANCE: when the /vision specialist reviews are NOT supplied (the
 * studio's default), the Center synthesizes deterministic reviews from the
 * artifact itself — a pure, no-LLM measurement of the four axes against the
 * canon and the grounded facts. This keeps a genuine `pass` reachable without
 * a vision round-trip, and the emitted `gate.verdict` always carries the real
 * status + axes (never a fabricated 'not-run' or a hardcoded 'incomplete').
 *
 * The Center:
 *   1. Grounds the backend spec (Grounder).
 *   2. Dreams K candidates (Dreamer).
 *   3. Shapes every candidate against the canon (Shaper) — "constrain late".
 *   4. Governs: deterministic cut to survivors (Governor).
 *   5. Runs the SIC-POVM gate over the measurement tetrahedron's reviews
 *      (provided externally, e.g. from /vision) — completeness + 1/3-overlap
 *      corroboration + QBism equilibrium.
 *   6. Emits the final artifact + a Loom `propose` event (the training label
 *      source for Phase 4).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ground } from './grounder.mjs';
import { dream } from './dreamer.mjs';
import { shape, auditTree } from './shaper.mjs';
import { scoreCandidate, classifyAdmissibility, selectSurvivors } from './governor.mjs';
import { runGate, AXES } from './gate.mjs';

// NOTE: `here`/`SCHEMA_PATH` are computed LAZILY (inside loadCatalog) so a
// bundled runtime (Cloudflare Pages Function) can import this module without
// executing fileURLToPath(import.meta.url) at load time — esbuild inlines
// modules and import.meta.url is undefined there. The injected-catalog path
// never touches node:fs. The CLI (Node) reads from disk as before.

let _catalog = null;
function loadCatalog(override) {
  if (override?.components?.length) return override; // injected (Workers runtime)
  if (_catalog) return _catalog;
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = JSON.parse(readFileSync(resolve(here, '../ui-schema.json'), 'utf8'));
  _catalog = raw.catalog;
  return _catalog;
}

/** The named next action for each SIC-POVM axis — the Mears Center's
 *  synthesis output. A collapsed or degraded axis maps to a specific,
 *  actionable fix so the loop closes with "fix this", not "it failed". */
const NEXT_GATE_ACTIONS = {
  'layout-parity': { action: 'rebalance the rail proportion; promote the primary action; re-group threads', severity: 'major' },
  'sensory-safety': { action: 'reduce ambient opacity below 0.35; raise text contrast over the starfield; enable reduced-motion', severity: 'critical' },
  'identity-surface': { action: 'restore user-chip legibility; raise DID to tertiary contrast; fix the pre-mint state', severity: 'critical' },
  'motion-interaction': { action: 'add focus rings; define pressed states; signal composer loading/stop', severity: 'major' },
};

/** Map a gate verdict to the named next gates (per collapsed/degraded axis +
 *  corroborated findings). */
export function nameNextGate(gate) {
  const steps = [];
  if (!gate) return steps;
  if (gate.collapsedAxes?.length) {
    for (const axis of gate.collapsedAxes) {
      const g = NEXT_GATE_ACTIONS[axis] ?? { action: 'revisit this axis', severity: 'major' };
      steps.push({ axis, action: g.action, severity: gate.degradedAxes?.includes(axis) ? 'review' : g.severity });
    }
  }
  if (gate.degradedAxes?.length) {
    for (const axis of gate.degradedAxes) {
      if (gate.collapsedAxes?.includes(axis)) continue; // already named above
      steps.push({ axis, action: 'measurement degraded — re-run with a healthy instrument before deciding', severity: 'review' });
    }
  }
  if (gate.issues?.length) {
    for (const issue of gate.issues) {
      steps.push({ axis: 'cross-axis', action: issue, severity: 'major' });
    }
  }
  return steps;
}

/**
 * Run the full generation tetrahedron — the never-fail five-tier pipeline:
 *
 *   T0 INTENT  — if the spec declares no entities/actions, synthesize a
 *                default brief internally (item / open / save) so the surface
 *                always has something to bind.
 *   T1 GROUND  — Grounder: verified facts + gaps (unchanged).
 *   T2 DREAM   — Dreamer: K candidates; if nothing usable comes back, fall
 *                back to a deterministic catalog-walk (GlassPanel / Card /
 *                MetricBadge / StatusCluster trees binding the brief) — the
 *                "garbage-but-valid" guarantee.
 *   T3 REPAIR  — Shaper (token/prop repair) + Governor (binding alignment,
 *                non-compensatory admissibility, deterministic selection).
 *   T4 FALLBACK — if still zero admissible survivors, synthesize a skeleton
 *                tree (GlassPanel > PageHeader + Card + MetricBadge) and emit
 *                it as the artifact with `fellBack: true`.
 *
 * `options.emit` receives plain pipeline events: pipeline.stage start/done,
 * agent.start/agent.done per vertex, repair.fallback, artifact.final.
 *
 * @param {object} spec        — backend spec (entities/actions/relations)
 * @param {object} [options]
 *   @param {number} options.k          — Dreamer candidate count (default 4)
 *   @param {function} options.provider — Dreamer model provider
 *   @param {object} options.providerOpts — provider options ({ endpoint, fetchImpl })
 *   @param {object} options.catalog   — injected canon catalog (avoids node:fs in
 *                                       a Workers runtime; defaults to the on-disk
 *                                       ui-schema.json catalog)
 *   @param {Array} options.reviews     — /vision specialist reviews for the gate
 *   @param {function} options.emit     — (event) => void pipeline event sink
 * @returns {object} the Center's report: { artifact, survivors, kills,
 *   gate, propose, logs, fellBack, tier }
 */
export async function forge(spec, options = {}) {
  const k = options.k ?? 4;
  const catalog = loadCatalog(options.catalog);
  const emit = options.emit ?? (() => {});
  const now = () => Date.now();
  // pipeline.stage carries `status` (frozen contract) plus a `phase` alias so
  // consumers reading either key (ActivityPane, legacy SSE frames) stay green.
  const stage = (name, status, extra = {}) => emit({ type: 'pipeline.stage', stage: name, status, phase: status, at: now(), ...extra });
  const vertexStarts = new Map();
  // agent.start carries a label; agent.done carries a REAL Date.now()-measured
  // durationMs. Call-site extras (facts/gaps/candidates/…) ride along.
  const vertex = (agent, phase, extra = {}) => {
    if (phase === 'start') {
      vertexStarts.set(agent, now());
      emit({ type: 'agent.start', agent, label: extra.label ?? agent, at: vertexStarts.get(agent) });
    } else {
      const started = vertexStarts.get(agent) ?? now();
      emit({ type: 'agent.done', agent, durationMs: now() - started, at: now(), ...extra });
    }
  };

  // ── T0 INTENT ────────────────────────────────────────────────────────────
  // An empty spec still gets a surface: synthesize a default brief internally.
  stage('intent', 'start', { spec });
  const hasBrief = (Array.isArray(spec?.entities) && spec.entities.length > 0) || (Array.isArray(spec?.actions) && spec.actions.length > 0);
  const effectiveSpec = hasBrief
    ? spec
    : { ...spec, entities: [{ name: 'item' }], actions: [{ name: 'open' }, { name: 'save' }] };
  stage('intent', 'done', { synthesizedBrief: !hasBrief, entities: effectiveSpec.entities.length, actions: effectiveSpec.actions.length });

  // ── T1 GROUND ────────────────────────────────────────────────────────────
  stage('ground', 'start');
  vertex('grounder', 'start', { label: 'Grounder · reading the brief' });
  const grounded = ground(effectiveSpec, { askTopK: options.askTopK ?? 0 });
  vertex('grounder', 'done', { facts: grounded.facts.length, gaps: grounded.gaps.length });
  const groundDetail = describeGrounding(effectiveSpec, grounded);
  emit({ type: 'agent.result', agent: 'grounder', summary: `${grounded.facts.length} facts · ${grounded.gaps.length} gaps`, detail: groundDetail, at: now() });
  stage('ground', 'done', { entities: grounded.entities.length, actions: grounded.actions.length });

  // ── T2 DREAM ─────────────────────────────────────────────────────────────
  stage('dream', 'start');
  vertex('dreamer', 'start', { label: 'Dreamer · writing candidate layouts' });
  let candidates = [];
  let dreamerCount = 0;
  let dreamError = null;
  try {
    const res = await dream(grounded, catalog, {
      k,
      provider: options.provider,
      providerOpts: options.providerOpts,
    });
    candidates = res.candidates;
  } catch (err) {
    dreamError = err;
  }
  if (!Array.isArray(candidates)) candidates = [];
  dreamerCount = candidates.length;
  // Always seed the pool with 2 deterministic catalog-walk trees so at least
  // one admissible-by-construction candidate exists → T4 fallback becomes a
  // true last resort. If the Dreamer returned nothing, the walk pool stands in.
  const walkTrees = catalogWalkTrees(2, catalog, grounded, effectiveSpec);
  const walkRefs = new Set(walkTrees);
  const usedCatalogWalk = dreamerCount === 0;
  candidates = usedCatalogWalk ? walkTrees : [...candidates, ...walkTrees];
  let tier = usedCatalogWalk ? 'catalog-walk' : 'dream';
  vertex('dreamer', 'done', { candidates: candidates.length, dreamerCount, tier, error: dreamError ? String(dreamError) : undefined });
  emit({
    type: 'agent.result',
    agent: 'dreamer',
    summary: usedCatalogWalk
      ? `catalog walk: ${walkTrees.length} canonical layouts`
      : `${dreamerCount} candidates`,
    detail: describeDream(dreamerCount, candidates, catalog, effectiveSpec, usedCatalogWalk, dreamError),
    at: now(),
  });
  stage('dream', 'done', { candidates: candidates.length, dreamerCount, tier });

  // ── T3 REPAIR ────────────────────────────────────────────────────────────
  // Shaper repairs each candidate against the canon; the Governor repairs
  // bindings (nearest-match) before the non-compensatory admissibility cut.
  stage('repair', 'start');
  vertex('shaper', 'start', { label: 'Shaper · applying the canon' });
  const shaped = [];
  let repairsApplied = 0;
  for (const c of candidates) {
    const audit = auditTree(c, { catalog });
    const { tree } = shape(c, { catalog });
    // Count ACTUAL repairs, not raw audit issues: the issues the shaped tree
    // no longer carries are the ones the Shaper fixed. The catalog-walk trees
    // ship clean, so this stays truthful instead of inflating to dozens.
    if (tree) {
      const postAudit = auditTree(tree, { catalog });
      repairsApplied += Math.max(0, audit.length - postAudit.length);
      shaped.push({ tree, audit: postAudit, raw: c, isWalk: walkRefs.has(c) });
    }
  }
  vertex('shaper', 'done', { shaped: shaped.length });
  emit({ type: 'agent.result', agent: 'shaper', summary: `${repairsApplied} repairs applied`, detail: describeRepair(repairsApplied, shaped), at: now() });
  vertex('governor', 'start', { label: 'Governor · cutting non-binders' });
  const { admissible, inadmissible } = classifyAdmissibility(shaped, grounded);
  const scored = admissible.map((s) => ({
    ...s,
    score: scoreCandidate(s.tree, s.audit, grounded),
    // Optional RLDF reward (fidelity tie-break). A provider passes rewardFn;
    // it scores the rendered candidate and is used ONLY to break score ties.
    reward: options.rewardFn ? options.rewardFn(s.tree) : undefined,
  }));
  const { survivors, kills } = selectSurvivors(scored, options.minDist ?? 2);
  const inadmissibleKills = inadmissible.map((s) => ({ reason: `inadmissible: ${s.reason}`, tree: s.tree }));
  vertex('governor', 'done', { admissible: admissible.length, inadmissible: inadmissible.length, survivors: survivors.length });
  emit({ type: 'agent.result', agent: 'governor', summary: `${admissible.length} admissible of ${shaped.length} shaped`, detail: describeGovern(admissible, survivors, inadmissible), at: now() });
  stage('repair', 'done', { admissible: admissible.length, inadmissible: inadmissible.length, survivors: survivors.length });

  // ── T4 FALLBACK ──────────────────────────────────────────────────────────
  // Zero admissible survivors → a deterministic skeleton tree still ships.
  let fellBack = false;
  let best = survivors[0]?.tree ?? null;
  if (best) {
    // Tier reflects WHERE the winning tree came from, not the pool: a
    // catalog-walk survivor is 'catalog-walk'; a Dreamer candidate is 'dream'.
    tier = survivors[0]?.isWalk ? 'catalog-walk' : 'dream';
  }
  if (!best) {
    fellBack = true;
    tier = 'fallback';
    const rawSkeleton = skeletonTree(grounded, effectiveSpec);
    const { tree } = shape(rawSkeleton, { catalog });
    best = tree ?? rawSkeleton;
    emit({ type: 'repair.fallback', reason: 'zero admissible survivors', k, artifact: best, at: now() });
  }

  // ── GATE (SIC-POVM) ─────────────────────────────────────────────────────
  // When /vision reviews are supplied, the gate measures those specialist
  // observations. Otherwise (the studio's default) the Center synthesizes
  // deterministic reviews from the artifact + grounded facts — so the gate
  // ALWAYS runs and a real verdict (pass/incomplete/needs-revision) is emitted.
  stage('gate', 'start');
  let gate = null;
  let gateSource = 'none';
  if (Array.isArray(options.reviews) && options.reviews.length > 0) {
    gate = runGate(options.reviews, options.gate);
    gateSource = 'vision';
  } else if (best) {
    const audit = auditTree(best, { catalog });
    const reviews = reviewsFromArtifact(best, grounded, audit, catalog);
    gate = runGate(reviews, options.gate);
    gateSource = 'artifact';
  }
  const verdict = gate ? gate.status : 'not-run';
  emit({ type: 'gate.verdict', status: verdict, axes: gate?.state ?? AXES.reduce((acc, a) => ({ ...acc, [a]: 0 }), {}), source: gateSource, at: now() });
  stage('gate', 'done', { verdict, source: gateSource });

  // ── Center report: artifact + named next gate + Loom propose event ──────
  const nextGate = nameNextGate(gate);
  const propose = best
    ? {
        writer: 'agent',
        kind: 'propose',
        node: '.ui-forge',
        body: {
          title: effectiveSpec?.title ?? 'ui-forge surface',
          candidateCount: Array.isArray(candidates) ? candidates.length : 0,
          admissible: admissible.length,
          survivors: survivors.length,
          bestTree: best,
          gate: gate ? gate.status : 'not-run',
          nextGate,
        },
      }
    : null;

  stage('final', 'start', { tier, fellBack });
  emit({ type: 'artifact.final', tree: best, artifact: best, tier, fellBack, survivors: survivors.length, at: now() });
  stage('final', 'done', { tier, fellBack, tree: best });

  return {
    artifact: best,
    nextGate,
    survivors: survivors.map((s) => ({ tree: s.tree, score: s.score })),
    kills: [...kills.map((k) => ({ reason: k.reason, tree: k.candidate?.tree })), ...inadmissibleKills],
    gate,
    propose,
    fellBack,
    tier,
    logs: {
      groundedFacts: grounded.facts.length,
      gaps: grounded.gaps.length,
      dreamerCount,
      candidates: Array.isArray(candidates) ? candidates.length : 0,
      shaped: shaped.length,
      admissible: admissible.length,
      inadmissible: inadmissible.length,
      survivors: survivors.length,
      tier,
      fellBack,
      axes: AXES,
    },
  };
}

/** Paragraph-length detail for the Grounder — what it read, the facts it
 *  extracted, and the gaps it found. Written from the real data. */
function describeGrounding(spec, grounded) {
  const entityNames = (grounded.entities ?? []).map((e) => e.name ?? e.id).filter(Boolean);
  const actionNames = (grounded.actions ?? []).map((a) => a.name ?? (typeof a === 'string' ? a : null)).filter(Boolean);
  const facts = (grounded.facts ?? []).map((f) => f.kind).filter(Boolean);
  const gaps = (grounded.gaps ?? []).map((g) => g.kind ?? g.detail).filter(Boolean);
  const briefDesc = spec?.title
    ? `I read your brief "${spec.title}"`
    : 'I read your brief';
  const entitiesDesc = entityNames.length
    ? `I identified ${entityNames.length} entit${entityNames.length === 1 ? 'y' : 'ies'} (${entityNames.join(', ')})`
    : 'I found no named entities';
  const actionsDesc = actionNames.length
    ? ` and ${actionNames.length} action${actionNames.length === 1 ? '' : 's'} (${actionNames.join(', ')})`
    : ' and no named actions';
  const factsDesc = facts.length
    ? ` That gave me ${facts.length} grounding fact${facts.length === 1 ? '' : 's'} (${facts.join(', ')})`
    : ' The brief is thin — I fell back to a simple, calm default so the pipeline always produces something';
  const gapsDesc = gaps.length
    ? ` I flagged ${gaps.length} gap${gaps.length === 1 ? '' : 's'} — ${gaps.join(', ')} — which the Dreamer may not cover.`
    : ' I found no gaps.';
  return `${briefDesc} as a request for something calm and usable. ${entitiesDesc}${actionsDesc}.${factsDesc}.${gapsDesc}`;
}

/** Paragraph-length detail for the Dreamer — what candidates it wrote and why. */
function describeDream(dreamerCount, candidates, catalog, spec, usedCatalogWalk, dreamError) {
  if (dreamError) {
    return `The model provider failed (${String(dreamError).slice(0, 120)}), so I fell back to a deterministic catalog walk over the canon. This guarantees a valid starting layout — refine the brief and the model can do better.`;
  }
  const types = (candidates ?? [])
    .map((c) => (c && typeof c === 'object' ? c.type : null))
    .filter(Boolean);
  if (usedCatalogWalk) {
    return `The model returned nothing usable, so I walked the canon catalog deterministically. I produced ${candidates.length} canonical layouts (${types.slice(0, 4).join(', ')}) — structurally valid, bound to your data, ready to refine.`;
  }
  const typeDesc = types.length ? ` The root shapes I considered: ${types.slice(0, 4).join(', ')}.` : '';
  return `I generated ${dreamerCount} candidate layouts for ${spec?.title ?? 'your brief'}. Each is a different take — some prioritize glanceability, some density, some calm.${typeDesc} I also seeded the pool with 2 canonical walk layouts so there is always at least one admissible candidate.`;
}

/** Paragraph-length detail for the Shaper — what it repaired. */
function describeRepair(repairsApplied, shaped) {
  const walked = (shaped ?? []).filter((s) => s.isWalk).length;
  const dreamerShaped = (shaped ?? []).length - walked;
  const auditCodes = [];
  for (const s of shaped ?? []) {
    for (const a of s.audit ?? []) {
      if (a && a.code && !auditCodes.includes(a.code)) auditCodes.push(a.code);
    }
  }
  const shapedDesc = `I shaped ${(shaped ?? []).length} candidates against the canon (${dreamerShaped} from the model, ${walked} canonical)`;
  if (repairsApplied === 0) {
    return `${shapedDesc}. None needed repair — they were already canon-clean.`;
  }
  const codesDesc = auditCodes.length ? ` The repair classes were: ${auditCodes.join(', ')}.` : '';
  return `${shapedDesc}. I applied ${repairsApplied} deterministic repairs — aligning tokens to canon equivalents, coercing types, dropping undeclared props, and filling declared defaults.${codesDesc} Repairs are deterministic: no model re-invocation, no hallucination risk.`;
}

/** Paragraph-length detail for the Governor — who passed and why. */
function describeGovern(admissible, survivors, inadmissible) {
  const surv = survivors ?? [];
  const scoreDesc = surv.length
    ? ` The survivor${surv.length === 1 ? '' : 's'} scored on binding fidelity, token discipline, and structural cleanliness.`
    : '';
  const inad = (inadmissible ?? []).length;
  const inadDesc = inad
    ? ` ${inad} candidate${inad === 1 ? '' : 's'} were cut for named non-compensatory reasons (unbound data, unknown components, token violations).`
    : ' No candidates were cut.';
  return `I applied the non-compensatory admissibility cut: ${admissible.length} of ${admissible.length + inad} shaped candidates passed, meaning each binds real data and references only canon-valid components and tokens.${scoreDesc}${inadDesc} The winning layout is the one the pipeline will render.`;
}

/**
 * Deterministic SIC-POVM reviews synthesized from the artifact itself — the
 * pure, no-LLM measurement the gate runs when /vision reviews are absent.
 *
 * Each axis is measured against the canon + the grounded facts:
 *   layout-parity     — the artifact carries known canon component types
 *                        (audit has no unknown-type issues)
 *   sensory-safety    — every token resolves through the canon namespace
 *                        (audit has no non-p31/token-not-allowed issues)
 *   identity-surface  — the artifact binds at least one grounded entity/action
 *                        (dataBinding refs resolve to the brief)
 *   motion-interaction— at least one interactive surface (Button/Nav/Dial/…)
 *                        is present so the design can be acted on
 *
 * An artifact that is canon-clean, bound, and interactive measures high on
 * every axis → a genuine `pass`. A fallback skeleton that binds no grounded
 * data or carries unknown types collapses the relevant axis → an honest
 * `incomplete`/`needs-revision` with a named next gate.
 */
export function reviewsFromArtifact(artifact, grounded, audit = [], catalog) {
  const issues = Array.isArray(audit) ? audit : [];
  const unknownTypes = issues.filter((i) => i.code === 'unknown-type');
  const tokenIssues = issues.filter((i) => i.code === 'non-p31-token' || i.code === 'token-not-allowed');

  const boundRefs = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.dataBinding === 'string' && node.dataBinding) boundRefs.add(node.dataBinding);
    for (const c of node.children ?? []) walk(c);
  };
  walk(artifact);
  const groundedNames = new Set([
    ...(grounded?.entities ?? []).map((e) => e.name ?? e.id),
    ...(grounded?.actions ?? []).map((a) => a.name ?? (typeof a === 'string' ? a : null)),
  ].filter(Boolean));
  const boundToGrounded = [...boundRefs].some((ref) =>
    [...groundedNames].some((name) => ref === name || ref.startsWith(`${name}.`) || ref.startsWith(`${name}`))
  );

  const interactiveTypes = new Set([
    'Button', 'BottomNav', 'MobileBottomNav', 'SidebarNav', 'Dropdown',
    'Checkbox', 'CommandPalette', 'CommandTrigger', 'SpoonDial', 'Topbar',
  ]);
  let hasInteractive = false;
  const walkTypes = (node) => {
    if (!node || typeof node !== 'object') return;
    if (interactiveTypes.has(node.type)) hasInteractive = true;
    for (const c of node.children ?? []) walkTypes(c);
  };
  walkTypes(artifact);

  const meanFor = (axis) => {
    switch (axis) {
      case 'layout-parity':
        return unknownTypes.length === 0 ? 8 : 2;
      case 'sensory-safety':
        return tokenIssues.length === 0 ? 8 : 2;
      case 'identity-surface':
        return boundToGrounded ? 8 : 3;
      case 'motion-interaction':
        return hasInteractive ? 7 : 4;
      default:
        return 5;
    }
  };

  return AXES.map((axis) => ({
    axis,
    mean: meanFor(axis),
    verdict: meanFor(axis) >= 6 ? 'pass' : 'fail',
    findings: meanFor(axis) < 6 ? [{ axis, severity: meanFor(axis) < 4 ? 'critical' : 'major', issue: `${axis} collapsed` }] : [],
  }));
}

/** A grounded binding ref for the brief's entities/actions (deterministic
 *  cycling so walkers vary which data they surface). */
function bindingFor(grounded, idx = 0) {
  const pool = [
    ...(grounded?.entities ?? []).map((e) => e.name ?? e.id),
    ...(grounded?.actions ?? []).map((a) => a.name ?? (typeof a === 'string' ? a : null)),
  ].filter((n) => typeof n === 'string' && n.length > 0);
  if (pool.length === 0) return null;
  return pool[((idx % pool.length) + pool.length) % pool.length];
}

/** Deterministic catalog-walk builders: well-known component types (GlassPanel,
 *  Card, MetricBadge, StatusCluster) with the brief's entities bound. These are
 *  the "garbage-but-valid" guarantee — plain, canonical, renderable trees. */
function catalogWalkTrees(k, catalog, grounded, spec) {
  const walkers = [
    (ref) => ({
      id: 'walk-1', type: 'GlassPanel', props: { padding: 'md' },
      children: [
        { id: 'walk-1-card', type: 'Card', props: { title: 'Detail' }, dataBinding: ref },
        { id: 'walk-1-metric', type: 'MetricBadge', props: { label: 'Status' }, dataBinding: ref },
      ],
    }),
    (ref) => ({
      id: 'walk-2', type: 'Card', props: { title: 'Overview' }, dataBinding: ref,
      children: [{ id: 'walk-2-metric', type: 'MetricBadge', props: { label: 'Level' }, dataBinding: ref }],
    }),
    (ref) => ({
      id: 'walk-3', type: 'StatusCluster', props: {},
      children: [{ id: 'walk-3-metric', type: 'MetricBadge', props: { label: 'State' }, dataBinding: ref }],
    }),
    (ref) => ({
      id: 'walk-4', type: 'GlassPanel', props: { padding: 'lg' },
      children: [
        { id: 'walk-4-card', type: 'Card', props: { title: 'Item' }, dataBinding: ref },
        { id: 'walk-4-metric', type: 'MetricBadge', props: { label: 'Count' }, dataBinding: ref },
        { id: 'walk-4-status', type: 'StatusCluster', props: {} },
      ],
    }),
  ];
  const trees = [];
  for (let i = 0; i < k; i++) {
    const ref = bindingFor(grounded, i) ?? 'item';
    trees.push(walkers[i % walkers.length](ref));
  }
  return trees;
}

/** The T4 skeleton: GlassPanel > PageHeader + Card + MetricBadge, binding the
 *  brief's entities where possible. Ships even when the whole pipeline fell
 *  through, flagged `fellBack: true` by the Center. */
function skeletonTree(grounded, spec) {
  const ref = bindingFor(grounded, 0);
  return {
    id: 'fallback-root',
    type: 'GlassPanel',
    props: { padding: 'md' },
    children: [
      { id: 'fallback-header', type: 'PageHeader', props: { eyebrow: 'P31', title: spec?.title ?? 'Surface' } },
      { id: 'fallback-card', type: 'Card', props: { title: ref ?? 'Item' }, dataBinding: ref },
      { id: 'fallback-metric', type: 'MetricBadge', props: { label: 'Status' }, dataBinding: ref },
    ],
  };
}