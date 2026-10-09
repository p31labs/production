/**
 * factcheck.mjs — the deterministic fact-check gate (Workflow A, depth A4).
 *
 * From factgate: the gate is a small, deterministic, pure function — it never
 * asks the model whether its own claim is true. From Provenance Is Not
 * Independence (arXiv 2602.00428): same-root citations must collapse to one
 * warrant before any corroboration tally.
 *
 * Four verdicts, exactly one per claim:
 *   VERIFIED · CONTRADICTED · OUT_OF_KB · UNRESOLVED
 *
 * Stage 1 (this file) is deterministic and costs zero tokens. Stage 2 (the
 * skeptical LLM judge) is a thin, opt-in layer above it.
 */

/** Kish effective sample size: n_eff = k / (1 + (k−1)φ). Nine agents echoing
 *  one press release are fewer than three effective votes (φ≈0.85 → n_eff≈2.2). */
export function effectiveSampleSize(k, phi) {
  if (k <= 0) return 0;
  const p = Math.min(1, Math.max(0, phi));
  return k / (1 + (k - 1) * p);
}

/** Collapse same-root citations to a single unit of warrant. Two sources share
 *  a root when their domain + publication root match (same wire, scraper,
 *  press release). Returns the collapsed citation list. */
export function collapseSameRoot(citations) {
  const seen = new Set();
  const collapsed = [];
  for (const c of citations) {
    const root = citationRoot(c);
    if (seen.has(root)) continue;
    seen.add(root);
    collapsed.push(c);
  }
  return collapsed;
}

/** The citation root: domain + a normalized path prefix (drop query, fragment,
 *  and trailing slugs). Same root = same epistemic ancestor. */
export function citationRoot(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '').split('/').slice(0, 3).join('/');
    return `${u.hostname}${path}`;
  } catch {
    return String(url);
  }
}

/** Metric-ledger consistency: every number that appears in the report must
 *  match the ledger. Returns the list of drifted metrics. */
export function checkMetricConsistency(reportText, ledger) {
  const drifted = [];
  const entries = Object.entries(ledger.metric_ledger ?? {});
  for (const [key, meta] of entries) {
    if (typeof meta.value !== 'number') continue;
    const re = new RegExp(`\\b${key}\\b[^\\n]*?\\b(${Math.abs(meta.value)})`, 'i');
    // Heuristic: flag when a different numeric value appears near the metric key.
    const m = String(reportText).match(new RegExp(`${key}[^0-9]{0,20}([0-9][0-9.,]*[0-9])`, 'i'));
    if (m) {
      const seen = parseFloat(m[1].replace(/,/g, ''));
      if (Number.isFinite(seen) && Math.abs(seen - meta.value) > 0.001) {
        drifted.push({ key, ledger: meta.value, report: seen });
      }
    }
  }
  return drifted;
}

/** Resolve a claim to exactly one of four verdicts, given the ledger's source
 *  knowledge. Deterministic — no model call. */
export function verdict(claim, { ledger, sources = [], sourceFor = () => null } = {}) {
  // A claim without any cited source is OUT_OF_KB (cannot be verified).
  if (!sources || sources.length === 0) return { verdict: 'OUT_OF_KB', reason: 'no cited source' };

  // Collapse same-root citations first — corroboration counts collapsed warrants.
  const independent = collapseSameRoot(sources);

  // Contradicted: a verified claim lists this claim as one it directly opposes.
  for (const c of ledger?.verified_claims ?? []) {
    if (Array.isArray(c.contradicts) && c.contradicts.some((t) => String(t).toLowerCase() === String(claim).toLowerCase())) {
      return { verdict: 'CONTRADICTED', reason: `ledger claim ${c.id} contradicts this` };
    }
  }

  // Verified: the ledger holds the exact claim.
  for (const c of ledger?.verified_claims ?? []) {
    if (c.claim && claim && c.claim.toLowerCase() === claim.toLowerCase()) {
      return { verdict: 'VERIFIED', reason: 'ledger holds the claim' };
    }
  }

  // A single collapsed source is UNRESOLVED (ambiguous, not independently confirmed).
  if (independent.length < 2) {
    return { verdict: 'UNRESOLVED', reason: 'single warrant — no independent corroboration' };
  }

  return { verdict: 'VERIFIED', reason: `corroborated by ${independent.length} independent warrants`, warrants: independent.length };
}

export default { effectiveSampleSize, collapseSameRoot, citationRoot, checkMetricConsistency, verdict };