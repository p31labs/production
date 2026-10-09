// Cognitive Prosthetic — 20 highest-value pure functions for BASH/PHOS assistant tools
// Full 47-tool set available as list; these 20 are registered as llmTool commands

import { storeRecord, loadRecord, listRecords } from './memory';

if (import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
  (window as any).__p31_taskHistory = getGoalHistory;
  (window as any).__p31_persistGoal = persistGoal;
}

export interface Step { text: string; done?: boolean }

export interface TaskArgs { complexity?: number; spoons?: number; name?: string; minutes?: number }

export function timeEstimate(args: TaskArgs): { minutes: number; note: string } {
  const base = 5 + (args.complexity ?? 3) * 15;
  const adjusted = Math.ceil(base * (1 + Math.max(0, 3 - (args.spoons ?? 3)) * 0.3));
  return { minutes: adjusted, note: adjusted > 60 ? 'May need breaks' : 'Should be manageable' };
}

export async function taskBreakdown(args: { goal: string; steps?: number }): Promise<string[]> {
  const prompt = `Break down this goal into 3–6 concrete, spoon-friendly steps. Each step should be a short action phrase. Goal: ${args.goal}. Return ONLY a JSON array of strings, no other text.`;

  try {
    const { sendChat } = await import('./llm');
    const turn = await sendChat(prompt, []);
    const text = turn.content ?? '';
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    throw new Error('Invalid cloud response');
  } catch {
    try {
      const { localChatWithTools } = await import('./localLlm');
      const text = await localChatWithTools([
        { role: 'system', content: 'You are a task breakdown assistant. Return only a JSON array of strings.' },
        { role: 'user', content: prompt },
      ], []);
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      throw new Error('Invalid local response');
    } catch {
      return ['Define scope for: ' + args.goal, 'Gather resources', 'Do the work', 'Review and fix', 'Ship or rest'];
    }
  }
}

export async function persistGoal(goal: string, steps: string[]): Promise<string> {
  const id = `goal-${Date.now()}`;
  const stepObjects: Step[] = steps.map((s) => ({ text: s, done: false }));
  await storeRecord('goals', { id, goal, steps: stepObjects, createdAt: Date.now() });
  return id;
}

export async function getGoalHistory(): Promise<Array<{ id: string; goal: string; steps: Step[]; createdAt: number }>> {
  const records = await listRecords<{ id: string; goal: string; steps: (string | Step)[]; createdAt: number }>('goals');
  return records.map((r) => ({
    ...r,
    steps: r.steps.map((s) => (typeof s === 'string' ? { text: s, done: false } : s)),
  }));
}

export async function completeStep(goalId: string, stepIndex: number): Promise<boolean> {
  const record = await loadRecord<{ id: string; goal: string; steps: (string | Step)[]; createdAt: number }>('goals', goalId);
  if (!record || stepIndex < 0 || stepIndex >= record.steps.length) return false;
  const steps: Step[] = record.steps.map((s) => (typeof s === 'string' ? { text: s, done: false } : { ...s }));
  steps[stepIndex] = { ...steps[stepIndex], done: true };
  await storeRecord('goals', { ...record, steps });
  return true;
}

export async function markGoalComplete(goalId: string): Promise<boolean> {
  const record = await loadRecord<{ id: string; goal: string; steps: (string | Step)[]; createdAt: number }>('goals', goalId);
  if (!record) return false;
  const steps: Step[] = record.steps.map((s) =>
    typeof s === 'string' ? { text: s, done: true } : { ...s, done: true },
  );
  await storeRecord('goals', { ...record, steps });
  return true;
}

export async function rebreakdownGoal(goalId: string): Promise<string[] | null> {
  const record = await loadRecord<{ id: string; goal: string }>('goals', goalId);
  if (!record) return null;
  const newSteps = await taskBreakdown({ goal: record.goal });
  const stepObjects: Step[] = newSteps.map((s) => ({ text: s, done: false }));
  await storeRecord('goals', { id: goalId, goal: record.goal, steps: stepObjects, createdAt: Date.now() });
  return newSteps;
}

export function prioritizeTasks(tasks: Array<{ name: string; urgency: number; importance: number; energy: number }>): Array<{ name: string; score: number }> {
  return tasks.map((t) => ({ name: t.name, score: t.urgency * 0.4 + t.importance * 0.4 + t.energy * 0.2 })).sort((a, b) => b.score - a.score);
}

export function decisionTree(args: { options: string[]; criteria: string[] }): string {
  if (!args.options.length) return 'No options provided. Try listing 2-3 choices.';
  return `Consider: ${args.options.join(' vs. ')}. Weigh each by: ${(args.criteria ?? ['impact', 'ease', 'energy']).join(', ')}.`;
}

export function nextAction(args: { tasks: string[]; spoons?: number }): string {
  const pick = args.tasks?.length ? args.tasks[0] : 'rest';
  return (args.spoons ?? 3) <= 1 ? 'Rest is your next action. Everything else can wait.' : `Start with: ${pick}. One thing. Then re-assess.`;
}

