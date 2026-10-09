/**
 * context.mjs — lossless context trimming + closed-loop compaction.
 *
 * From CMV (Contextual Memory Virtualisation, Imperial College): a three-pass
 * structurally lossless trim that preserves every user message and assistant
 * response verbatim while stripping mechanical bloat — raw tool outputs,
 * base64 payloads, metadata. Mean 20% reduction, up to 86% on mixed tool-use.
 *
 * From the effective-agent-history paper: compression is a CLOSED-LOOP process.
 * A failed summarization proposal leaves its source span unchanged; on routing
 * or validation failure the controller returns the previous valid history.
 *
 * Both are pure, deterministic, offline-testable. The summarization CONTENT is
 * an LLM call; the DECISION to commit or roll back is not.
 */

const BASE64_RE = /data:[a-zA-Z0-9.+/_-]+;base64,[A-Za-z0-9+/=\s]+/g;

/** Three-pass structurally lossless trim. User + assistant TEXT is preserved
 *  verbatim; tool payloads, tool-call arguments, and base64 are stripped. */
export function stripMechanicalBloat(messages) {
  return (messages ?? []).map((m) => {
    const role = m?.role;

    // Pass 1 — raw tool/function outputs: the assistant already summarized them.
    if (role === 'tool' || role === 'function') {
      return { ...m, content: '[tool output trimmed]', trimmed: true };
    }

    // Pass 2 — assistant tool-call arguments: mechanical, not conversational.
    if (role === 'assistant' && Array.isArray(m?.tool_calls)) {
      return {
        ...m,
        tool_calls: m.tool_calls.map((tc) => ({
          ...tc,
          function: { name: tc?.function?.name ?? 'tool', arguments: '[arguments trimmed]' },
        })),
        trimmed: true,
      };
    }

    // Pass 3 — base64 payloads in any textual content.
    if (typeof m?.content === 'string' && BASE64_RE.test(m.content)) {
      return { ...m, content: m.content.replace(BASE64_RE, '[image]'), trimmed: true };
    }

    return m; // user + assistant text preserved verbatim
  });
}

/** Count tokens with a simple heuristic (chars/4). Injected for testability. */
export function countTokens(messages, count = (m) => String(m?.content ?? '').length / 4) {
  return (messages ?? []).reduce((s, m) => s + count(m), 0);
}

/** Report the token reduction from a trim. Returns { before, after, savedPct }. */
export function trimReport(before, after, count = (m) => String(m?.content ?? '').length / 4) {
  const b = countTokens(before, count);
  const a = countTokens(after, count);
  return { before: b, after: a, savedPct: b > 0 ? Math.round(((b - a) / b) * 100) : 0 };
}

/** Closed-loop compaction: commit a new effective history only if it validates;
 *  on failure, the previous valid history is returned unchanged. */
export function commitCompaction(history, next, validate = () => true) {
  if (!validate(next)) {
    return { ok: false, reason: 'compaction validation failed', history, rolledBack: true };
  }
  return { ok: true, history: next, previous: history };
}

export default { stripMechanicalBloat, countTokens, trimReport, commitCompaction };