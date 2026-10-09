/**
 * intake.mjs — the guided intake gate (Workflow A, depth layer A1).
 *
 * Every production deep-research system enforces a mandatory intake checkpoint
 * before any search runs:
 *   - Gemini: collaborative_planning=True → proceed only if the user confirms
 *     the plan in the next turn.
 *   - LobeHub deep-research: "Confirm intake_checkpoint_complete=YES. Intake
 *     must at least define: objective/scope, constraints, expected deliverable
 *     format. If intake is incomplete, remain in clarification."
 *   - Claude: three-bucket scope draft (Stated / Inferred / Out of scope), emit
 *     and wait for confirmation.
 *
 * This module is the DETERMINISTIC gate: the three-bucket structure + the
 * completion check. The LLM fills the buckets; the gate decides whether the
 * checkpoint is complete. No search runs until intake_checkpoint_complete=YES.
 */

const REQUIRED_FIELDS = ['objective', 'scope', 'constraints', 'deliverable_format'];

/** Draft the three-bucket scope skeleton. The caller fills buckets via an LLM;
 *  this returns the empty structure + a blocking flag. */
export function draftScope(dump = '') {
  return {
    stated: [],
    inferred: [],
    out_of_scope: [],
    objective: null,
    constraints: [],
    deliverable_format: null,
    dump_length: String(dump ?? '').length,
    needs_confirmation: true,
  };
}

/** The completion gate: every required field must be present and non-empty. */
export function intakeCheckpointComplete(draft) {
  if (!draft) return false;
  for (const f of REQUIRED_FIELDS) {
    const v = draft[f];
    if (v == null) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    if (typeof v === 'string' && v.trim() === '') return false;
  }
  return true;
}

/** A dump with no storable content cannot clear intake. */
export function hasContent(draft) {
  return (draft?.dump_length ?? 0) > 0;
}

export default { draftScope, intakeCheckpointComplete, hasContent, REQUIRED_FIELDS };