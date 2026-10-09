/**
 * repair.mjs — deterministic repair primitives for the never-fail pipeline.
 *
 * Pure functions, no I/O, no dependencies. Used by the Shaper (token + prop
 * repair) and the Governor (binding alignment) so a near-miss NEVER becomes a
 * dropped token, a clamped enum, or a spurious `noBinding` kill — but a real
 * miss is still dropped. Repair is conservative: it only substitutes when the
 * evidence (edit distance / unambiguous prefix-substring) is strong, and it
 * NEVER invents a binding where none exists.
 */

/** Standard Levenshtein edit distance between two strings (O(n·m)). */
export function levenshtein(a, b) {
  a = String(a ?? '');
  b = String(b ?? '');
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

/** Closest allowed token if edit distance ≤ 2, else null. Ties break
 *  deterministically (lexicographically smallest). */
export function nearestToken(token, allowedSet) {
  if (!allowedSet || allowedSet.size === 0) return null;
  let best = null;
  let bestDist = Infinity;
  for (const candidate of allowedSet) {
    const d = levenshtein(token, candidate);
    if (d < bestDist || (d === bestDist && best != null && candidate < best)) {
      bestDist = d;
      best = candidate;
    }
  }
  return bestDist <= 2 ? best : null;
}

/** Closest grounded entity/action name for a dataBinding ref, if the evidence
 *  is strong: edit distance ≤ 2, OR the ref is a prefix/substring of exactly
 *  one name. Never invents a binding — returns null otherwise. */
export function nearestBinding(ref, grounded) {
  const entities = grounded?.entities ?? [];
  const actions = grounded?.actions ?? [];
  const names = [
    ...entities.map((e) => e.name ?? e.id ?? null),
    ...actions.map((a) => a.name ?? (typeof a === 'string' ? a : null)),
  ].filter((n) => typeof n === 'string' && n.length > 0);
  if (names.length === 0) return null;

  ref = String(ref ?? '');

  // Exact match — the ref already binds.
  if (names.includes(ref)) return ref;

  // Unambiguous prefix/substring match (exactly one name).
  const containing = names.filter((n) => n.startsWith(ref) || n.includes(ref));
  if (containing.length === 1) return containing[0];

  // Edit-distance match ≤ 2. Ties break deterministically (lexicographic).
  let best = null;
  let bestDist = Infinity;
  for (const n of names) {
    const d = levenshtein(ref, n);
    if (d < bestDist || (d === bestDist && best != null && n < best)) {
      bestDist = d;
      best = n;
    }
  }
  return bestDist <= 2 ? best : null;
}

/** Coerce a value to an expected primitive type. On any doubt, returns the
 *  value unchanged (repair is conservative — never a destructive cast). */
export function coerceType(value, expected) {
  if (expected === 'number') {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
    return value;
  }
  if (expected === 'boolean') {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }
  if (expected === 'string') {
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
    return value;
  }
  return value;
}