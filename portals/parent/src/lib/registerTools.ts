import { registerWebMCPTool, setupGlobalWebMCPExecutor, listWebMCPToolDefinitions } from './webmcp';
import type { WebMCPInputSchema } from './webmcp';
import * as cog from '@p31/ui';

const strProp = (name: string, description: string): WebMCPInputSchema => ({
  type: 'object',
  properties: { [name]: { type: 'string', description } },
  required: [name],
  additionalProperties: false,
});
const optStr = (name: string, description: string): WebMCPInputSchema => ({
  type: 'object',
  properties: { [name]: { type: 'string', description } },
  additionalProperties: false,
});

export function registerCognitiveWebMCPTools(): void {

  registerWebMCPTool('remember', 'Store a durable memory note locally (upgraded from CLI in-process stub).', strProp('text', 'The memory to persist.'), ({ text }) => cog.remember(String(text), ['webmcp']));
  registerWebMCPTool('recall', 'Find saved memories by keyword overlap.', {
    type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false,
  }, ({ query }) => cog.recall(String(query)));
  registerWebMCPTool('listMemories', 'List recent saved memories.', { type: 'object', properties: {}, additionalProperties: false }, () => cog.listMemories());

  registerWebMCPTool('crisisCheck', 'Scan a message for rumination, hyperfocus, or distress signals; return guards.', strProp('message', 'The message to evaluate.'), ({ message }) => cog.crisisCheck(String(message)));
  registerWebMCPTool('taskBreakdown', 'Decompose a goal into an ordered list of subtasks.', {
    type: 'object', properties: { goal: { type: 'string' }, max_subtasks: { type: 'integer', minimum: 1, maximum: 12 } }, required: ['goal'], additionalProperties: false,
  }, ({ goal, max_subtasks }) => cog.taskBreakdown(String(goal), Number(max_subtasks) || 6));
  registerWebMCPTool('timeEstimate', 'Estimate minutes to complete a task from complexity and current spoon level (0–5).', {
    type: 'object', properties: { task: { type: 'string' }, complexity: { type: 'string', enum: ['low', 'medium', 'high'] }, spoons: { type: 'integer', minimum: 0, maximum: 5 } }, required: ['task'], additionalProperties: false,
  }, ({ task, complexity, spoons }) => cog.timeEstimate(String(task), (complexity as 'low' | 'medium' | 'high') || 'medium', Number(spoons) || 3));
  registerWebMCPTool('scheduleChunk', 'Break a total time budget into spoon-aware chunks with rest breaks.', {
    type: 'object', properties: { total_minutes: { type: 'integer', minimum: 1 }, spoons: { type: 'integer', minimum: 0, maximum: 5 }, label: { type: 'string' } }, required: ['total_minutes'], additionalProperties: false,
  }, ({ total_minutes, spoons, label }) => cog.scheduleChunk(Number(total_minutes), Number(spoons) || 3, String(label || 'session')));

  registerWebMCPTool('prioritize', 'Rank tasks by urgency, importance, and energy cost for right-now ordering.', {
    type: 'object', properties: { tasks: { type: 'array', items: { type: 'object' } } }, required: ['tasks'], additionalProperties: false,
  }, ({ tasks }) => cog.prioritize((tasks as { name: string; urgency?: number; importance?: number; energy?: number }[]) || []));
  registerWebMCPTool('decisionTree', 'Generate a structured decision aid for a hard choice.', {
    type: 'object', properties: { question: { type: 'string' }, options: { type: 'array', items: { type: 'string' } } }, required: ['question'], additionalProperties: false,
  }, ({ question, options }) => cog.decisionTree(String(question), (options as string[]) || []));
  registerWebMCPTool('motionReduce', 'Return CSS + data-spoons guidance to reduce UI motion for a spoon level.', {
    type: 'object', properties: { spoons: { type: 'integer', minimum: 0, maximum: 5 } }, additionalProperties: false,
  }, ({ spoons }) => cog.motionReduce(Number(spoons) || 3));
  registerWebMCPTool('contrastScale', 'Check WCAG contrast between bg/fg and suggest AAA-safe adjustments.', {
    type: 'object', properties: { bg: { type: 'string' }, fg: { type: 'string' } }, additionalProperties: false,
  }, ({ bg, fg }) => cog.contrastScale(String(bg || '#0b0e14'), String(fg || '#e5e7eb')));
  registerWebMCPTool('summarize', 'Extractive summary: reduce a long text to the N most salient sentences.', {
    type: 'object', properties: { text: { type: 'string' }, points: { type: 'integer', minimum: 1, maximum: 10 } }, required: ['text'], additionalProperties: false,
  }, ({ text, points }) => cog.summarize(String(text), Number(points) || 3));
  registerWebMCPTool('chunkText', 'Split a long text into cognitively digestible chunks near a word budget.', {
    type: 'object', properties: { text: { type: 'string' }, max_words: { type: 'integer', minimum: 10, maximum: 500 } }, required: ['text'], additionalProperties: false,
  }, ({ text, max_words }) => cog.chunkText(String(text), Number(max_words) || 60));
  registerWebMCPTool('simplify', 'Swap jargon for plain words.', strProp('text', 'Text to simplify.'), ({ text }) => cog.simplify(String(text)));

  registerWebMCPTool('deadlineGuard', 'Flag clustered or overlapping deadlines within a window.', {
    type: 'object', properties: { deadlines: { type: 'array', items: { type: 'object' } } }, additionalProperties: false,
  }, ({ deadlines }) => cog.deadlineGuard((deadlines as { label: string; in_days: number }[]) || []));
  registerWebMCPTool('timebox', 'Define a focused work block with a hard stop and break.', {
    type: 'object', properties: { task: { type: 'string' }, minutes: { type: 'integer', minimum: 1 } }, required: ['task'], additionalProperties: false,
  }, ({ task, minutes }) => cog.timebox(String(task), Number(minutes) || 25));
  registerWebMCPTool('nextAction', 'Pick the single best next action from a list.', {
    type: 'object', properties: { tasks: { type: 'array', items: { type: 'string' } } }, required: ['tasks'], additionalProperties: false,
  }, ({ tasks }) => cog.nextAction((tasks as string[]) || []));
  registerWebMCPTool('dependencyMap', 'Order items respecting their dependencies.', {
    type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } }, required: ['items'], additionalProperties: false,
  }, ({ items }) => cog.dependencyMap((items as { name: string; depends_on?: string[] }[]) || []));
  registerWebMCPTool('energyMatch', 'Match a task to your current spoon/energy level.', {
    type: 'object', properties: { tasks: { type: 'array', items: { type: 'object' } }, spoons: { type: 'integer', minimum: 0, maximum: 5 } }, required: ['tasks'], additionalProperties: false,
  }, ({ tasks, spoons }) => cog.energyMatch((tasks as { name: string; energy: number }[]) || [], Number(spoons) || 3));
  registerWebMCPTool('habitStack', 'Attach a new habit to an existing anchor routine.', {
    type: 'object', properties: { habit: { type: 'string' }, anchor: { type: 'string' } }, required: ['habit', 'anchor'], additionalProperties: false,
  }, ({ habit, anchor }) => cog.habitStack(String(habit), String(anchor)));
  registerWebMCPTool('stallDiagnose', 'Name why a task is stuck and suggest a nudge.', strProp('stuck_on', 'What is stuck.'), ({ stuck_on }) => cog.stallDiagnose(String(stuck_on)));
  registerWebMCPTool('progressTrack', 'Report progress with a motivating message.', {
    type: 'object', properties: { done: { type: 'integer', minimum: 0 }, total: { type: 'integer', minimum: 1 } }, required: ['done', 'total'], additionalProperties: false,
  }, ({ done, total }) => cog.progressTrack(Number(done) || 0, Number(total) || 1));

  registerWebMCPTool('fontTune', 'Recommend readable font settings for a spoon level.', {
    type: 'object', properties: { spoons: { type: 'integer', minimum: 0, maximum: 5 }, dyslexia: { type: 'boolean' } }, additionalProperties: false,
  }, ({ spoons, dyslexia }) => cog.fontTune(Number(spoons) || 3, Boolean(dyslexia)));
  registerWebMCPTool('noiseProfile', 'Suggest a focus-sound profile for a task type.', {
    type: 'object', properties: { task_type: { type: 'string', enum: ['deep', 'admin', 'creative', 'rest'] } }, additionalProperties: false,
  }, ({ task_type }) => cog.noiseProfile(String(task_type || 'deep')));
  registerWebMCPTool('lightAdvice', 'Suggest lighting for a time of day and spoon level.', {
    type: 'object', properties: { spoons: { type: 'integer', minimum: 0, maximum: 5 }, time_of_day: { type: 'string', enum: ['morning', 'midday', 'evening', 'night'] } }, additionalProperties: false,
  }, ({ spoons, time_of_day }) => cog.lightAdvice(Number(spoons) || 3, String(time_of_day || 'midday')));
  registerWebMCPTool('densityScale', 'Recommend screen density for a spoon level.', {
    type: 'object', properties: { spoons: { type: 'integer', minimum: 0, maximum: 5 } }, additionalProperties: false,
  }, ({ spoons }) => cog.densityScale(Number(spoons) || 3));
  registerWebMCPTool('grounding54321', 'Return the 5-4-3-2-1 grounding exercise steps.', { type: 'object', properties: {}, additionalProperties: false }, () => cog.grounding54321());
  registerWebMCPTool('meltdownPlan', 'Build a personalized meltdown plan from triggers and comforts.', {
    type: 'object', properties: { triggers: { type: 'array', items: { type: 'string' } }, comforts: { type: 'array', items: { type: 'string' } } }, additionalProperties: false,
  }, ({ triggers, comforts }) => cog.meltdownPlan((triggers as string[]) || [], (comforts as string[]) || []));
  registerWebMCPTool('shutdownRoutine', 'Return a spoon-aware wind-down routine.', {
    type: 'object', properties: { spoons: { type: 'integer', minimum: 0, maximum: 5 } }, additionalProperties: false,
  }, ({ spoons }) => cog.shutdownRoutine(Number(spoons) || 3));

  registerWebMCPTool('outline', 'Extract structure (headings) from text.', strProp('text', 'Text to outline.'), ({ text }) => cog.outline(String(text)));
  registerWebMCPTool('glossary', 'Find candidate jargon terms in text.', strProp('text', 'Text to scan.'), ({ text }) => cog.glossary(String(text)));
  registerWebMCPTool('questionReframe', 'Make a vague question concrete.', strProp('question', 'The question to reframe.'), ({ question }) => cog.questionReframe(String(question)));
  registerWebMCPTool('toneShift', 'Suggest tone adjustments for a message.', {
    type: 'object', properties: { text: { type: 'string' }, target: { type: 'string', enum: ['calm', 'firm', 'warm', 'neutral'] } }, required: ['text'], additionalProperties: false,
  }, ({ text, target }) => cog.toneShift(String(text), String(target || 'neutral')));
  registerWebMCPTool('draftReply', 'Draft a reply in a chosen stance.', {
    type: 'object', properties: { message: { type: 'string' }, stance: { type: 'string', enum: ['accept', 'decline', 'clarify', 'thank'] } }, required: ['message'], additionalProperties: false,
  }, ({ message, stance }) => cog.draftReply(String(message), String(stance || 'thank')));
  registerWebMCPTool('meetingNotes', 'Extract decisions and actions from a transcript.', strProp('transcript', 'The meeting transcript.'), ({ transcript }) => cog.meetingNotes(String(transcript)));
  registerWebMCPTool('assertiveReframe', 'Remove over-apology and make a sentence clearer.', strProp('sentence', 'The sentence to reframe.'), ({ sentence }) => cog.assertiveReframe(String(sentence)));
  registerWebMCPTool('statusUpdate', 'Compose a done/blocked status update.', {
    type: 'object', properties: { done: { type: 'array', items: { type: 'string' } }, blockers: { type: 'array', items: { type: 'string' } } }, additionalProperties: false,
  }, ({ done, blockers }) => cog.statusUpdate((done as string[]) || [], (blockers as string[]) || []));
  registerWebMCPTool('supportPing', 'Draft a support-ping message.', {
    type: 'object', properties: { who: { type: 'string' }, why: { type: 'string' } }, required: ['who'], additionalProperties: false,
  }, ({ who, why }) => cog.supportPing(String(who), why ? String(why) : undefined));

  registerWebMCPTool('spacedRepetition', 'Compute a spaced-repetition review schedule.', {
    type: 'object', properties: { fact: { type: 'string' }, difficulty: { type: 'integer', minimum: 1, maximum: 5 } }, required: ['fact'], additionalProperties: false,
  }, ({ fact, difficulty }) => cog.spacedRepetition(String(fact), Number(difficulty) || 3));
  registerWebMCPTool('memoryRemind', 'Compute a due date for a future reminder.', {
    type: 'object', properties: { label: { type: 'string' }, in_days: { type: 'integer', minimum: 1 } }, required: ['label'], additionalProperties: false,
  }, ({ label, in_days }) => cog.memoryRemind(String(label), Number(in_days) || 1));
  registerWebMCPTool('recallPrompt', 'Generate a self-test prompt for a topic.', {
    type: 'object', properties: { topic: { type: 'string' }, facts: { type: 'array', items: { type: 'string' } } }, required: ['topic'], additionalProperties: false,
  }, ({ topic, facts }) => cog.recallPrompt(String(topic), (facts as string[]) || []));
  registerWebMCPTool('chunkRecall', 'Split a list into smaller memorization chunks.', {
    type: 'object', properties: { items: { type: 'array', items: { type: 'string' } }, per_chunk: { type: 'integer', minimum: 1 } }, required: ['items'], additionalProperties: false,
  }, ({ items, per_chunk }) => cog.chunkRecall((items as string[]) || [], Number(per_chunk) || 5));
  registerWebMCPTool('memoryEncoding', 'Suggest a mnemonic / encoding strategy for a fact.', {
    type: 'object', properties: { fact: { type: 'string' }, strategy: { type: 'string', enum: ['acronym', 'imagery', 'story', 'rhyme'] } }, required: ['fact'], additionalProperties: false,
  }, ({ fact, strategy }) => cog.memoryEncoding(String(fact), (strategy as 'acronym' | 'imagery' | 'story' | 'rhyme') || undefined));
  registerWebMCPTool('retrievalPractice', 'Generate a quiz question from a text snippet.', strProp('snippet', 'The snippet to quiz on.'), ({ snippet }) => cog.retrievalPractice(String(snippet)));
  registerWebMCPTool('memoryCue', 'Suggest a sensory cue to trigger recall of a routine.', {
    type: 'object', properties: { routine: { type: 'string' }, cue_type: { type: 'string', enum: ['sight', 'sound', 'place', 'smell'] } }, required: ['routine'], additionalProperties: false,
  }, ({ routine, cue_type }) => cog.memoryCue(String(routine), (cue_type as 'sight' | 'sound' | 'place' | 'smell') || 'sight'));
  registerWebMCPTool('forgetTrack', 'Flag reminders not reviewed in over 30 days.', {
    type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } }, required: ['items'], additionalProperties: false,
  }, ({ items }) => cog.forgetTrack((items as { label: string; last_reviewed?: string }[]) || []));

  registerWebMCPTool('getPortalState', 'Snapshot of portal state (spoons, tab, arcade LOVE balance).', { type: 'object', properties: {}, additionalProperties: false }, async () => {
    const arcade = window.__P31_ARCADE_STATE__;
    return {
      spoons: Number((document.documentElement.dataset.spoons ?? '3')),
      tab: document.body.dataset.activeTab || null,
      arcadeLove: arcade?.loveBalance ?? null,
      arcadeGames: arcade?.gamesCompleted ?? 0,
    };
  });

  setupGlobalWebMCPExecutor();
}

