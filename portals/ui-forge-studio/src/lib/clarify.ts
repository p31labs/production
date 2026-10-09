/**
 * clarify.ts — the clarifying-questions gate (the research-backed ask).
 *
 * When a few details could significantly improve the result, the Forge pauses
 * and asks instead of guessing (Netlify Agent Runners / ClearFairy / ToMigo).
 * Answering is always optional — every question has a Skip, and there is a
 * Skip-all door.
 *
 * Each question has a shape (id, prompt, inputType, how the answer becomes a
 * /api/refine instruction) so the UI and the store both know how to handle it.
 */

export interface ClarifyQuestion {
  id: string;
  prompt: string;
  placeholder: string;
  inputType: 'text';
  /** Turn the user's answer into a refine instruction appended to the brief. */
  refineTemplate: (answer: string) => string;
}

/** The thin-brief questions — derived from the gaps that block the compiler. */
export const CLARIFY_QUESTIONS: ClarifyQuestion[] = [
  {
    id: 'entities',
    prompt: 'What should this surface show?',
    placeholder: 'a list of tasks, a spoon balance, a recipe…',
    inputType: 'text',
    refineTemplate: (answer) => `add entities for: ${answer}`,
  },
  {
    id: 'actions',
    prompt: 'What should someone be able to do here?',
    placeholder: 'log it, mark it done, add a new one…',
    inputType: 'text',
    refineTemplate: (answer) => `add actions for: ${answer}`,
  },
  {
    id: 'goal',
    prompt: 'Who is this for — you, the family, or someone else?',
    placeholder: 'you, the family, a class…',
    inputType: 'text',
    refineTemplate: (answer) => 'make the goal: ' + answer,
  },
];

export interface ClarifyGaps {
  entities: boolean;
  actions: boolean;
  goal: boolean;
}

/** The brief shape the clarify gate inspects. */
type BriefForClarify = { entities: unknown[]; actions: unknown[]; goal?: string };

/**
 * A brief is "thin" when it has no entities, no actions, or a too-thin goal —
 * any gap leaves the Dreamer nothing to bind to and the Governor nothing to
 * admit. The clarify gate triggers on these gaps.
 */
export function clarifyGaps(brief: BriefForClarify | null): ClarifyGaps {
  if (!brief) return { entities: true, actions: true, goal: true };
  return {
    entities: brief.entities.length === 0,
    actions: brief.actions.length === 0,
    goal: (brief.goal ?? '').trim().length < 8,
  };
}

/** Confidence that the brief is ready to compile, from the open gaps. */
export function confidenceOf(brief: BriefForClarify | null): 'high' | 'medium' | 'low' {
  const gaps = clarifyGaps(brief);
  const open = (Object.keys(gaps) as Array<keyof ClarifyGaps>).filter((k) => gaps[k]).length;
  if (open === 0) return 'high';
  if (open === 1) return 'medium';
  return 'low';
}

/** Whether the clarify gate should still ask — confidence below 'high'. */
export function shouldClarify(brief: BriefForClarify | null): boolean {
  return confidenceOf(brief) !== 'high';
}

/** The questions the user still needs to answer, given the brief's gaps. */
export function pendingQuestions(brief: BriefForClarify | null): ClarifyQuestion[] {
  const gaps = clarifyGaps(brief);
  return CLARIFY_QUESTIONS.filter((q) => gaps[q.id as keyof ClarifyGaps]);
}