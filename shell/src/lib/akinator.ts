import { useAppStore, type Tab } from '../store/useAppStore';
import { useShellStore } from '../store/useShellStore';
import { logSpoonChange } from './spoonHistory';

export interface AkinatorItem {
  id: string;
  name: string;
  category: string;
  keywords: string[];
  emoji: string;
  description: string;
  action: () => void;
}

export interface AkinatorQuestion {
  type: 'question';
  text: string;
  candidates: number;
  questionId: string;
}

export interface AkinatorSuggestion {
  type: 'suggestions';
  apps: Array<AkinatorItem & { confidence: number }>;
}

export type AkinatorResult = AkinatorQuestion | AkinatorSuggestion;

interface Question<T> {
  id: string;
  text: string;
  filter: (item: T) => boolean;
}

function buildCatalog(): AkinatorItem[] {
  const app = useAppStore.getState();
  const shell = useShellStore.getState();

  const nav = (tab: Tab): AkinatorItem => ({
    id: `nav:${tab}`,
    name: tab[0].toUpperCase() + tab.slice(1),
    category: 'surface',
    keywords: [tab, 'go', 'open', 'navigate', 'move', 'switch'],
    emoji: tab === 'home' ? '🏠' : tab === 'bonding' ? '🤝' : tab === 'dashboard' ? '📊' : tab === 'sandbox' ? '🧪' : '👤',
    description: `Go to the ${tab} surface`,
    action: () => app.setTab(tab),
  });

  return [
    nav('home'),
    nav('bonding'),
    nav('dashboard'),
    nav('sandbox'),
    nav('profile'),

    {
      id: 'spoons:set',
      name: 'Set Spoon Level',
      category: 'spoons',
      keywords: ['spoons', 'energy', 'adjust', 'level', 'tired', 'rested', 'set', 'change'],
      emoji: '🥄',
      description: 'Adjust your energy level from 0 (rest) to 5 (full)',
      action: () => { /* args needed — opened via panel/palette */ },
    },
    {
      id: 'spoons:rest',
      name: 'Rest Mode',
      category: 'spoons',
      keywords: ['rest', 'sleep', 'break', 'tired', 'done', 'overwhelmed', 'off'],
      emoji: '🧘',
      description: 'Drop everything and rest — only the starfield stays',
      action: () => { app.setSpoons(0); logSpoonChange(0, 'akinator').catch(() => {}); app.setUi({ showCrisis: true, toast: null }); },
    },
    {
      id: 'love:refresh',
      name: 'LOVE Balance',
      category: 'love',
      keywords: ['love', 'balance', 'check', 'money', 'credit', 'refresh', 'earn'],
      emoji: '💎',
      description: 'Check your LOVE balance from the ledger',
      action: () => app.refreshLoveBalance(),
    },
    {
      id: 'assistant:open',
      name: 'Open Assistant',
      category: 'assistant',
      keywords: ['assistant', 'chat', 'ai', 'help', 'ask', 'llm', 'bash', 'phos', 'talk'],
      emoji: '🧠',
      description: 'Open the AI assistant panel — ask BASH or PHOS anything',
      action: () => shell.setAssistantOpen(true),
    },
    {
      id: 'assistant:summarize',
      name: 'Summarize Alerts',
      category: 'assistant',
      keywords: ['summarize', 'summary', 'notifications', 'catch', 'recap', 'whats new'],
      emoji: '📋',
      description: 'Ask the assistant to summarize your notifications',
      action: () => { shell.setAssistantOpen(true); },
    },
    {
      id: 'hub:open',
      name: 'Notification Hub',
      category: 'manage',
      keywords: ['notifications', 'alerts', 'bell', 'hub', 'inbox', 'messages', 'whats happening'],
      emoji: '🔔',
      description: 'Open the notification hub to see all alerts',
      action: () => shell.setHubOpen(true),
    },
    {
      id: 'notif:markAllRead',
      name: 'Mark All Read',
      category: 'manage',
      keywords: ['mark', 'read', 'clear', 'badge', 'seen', 'acknowledge'],
      emoji: '✅',
      description: 'Mark all notifications as read — clears the unread badge',
      action: () => shell.markAllRead(),
    },
    {
      id: 'notif:clear',
      name: 'Clear Notifications',
      category: 'manage',
      keywords: ['clear', 'delete', 'remove', 'wipe', 'reset', 'clean'],
      emoji: '🧹',
      description: 'Remove all notifications from the hub',
      action: () => shell.clearAll(),
    },
  ];
}