export function registerArcadeWebMCPTools(arcadeApi: {
  setSpoonLevel: (level: number) => void;
  getArcadeState: () => { loveBalance: number; gamesCompleted: number; unlockedGames: string[] };
  startGame: (game: string) => boolean;
  mintLove: (amount: number, reason: string) => void;
}): void {
  registerWebMCPTool('setSpoonLevel', 'Adjust cognitive load (0-5).', {
    type: 'object', properties: { level: { type: 'integer', minimum: 0, maximum: 5 } }, required: ['level'], additionalProperties: false,
  }, ({ level }) => {
    arcadeApi.setSpoonLevel(Number(level));
    return { status: 'ok', spoons: Number(level) };
  });
  registerWebMCPTool('getArcadeScore', 'Get arcade LOVE balance and progress.', { type: 'object', properties: {}, additionalProperties: false }, () => arcadeApi.getArcadeState());
  registerWebMCPTool('startGame', 'Start an arcade game by name (jitterbug, liquid, cards, strategy).', strProp('game', 'Game key.'), ({ game }) => {
    const ok = arcadeApi.startGame(String(game));
    return { status: ok ? 'started' : 'locked', game: String(game) };
  });
  registerWebMCPTool('mintLove', 'Mint LOVE for an achievement.', {
    type: 'object', properties: { amount: { type: 'integer', minimum: 1 }, reason: { type: 'string' } }, required: ['amount'], additionalProperties: false,
  }, ({ amount, reason }) => {
    arcadeApi.mintLove(Number(amount), String(reason || 'arcade'));
    return { status: 'minted', amount: Number(amount) };
  });
}

