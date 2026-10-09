/**
 * orchestrator.mjs — the orthogonal-researcher core (Workflow A, depth A2).
 *
 * The deterministic layer under the LLM fan-out. The LLM produces the domain
 * table and the findings; this module validates them. Everything here is a
 * pure function — no model call — so it is testable offline with stubs.
 *
 * From the parallel-search skill: "Divide by research domain, NOT by source
 * type. Each agent owns a vertical slice of a topic. All domains together
 * should be collectively exhaustive — no gaps." Default 3–5 sub-agents; up to
 * 20 only when axes are truly independent, the topic is broad, and each
 * sub-agent gets a self-contained prompt.
 *
 * From Anthropic: subagents write findings to external storage and return
 * references, not text.
 */

import { collapseSameRoot, effectiveSampleSize } from './factcheck.mjs';

const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'on', 'with', 'by', 'at', 'from', 'is', 'are', 'how', 'what', 'why', 'who', 'when', 'where']);

/** The domain-table contract: every entry has the four required fields. */
export function validateDomainTable(table) {
  if (!Array.isArray(table) || table.length === 0) return { ok: false, reason: 'empty table' };
  for (const [i, e] of table.entries()) {
    if (!e?.domain) return { ok: false, reason: `entry ${i} missing domain` };
    if (!e?.variant) return { ok: false, reason: `entry ${i} missing variant` };
    if (!e?.assigned_model) return { ok: false, reason: `entry ${i} missing assigned_model` };
    if (!e?.prompt_template) return { ok: false, reason: `entry ${i} missing prompt_template` };
  }
  return { ok: true };
}

