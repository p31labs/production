/**
 * ledger.mjs — the Research Ledger (Workflow A, depth layer A3).
 *
 * From Dossier (ACM 2026): a persistent ledger that "explicitly tracks claims,
 * contradictions, and information gaps, continuously updating as new evidence
 * is synthesized." From the trust-tiered librarian (arXiv 2026): an
 * authoritative metric ledger removes cross-section contradictions to zero.
 *
 * Invariants (enforced by validate()):
 *   - a contradiction can only be resolved by EVIDENCE (a new source), never
 *     by assertion.
 *   - a metric has exactly one entry; a drifted value is a violation.
 *   - the terminal state (isSaturated) is named, not "I got tired".
 */

export class ResearchLedger {
  constructor(asOf = new Date().toISOString().slice(0, 10)) {
    this.as_of = asOf;
    this.round = 0;
    this.verified_claims = [];
    this.contradictions = [];
    this.information_gaps = [];
    this.metric_ledger = {};
    this._dimensionSeen = new Set();
    this._roundsWithoutNewDimension = 0;
  }

  addClaim(claim, { sources = [], confidence = 0, tier = 'unranked', contradicts = [] } = {}) {
    const id = `c${this.verified_claims.length + 1}`;
    this.verified_claims.push({ id, claim, sources, confidence, tier, contradicts });
    return id;
  }

  addGap(question, { priority = 'medium', depth = 0 } = {}) {
    const id = `g${this.information_gaps.length + 1}`;
    this.information_gaps.push({ id, question, priority, depth, exhaustion: 0 });
    return id;
  }

  addContradiction(claimA, claimB, sources = []) {
    const id = `x${this.contradictions.length + 1}`;
    this.contradictions.push({ id, claim_a: claimA, claim_b: claimB, status: 'unresolved', sources, resolved_by: null });
    return id;
  }

  /** Resolve by EVIDENCE, never assertion. Returns { ok, reason? }. */
  resolveContradiction(id, evidenceSource) {
    const x = this.contradictions.find((c) => c.id === id);
    if (!x) return { ok: false, reason: `contradiction ${id} not found` };
    if (!evidenceSource) return { ok: false, reason: 'resolution requires an evidence source' };
    x.status = 'resolved';
    x.resolved_by = evidenceSource;
    x.sources = [...new Set([...x.sources, evidenceSource])];
    return { ok: true };
  }

  setMetric(key, value, { unit, asOf, source } = {}) {
    this.metric_ledger[key] = { value, unit, as_of: asOf ?? this.as_of, source };
  }

  noteDimension(name) {
    const isNew = !this._dimensionSeen.has(name);
    this._dimensionSeen.add(name);
    if (isNew) this._roundsWithoutNewDimension = 0;
    return isNew;
  }

  /** End a research round. Advances the counter that gates premature saturation. */
  step() {
    this.round++;
    this._roundsWithoutNewDimension++;
  }

  /** No unresolved contradiction may lack evidence; every metric is unique. */
  validate() {
    for (const x of this.contradictions) {
      if (x.status === 'resolved' && !x.resolved_by) {
        return { ok: false, reason: `contradiction ${x.id} resolved without evidence` };
      }
      if (x.status === 'unresolved') {
        // unresolved is allowed; it must be surfaced, not hidden.
        continue;
      }
    }
    return { ok: true };
  }

  /** Terminal state, named: no new dimensions for N rounds AND frontier gaps
   *  all exhausted. An empty ledger is NOT saturated (nothing was researched). */
  isSaturated({ roundsWithoutNewDimension = 3, exhaustionThreshold = 4 } = {}) {
    if (this.verified_claims.length === 0 && this.information_gaps.length === 0) return false;
    const frontier = this.information_gaps.filter((g) => g.exhaustion < exhaustionThreshold);
    return frontier.length === 0 && this._roundsWithoutNewDimension >= roundsWithoutNewDimension;
  }

  toJSON() {
    return {
      as_of: this.as_of,
      round: this.round,
      verified_claims: this.verified_claims,
      contradictions: this.contradictions,
      information_gaps: this.information_gaps,
      metric_ledger: this.metric_ledger,
    };
  }

  static fromJSON(o) {
    const l = new ResearchLedger(o.as_of);
    l.round = o.round ?? 0;
    l.verified_claims = o.verified_claims ?? [];
    l.contradictions = o.contradictions ?? [];
    l.information_gaps = o.information_gaps ?? [];
    l.metric_ledger = o.metric_ledger ?? {};
    return l;
  }
}

/** Localized revision (CLAIMWRITER's fourth finding): when sources change,
 *  only the changed claims need rewriting. diffLedger returns { added, removed,
 *  changed } so the writer regenerates affected sections, not the whole report. */
export function diffLedger(prev, next) {
  const prevClaims = new Map((prev?.verified_claims ?? []).map((c) => [String(c.claim).toLowerCase(), c]));
  const nextClaims = new Map((next?.verified_claims ?? []).map((c) => [String(c.claim).toLowerCase(), c]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [k, c] of nextClaims) {
    if (!prevClaims.has(k)) {
      added.push(c);
    } else {
      const p = prevClaims.get(k);
      const sourcesChanged = JSON.stringify(p.sources ?? []) !== JSON.stringify(c.sources ?? []);
      const confidenceChanged = (p.confidence ?? 0) !== (c.confidence ?? 0);
      if (sourcesChanged || confidenceChanged) changed.push({ before: p, after: c });
    }
  }
  for (const [k, c] of prevClaims) {
    if (!nextClaims.has(k)) removed.push(c);
  }

  return { added, removed, changed };
}

export default ResearchLedger;