const PORTAL_FUNCTION_SUBSETS: Record<string, string[]> = {
  children: [
    'grounding54321',
    'crisisCheck',
    'taskBreakdown',
    'timeEstimate',
    'simplify',
    'remember',
    'recall',
    'listMemories',
  ],
  teen: [
    'grounding54321',
    'crisisCheck',
    'taskBreakdown',
    'timeEstimate',
    'simplify',
    'remember',
    'recall',
    'listMemories',
    'getArcadeScore',
    'startGame',
    'mintLove',
    'getPortalState',
  ],
  parent: [
    'grounding54321',
    'crisisCheck',
    'taskBreakdown',
    'timeEstimate',
    'simplify',
    'remember',
    'recall',
    'listMemories',
    'getArcadeScore',
    'startGame',
    'mintLove',
    'getPortalState',
    'decisionTree',
    'summarize',
    'scheduleChunk',
  ],
};

export interface OpenAIFunctionDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description?: string; enum?: string[]; minimum?: number; maximum?: number; items?: { type: string } }>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
}

export function getOpenAIFunctionDefinitions(portal?: string): OpenAIFunctionDefinition[] {
  const wanted = portal ? PORTAL_FUNCTION_SUBSETS[portal] : null;
  const defs = listWebMCPToolDefinitions();
  return defs
    .filter((d) => !wanted || wanted.includes(d.name))
    .map((d) => ({
      type: 'function' as const,
      function: {
        name: d.name,
        description: d.description,
        parameters: d.inputSchema,
      },
    }));
}