/** Tokenize to non-stopword terms. */
function terms(s) {
  return String(s).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** MECE check: no two domains share a vertical slice. Overlap = shared
 *  non-stopword terms above `threshold` (default 2). Returns { ok, overlaps }. */
export function checkMece(table, { threshold = 2 } = {}) {
  const overlaps = [];
  for (let i = 0; i < table.length; i++) {
    for (let j = i + 1; j < table.length; j++) {
      const a = new Set(terms(`${table[i].domain} ${table[i].variant}`));
      const b = new Set(terms(`${table[j].domain} ${table[j].variant}`));
      const shared = [...a].filter((t) => b.has(t));
      if (shared.length >= threshold) {
        overlaps.push({ a: table[i].domain, b: table[j].domain, shared });
      }
    }
  }
  return { ok: overlaps.length === 0, overlaps };
}

/** Fan-out ceiling: ≤5 agents by default; ≤20 only with the independence proof. */
export function validateFanOut(table, { independenceProven = false } = {}) {
  const n = table.length;
  const max = independenceProven ? 20 : 5;
  if (n > max) return { ok: false, reason: `${n} agents exceed the ${max}-agent ceiling` };
  return { ok: true };
}

/** The file-backed return contract: a researcher returns a path; the
 *  orchestrator validates the file exists, is non-empty, and carries a header. */
export function validateResearchNote(path, { readNote }) {
  if (!path) return { ok: false, reason: 'no path returned' };
  const content = readNote ? readNote(path) : null;
  if (content == null) return { ok: false, reason: `note missing: ${path}` };
  if (String(content).trim().length === 0) return { ok: false, reason: `note empty: ${path}` };
  if (!/^#\s+/m.test(content)) return { ok: false, reason: `note lacks a title: ${path}` };
  return { ok: true };
}

/** Aggregate N researchers' findings into one confidence picture. Applies
 *  same-root collapse + the Kish effective sample size. Each finding is
 *  { claim, sources: [url], confidence }. Returns { claims: [...] }. */
export function aggregateFindings(findings) {
  const byClaim = new Map();
  for (const f of findings ?? []) {
    const key = String(f.claim).trim().toLowerCase();
    if (!key) continue;
    if (!byClaim.has(key)) byClaim.set(key, { claim: f.claim, sources: [], confidences: [] });
    const agg = byClaim.get(key);
    agg.sources.push(...(f.sources ?? []));
    if (typeof f.confidence === 'number') agg.confidences.push(f.confidence);
  }
  const claims = [];
  for (const agg of byClaim.values()) {
    const independent = collapseSameRoot(agg.sources);
    // Kish: corroboration weight uses effective (not nominal) sample size.
    const phi = agg.sources.length > 0 ? 1 - independent.length / agg.sources.length : 0;
    const nEff = effectiveSampleSize(agg.sources.length, phi);
    const meanConf = agg.confidences.length
      ? agg.confidences.reduce((a, b) => a + b, 0) / agg.confidences.length : 0;
    claims.push({
      claim: agg.claim,
      nominal_sources: agg.sources.length,
      independent_warrants: independent.length,
      n_eff: Math.round(nEff * 100) / 100,
      confidence: Math.round(meanConf * 100) / 100,
    });
  }
  return { claims };
}

/** The deterministic supervisor loop. From SupervisorAgent (ICLR 2026): an
 *  LLM-free filter that intervenes at critical nodes and cuts token use ~30%
 *  without losing success. From the typed-state-machine pattern: "agents
 *  should execute, state machines should route." The DECISION to prune,
 *  summarize, or stop is deterministic; only the summary CONTENT is an LLM call.
 *
 *  nextAction(state) → 'continue' | 'summarize' | 'prune' | 'stop'. */
export function nextAction({ saturated, contextTokens, tokenBudget, completedSubgoals = 0, summarizeThreshold = 5 } = {}) {
  if (saturated) return 'stop';
  if (contextTokens > tokenBudget) return 'prune';
  if (completedSubgoals >= summarizeThreshold) return 'summarize';
  return 'continue';
}

/** Turn-atomic pruning: drop oldest WHOLE turns (an assistant tool-call message
 *  together with ALL its tool_result replies) so the tool-call/tool-result
 *  pairing is never broken. From ADR-107. Each turn is an array of messages;
 *  returns the pruned turns + the token count of what remains. */
export function pruneTurnAtomic(turns, tokenBudget, countTokens = (m) => String(m?.content ?? '').length / 4) {
  let tokens = 0;
  const kept = [];
  for (let i = turns.length - 1; i >= 0; i--) {
    const turnTokens = (turns[i] ?? []).reduce((s, m) => s + countTokens(m), 0);
    if (tokens + turnTokens <= tokenBudget || kept.length === 0) {
      kept.unshift(turns[i]);
      tokens += turnTokens;
    } else {
      break;
    }
  }
  return { kept, tokens };
}

/** Semantic-summarize trigger: structure completed sub-goals into summaries
 *  once they exceed the threshold. The decision is deterministic; the summary
 *  text is an LLM call. Returns { shouldSummarize, completed }. */
export function shouldSummarize(completedSubgoals, threshold = 5) {
  return { shouldSummarize: completedSubgoals >= threshold, completed: completedSubgoals };
}

/** The writer-from-ledger bridge (CLAIMWRITER): the writer drafts from the
 *  ledger's source-linked claim representation, NOT raw notes. "Facts lose
 *  structure and provenance during writing" — this restores it by passing the
 *  writer a claim-grounded structure instead of prose. */
export function writerContext(ledger, { groupBy = null } = {}) {
  const claims = (ledger?.verified_claims ?? []).map((c) => ({
    claim: c.claim,
    sources: c.sources ?? [],
    confidence: c.confidence ?? 0,
    tier: c.tier ?? 'unranked',
    contradicts: c.contradicts ?? [],
  }));
  const sections = [];
  if (typeof groupBy === 'function') {
    const groups = new Map();
    for (const c of claims) {
      const key = groupBy(c) ?? 'Uncategorized';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    for (const [heading, items] of groups) sections.push({ heading, claims: items });
  } else {
    sections.push({ heading: 'Findings', claims });
  }
  return {
    as_of: ledger?.as_of ?? null,
    sections,
    contradictions: ledger?.contradictions ?? [],
    gaps: ledger?.information_gaps ?? [],
    metrics: ledger?.metric_ledger ?? {},
  };
}

export default {
  validateDomainTable, checkMece, validateFanOut, validateResearchNote, aggregateFindings,
  nextAction, pruneTurnAtomic, shouldSummarize, writerContext,
};