export function stallDiagnose(args: { stuckOn: string }): string {
  const reasons: Record<string, string> = {
    overwhelm: 'Try breaking it into the smallest possible first step.',
    unclear: 'Define what "done" looks like first.',
    perfection: 'Ship at 80%. You can improve after.',
    energy: 'Rest for 15 minutes and re-assess.',
    fear: 'Name the fear. Write it down. Then do the smallest safe action.',
  };
  const match = Object.entries(reasons).find(([k]) => (args.stuckOn ?? '').toLowerCase().includes(k));
  return match ? match[1] : 'Name what specifically is blocking you. Then pick one tiny next step.';
}

export function grounding54321(): string[] {
  return [
    '5 things you can SEE right now',
    '4 things you can TOUCH',
    '3 things you can HEAR',
    '2 things you can SMELL',
    '1 thing you can TASTE',
  ];
}

export function meltdownPlan(args: { spoons?: number }): string[] {
  const plan = ['Stop. Breathe out longer than in.', 'Reduce sensory input (dim lights, quiet).', 'Name one safe thing you can see.'];
  if ((args.spoons ?? 3) > 0) plan.push('When ready, do one grounding exercise.');
  return plan;
}

export function crisisCheck(args: { message: string }): { flagged: boolean; keywords: string[] } {
  const keywords = ['hurt', 'harm', 'unsafe', 'crisis', 'emergency', 'suicidal', 'self-harm', 'end it', 'can\'t go on'];
  const found = keywords.filter((k) => (args.message ?? '').toLowerCase().includes(k));
  return { flagged: found.length > 0, keywords: found };
}

export function summarize(args: { text: string; maxSentences?: number }): string {
  const sentences = (args.text ?? '').split(/(?<=[.!?])\s+/);
  return sentences.slice(0, args.maxSentences ?? 3).join(' ');
}

export function chunkText(args: { text: string; chunkSize?: number }): string[] {
  const words = (args.text ?? '').split(/\s+/);
  const size = args.chunkSize ?? 15;
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size) chunks.push(words.slice(i, i + size).join(' '));
  return chunks;
}

export function toneShift(args: { text: string; tone: string }): string {
  const prefixes: Record<string, string> = {
    polite: 'Would it be possible to…',
    direct: 'I need…',
    warm: 'Hi! Just checking in about…',
    firm: 'I want to be clear: …',
    gentle: 'I\'m wondering if…',
  };
  const prefix = prefixes[args.tone ?? 'warm'] ?? '';
  return `${prefix} ${(args.text ?? '').slice(0, 80)}`;
}

export function sayNo(args: { request: string }): string {
  return `Thank you for thinking of me. I can't take on \"${(args.request ?? '').slice(0, 40)}\" right now. Here's what I can offer instead: [your alternative].`;
}

export function setBoundary(args: { topic: string }): string {
  return `I need to set a boundary around \"${args.topic ?? 'this topic'}\". It's not something I can discuss right now. I appreciate you understanding.`;
}

export function requestAccommodation(args: { need: string }): string {
  return `I have a specific need that would help me: ${args.need}. Would you be able to accommodate this? Thank you for considering it.`;
}

export function feedbackDelivery(args: { observation: string; impact: string }): string {
  return `I noticed ${args.observation}. The impact on me was ${args.impact}. I'm sharing this because I value our communication.`;
}

export function habitStack(args: { habit: string; anchor: string }): string {
  return `After I ${args.anchor}, I will ${args.habit}. This links the new habit to an existing routine.`;
}

export function energyMatch(args: { tasks: string[]; spoons: number }): string[] {
  const lowEnergy = ['Rest', 'Light reading', 'Organize notes', 'Water plants'];
  const midEnergy = ['Review', 'Plan tomorrow', 'Tidy up', 'Short walk'];
  const highEnergy = ['Deep work', 'Create', 'Exercise', 'Tackle hard problem'];
  const pool = args.spoons <= 1 ? lowEnergy : args.spoons <= 3 ? midEnergy : highEnergy;
  return args.tasks.filter((t) => pool.some((p) => t.toLowerCase().includes(p.toLowerCase())));
}

export function spacedRepetition(args: { difficulty: number; lastReviewDays: number }): { daysUntilNext: number; priority: string } {
  const ease = Math.max(1, 5 - (args.difficulty ?? 3));
  const interval = Math.max(1, Math.ceil(args.lastReviewDays * ease * 0.5));
  return { daysUntilNext: interval, priority: interval <= 1 ? 'urgent' : interval <= 3 ? 'soon' : 'ok' };
}

export function memoryCue(args: { concept: string }): string {
  const cues: Record<string, string> = {
    visual: 'what it looks like — color, shape, size',
    story: 'a story or example that connects to it',
    sound: 'how it sounds or what you hear when thinking of it',
    body: 'a physical sensation or movement associated with it',
  };
  return `Create a mental anchor for "${args.concept ?? 'this'}": associate it with ${cues.visual}, ${cues.story}, and ${cues.body}.`;
}
