import { describe, it, expect } from 'vitest';
import {
  taskBreakdown,
  timeEstimate,
  crisisCheck,
  grounding54321,
  meltdownPlan,
  prioritizeTasks,
  nextAction,
  stallDiagnose,
  habitStack,
  energyMatch,
  spacedRepetition,
  summarize,
  chunkText,
  toneShift,
  sayNo,
  setBoundary,
  requestAccommodation,
  feedbackDelivery,
  memoryCue,
  decisionTree,
} from '../cognitive';

describe('taskBreakdown', () => {
  it('returns string[] with at least 1 step (cloud offline → template fallback)', async () => {
    const steps = await taskBreakdown({ goal: 'Test' });
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeGreaterThanOrEqual(1);
    expect(typeof steps[0]).toBe('string');
  }, 15000);

  it('returns array of strings', async () => {
    const steps = await taskBreakdown({ goal: 'Test' });
    for (const s of steps) {
      expect(typeof s).toBe('string');
    }
  }, 15000);
});

describe('timeEstimate', () => {
  it('returns minutes > 0 and a note', () => {
    const { minutes, note } = timeEstimate({ complexity: 3, spoons: 3 });
    expect(minutes).toBeGreaterThan(0);
    expect(typeof note).toBe('string');
  });

  it('scales with complexity', () => {
    const low = timeEstimate({ complexity: 1, spoons: 3 });
    const high = timeEstimate({ complexity: 5, spoons: 3 });
    expect(high.minutes).toBeGreaterThan(low.minutes);
  });
});

describe('crisisCheck', () => {
  it('flags harmful keywords', () => {
    const { flagged, keywords } = crisisCheck({ message: 'I want to hurt myself' });
    expect(flagged).toBe(true);
    expect(keywords).toContain('hurt');
  });

  it('does not flag benign messages', () => {
    const { flagged, keywords } = crisisCheck({ message: 'I am feeling tired today' });
    expect(flagged).toBe(false);
    expect(keywords).toHaveLength(0);
  });
});

describe('grounding54321', () => {
  it('returns 5 elements', () => {
    const steps = grounding54321();
    expect(steps).toHaveLength(5);
  });

  it('each element is a non-empty string', () => {
    const steps = grounding54321();
    for (const s of steps) {
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

describe('meltdownPlan', () => {
  it('returns at least 3 steps', () => {
    const plan = meltdownPlan({ spoons: 3 });
    expect(plan.length).toBeGreaterThanOrEqual(3);
  });

  it('includes grounding step when spoons > 0', () => {
    const plan = meltdownPlan({ spoons: 3 });
    const grounding = plan.find((s) => s.toLowerCase().includes('grounding'));
    expect(grounding).toBeDefined();
  });
});

describe('prioritizeTasks', () => {
  it('sorts by computed score descending', () => {
    const tasks = [
      { name: 'A', urgency: 1, importance: 1, energy: 1 },
      { name: 'B', urgency: 3, importance: 3, energy: 3 },
      { name: 'C', urgency: 2, importance: 2, energy: 2 },
    ];
    const result = prioritizeTasks(tasks);
    expect(result[0].name).toBe('B');
    expect(result[2].name).toBe('A');
  });
});

describe('nextAction', () => {
  it('recommends rest when spoons <= 1', () => {
    const action = nextAction({ tasks: ['Write code'], spoons: 1 });
    expect(action.toLowerCase()).toContain('rest');
  });

  it('recommends first task when spoons > 1', () => {
    const action = nextAction({ tasks: ['Write code'], spoons: 3 });
    expect(action).toContain('Write code');
  });
});

describe('stallDiagnose', () => {
  it('diagnoses overwhelm', () => {
    const result = stallDiagnose({ stuckOn: 'overwhelm' });
    expect(result).toContain('smallest possible');
  });

  it('diagnoses perfection', () => {
    const result = stallDiagnose({ stuckOn: 'perfection' });
    expect(result).toContain('80%');
  });

  it('falls back for unknown blockers', () => {
    const result = stallDiagnose({ stuckOn: 'aliens stole my keyboard' });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('habitStack', () => {
  it('links habit to anchor routine', () => {
    const result = habitStack({ habit: 'meditate', anchor: 'morning coffee' });
    expect(result).toContain('meditate');
    expect(result).toContain('morning coffee');
  });
});

describe('energyMatch', () => {
  it('filters tasks by spoons level', () => {
    const tasks = ['Deep work', 'Create', 'Rest', 'Plan tomorrow'];
    const matched = energyMatch({ tasks, spoons: 3 });
    expect(matched.length).toBeGreaterThanOrEqual(1);
  });
});

describe('spacedRepetition', () => {
  it('returns positive interval and a priority', () => {
    const { daysUntilNext, priority } = spacedRepetition({ difficulty: 3, lastReviewDays: 7 });
    expect(daysUntilNext).toBeGreaterThan(0);
    expect(['urgent', 'soon', 'ok']).toContain(priority);
  });
});

describe('summarize', () => {
  it('truncates to maxSentences', () => {
    const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
    const result = summarize({ text, maxSentences: 2 });
    const sentences = result.split(/[.!?]\s+/);
    expect(sentences.length).toBeLessThanOrEqual(2);
  });
});

describe('chunkText', () => {
  it('splits into chunks', () => {
    const words = Array.from({ length: 30 }, (_, i) => `word${i}`);
    const text = words.join(' ');
    const chunks = chunkText({ text, chunkSize: 10 });
    expect(chunks).toHaveLength(3);
  });
});

describe('toneShift', () => {
  it('prefixes text with tone-based opener', () => {
    const result = toneShift({ text: 'I need help', tone: 'polite' });
    expect(result).toContain('Would it be possible');
  });
});

describe('sayNo', () => {
  it('declines respectfully', () => {
    const result = sayNo({ request: 'Can you work extra hours?' });
    expect(result).toContain('Thank you');
    expect(result).toContain('work extra hours');
  });
});

describe('setBoundary', () => {
  it('states a boundary clearly', () => {
    const result = setBoundary({ topic: 'work on weekends' });
    expect(result).toContain('boundary');
  });
});

describe('requestAccommodation', () => {
  it('requests an accommodation', () => {
    const result = requestAccommodation({ need: 'quiet workspace' });
    expect(result).toContain('accommodate');
    expect(result).toContain('quiet workspace');
  });
});

describe('feedbackDelivery', () => {
  it('delivers observation + impact', () => {
    const result = feedbackDelivery({ observation: 'the meeting ran long', impact: 'frustrating' });
    expect(result).toContain('meeting ran long');
    expect(result).toContain('frustrating');
  });
});

describe('memoryCue', () => {
  it('mentions visual and body anchors', () => {
    const result = memoryCue({ concept: 'quantum spin' });
    expect(result).toContain('looks like');
    expect(result).toContain('physical sensation');
  });
});

describe('decisionTree', () => {
  it('compares options', () => {
    const result = decisionTree({ options: ['Option A', 'Option B'], criteria: [] });
    expect(result).toContain('Option A');
    expect(result).toContain('Option B');
  });

  it('handles empty options', () => {
    const result = decisionTree({ options: [], criteria: [] });
    expect(result).toContain('No options');
  });
});