const QUESTIONS: Question<AkinatorItem>[] = [
  { id: 'spoons', text: 'Is this about your energy or well-being?', filter: (i) => i.category === 'spoons' },
  { id: 'surface', text: 'Do you want to go somewhere in the shell?', filter: (i) => i.category === 'surface' },
  { id: 'love', text: 'Is this about your LOVE balance or credits?', filter: (i) => i.category === 'love' },
  { id: 'assistant', text: 'Do you want to talk to the AI assistant?', filter: (i) => i.category === 'assistant' },
  { id: 'manage', text: 'Is this about managing notifications or alerts?', filter: (i) => i.category === 'manage' },

  { id: 'surface-connect', text: 'Is this surface about connecting or bonding with people?', filter: (i) => i.id === 'nav:bonding' },
  { id: 'surface-play', text: 'Is this a place to experiment or build things?', filter: (i) => i.id === 'nav:sandbox' },
  { id: 'surface-data', text: 'Is this about your personal data or analytics?', filter: (i) => ['nav:dashboard', 'nav:profile'].includes(i.id) },
  { id: 'surface-home', text: 'Is this the home surface — your starting point?', filter: (i) => i.id === 'nav:home' },

  { id: 'tired', text: 'Are you feeling tired or overwhelmed right now?', filter: (i) => i.id === 'spoons:rest' },
  { id: 'checking', text: 'Do you want to see what is happening or check on things?', filter: (i) => ['hub:open', 'love:refresh', 'assistant:summarize'].includes(i.id) },
  { id: 'doing', text: 'Do you need to take action (not just look)?', filter: (i) => ['spoons:set', 'notif:clear', 'notif:markAllRead', 'spoons:rest'].includes(i.id) },
  { id: 'chat', text: 'Do you want to talk or have a conversation?', filter: (i) => i.category === 'assistant' || i.id === 'assistant:open' || i.id === 'assistant:summarize' },
];

export interface AkinatorState {
  candidates: AkinatorItem[];
  askedQuestions: Set<string>;
  currentQuestion: Question<AkinatorItem> | null;
}

