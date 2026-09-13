import type { ClarifyQuestion } from './pipeline';

const SURFACE_KEYS = ['glass', 'surface', 'panel', 'card', 'modal', 'sheet', 'dial'];
const LAYOUT_KEYS = ['grid', 'layout', 'column', 'row', 'stack', 'sidebar', 'section', 'page', 'dashboard'];
const VARIANT_KEYS = ['variant', 'primary', 'secondary', 'ghost', 'destructive', 'size', 'small', 'large'];
const OWNER_KEYS = ['message', 'chat', 'bubble', 'composer'];
const SENSORY_KEYS = ['motion', 'reduced-motion', 'sensory', 'accessible', 'spoons', 'reduce'];
const GENERATION_VERBS = ['build', 'create', 'make', 'design', 'generate', 'update', 'fix', 'polish', 'transform'];

const isVagueSentence = (prompt: string): boolean => {
  if (!prompt.trim()) return true;
  const words = prompt.split(/\s+/).filter(Boolean);
  if (words.length < 4) return true;
  return false;
};

const hasAny = (prompt: string, keys: string[]): boolean => keys.some((k) => prompt.toLowerCase().includes(k));

export function detectAmbiguities(prompt: string): ClarifyQuestion[] {
  const q: ClarifyQuestion[] = [];
  const lower = prompt.toLowerCase();

  if (isVagueSentence(prompt) || !GENERATION_VERBS.some((v) => lower.includes(v))) {
    q.push({
      key: 'intent',
      question: "That could mean several things — what are we building, and from whose point of view?",
      options: [
        { label: 'A screen layout', value: 'screen', hint: 'page / dashboard / panel arrangement' },
        { label: 'A single component', value: 'component', hint: 'one button, card, form control, etc.' },
        { label: 'Refine something existing', value: 'refine', hint: 'polish the current artifact' },
      ],
    });
  }

  if (!hasAny(lower, SURFACE_KEYS)) {
    q.push({
      key: 'surface',
      question: 'Which surface treatment do you want for the main container?',
      options: [
        { label: 'Glass', value: 'glass', hint: 'subtle glass panel, blurred backdrop' },
        { label: 'Solid', value: 'solid', hint: 'opaque surface, no backdrop blur' },
      ],
    });
  }

  if (!hasAny(lower, LAYOUT_KEYS)) {
    q.push({
      key: 'layout',
      question: 'How should the content be arranged?',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Single column', value: 'column' },
        { label: 'Stack (vertical)', value: 'stack' },
        { label: 'Sidebar + content', value: 'sidebar' },
      ],
    });
  }

  if (!hasAny(lower, VARIANT_KEYS)) {
    q.push({
      key: 'variant',
      question: 'Any specific component variant or emphasis?',
      options: [
        { label: 'Keep it consistent', value: 'default', hint: 'let P31 defaults win' },
        { label: 'Primary actions emphasized', value: 'primary' },
        { label: 'Subtle / quiet', value: 'quiet' },
      ],
    });
  }

  if (!hasAny(lower, SENSORY_KEYS)) {
    q.push({
      key: 'sensory',
      question: 'Any accessibility / sensory preferences?',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Reduced motion', value: 'reduced-motion', hint: 'disable animations + backdrop blur' },
        { label: 'Max contrast', value: 'contrast' },
      ],
    });
  }

  return q.slice(0, 3);
}

export interface ClarifyResolution {
  prompt: string;
  notes: string[];
}

export function resolveClarify(prompt: string, answers: Record<string, string>): ClarifyResolution {
  const notes: string[] = [];
  let out = prompt.trim();

  if (answers.intent && !out.toLowerCase().includes(answers.intent)) {
    notes.push(`intent: ${answers.intent}`);
  }
  if (answers.surface) {
    notes.push(`surface: ${answers.surface}`);
    if (answers.surface === 'reduced-motion') notes.push('sensory: reduce motion');
  }
  if (answers.layout) {
    notes.push(`layout: ${answers.layout}`);
  }
  if (answers.variant && answers.variant !== 'default') {
    notes.push(`variant emphasis: ${answers.variant}`);
  }
if (answers.theme && answers.theme !== 'current') {
    notes.push(`theme: ${answers.theme}`);
  }
  if (answers.sensory === 'reduced-motion') notes.push('sensory: reduce motion');
  if (answers.sensory === 'contrast') notes.push('sensory: max contrast');

  if (notes.length === 0) return { prompt: out, notes };
  return { prompt: `${out}\n\n(Clarified intent — ${notes.join('; ')}.)`, notes };
}

export type { ClarifyQuestion };