export function createAkinator(): {
  reset: () => AkinatorState;
  nextQuestion: (s: AkinatorState) => AkinatorResult;
  answer: (s: AkinatorState, yes: boolean) => AkinatorResult;
  search: (query: string) => AkinatorItem[];
  getResultApp: (s: AkinatorState, id: string) => AkinatorItem | undefined;
} {
  const catalog = buildCatalog();

  function reset(): AkinatorState {
    return {
      candidates: [...catalog],
      askedQuestions: new Set(),
      currentQuestion: null,
    };
  }

  function confidence(s: AkinatorState): number {
    return Math.round(((catalog.length - s.candidates.length) / catalog.length) * 100);
  }

  function nextQuestion(s: AkinatorState): AkinatorResult {
    if (s.candidates.length <= 4) {
      return {
        type: 'suggestions',
        apps: s.candidates.slice(0, 5).map((app) => ({ ...app, confidence: confidence(s) })),
      };
    }

    let bestQuestion: Question<AkinatorItem> | null = null;
    let bestScore = Infinity;

    for (const q of QUESTIONS) {
      if (s.askedQuestions.has(q.id)) continue;
      const matching = s.candidates.filter(q.filter).length;
      const nonMatching = s.candidates.length - matching;
      const imbalance = Math.abs(matching - nonMatching);
      if (imbalance < bestScore && matching > 0 && nonMatching > 0) {
        bestScore = imbalance;
        bestQuestion = q;
      }
    }

    if (!bestQuestion) {
      return {
        type: 'suggestions',
        apps: s.candidates.slice(0, 3).map((app) => ({ ...app, confidence: confidence(s) })),
      };
    }

    s.currentQuestion = bestQuestion;
    s.askedQuestions.add(bestQuestion.id);

    return {
      type: 'question',
      text: bestQuestion.text,
      candidates: s.candidates.length,
      questionId: bestQuestion.id,
    };
  }

  function answer(s: AkinatorState, yes: boolean): AkinatorResult {
    const q = s.currentQuestion;
    if (!q) return { type: 'suggestions', apps: [] };
    if (yes) {
      s.candidates = s.candidates.filter(q.filter);
    } else {
      s.candidates = s.candidates.filter((app) => !q.filter(app));
    }
    return nextQuestion(s);
  }

  function search(query: string): AkinatorItem[] {
    const terms = query.toLowerCase().split(/\s+/);
    return catalog
      .map((app) => {
        const score = terms.reduce((sum, term) => {
          let termScore = 0;
          if (app.name.toLowerCase().includes(term)) termScore += 10;
          if (app.description.toLowerCase().includes(term)) termScore += 5;
          if (app.keywords.some((k) => k.includes(term))) termScore += 3;
          return sum + termScore;
        }, 0);
        return { ...app, _score: score };
      })
      .filter((a) => (a as any)._score > 0)
      .sort((a, b) => (b as any)._score - (a as any)._score)
      .slice(0, 5)
      .map(({ _score, ...rest }: any) => rest);
  }

  return {
    reset,
    nextQuestion,
    answer,
    search,
    getResultApp: (s, id) => s.candidates.find((c) => c.id === id) ?? catalog.find((c) => c.id === id),
  };
}

const sharedEngine = createAkinator();
let sharedState: AkinatorState | null = null;

export function akinatorStart(): { question: string; candidates: number; questionId: string } | { suggestions: Array<{ id: string; name: string; description: string; emoji: string; confidence: number }> } {
  sharedState = sharedEngine.reset();
  const r = sharedEngine.nextQuestion(sharedState);
  if (r.type === 'question') {
    return { question: r.text, candidates: r.candidates, questionId: r.questionId };
  }
  return { suggestions: r.apps.map((a) => ({ id: a.id, name: a.name, description: a.description, emoji: a.emoji, confidence: a.confidence })) };
}

export function akinatorAnswer(yes: boolean): { question?: string; candidates?: number; questionId?: string; suggestions?: Array<{ id: string; name: string; description: string; emoji: string; confidence: number }>; done?: boolean } {
  if (!sharedState) {
    return akinatorStart();
  }
  const r = sharedEngine.answer(sharedState, yes);
  if (r.type === 'question') {
    return { question: r.text, candidates: r.candidates, questionId: r.questionId };
  }
  return { suggestions: r.apps.map((a) => ({ id: a.id, name: a.name, description: a.description, emoji: a.emoji, confidence: a.confidence })), done: true };
}

export function akinatorGetState(): { questionText: string | null; candidates: number; askedCount: number; suggestions: Array<{ id: string; name: string; description: string; emoji: string; confidence: number }> | null } {
  if (!sharedState) {
    sharedState = sharedEngine.reset();
  }
  const r = sharedEngine.nextQuestion(sharedState);
  const questionText = r.type === 'question' ? r.text : null;
  const suggestions = r.type === 'suggestions' ? r.apps.map((a) => ({ id: a.id, name: a.name, description: a.description, emoji: a.emoji, confidence: a.confidence })) : null;
  return { questionText, candidates: sharedState.candidates.length, askedCount: sharedState.askedQuestions.size, suggestions };
}
