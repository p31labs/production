import { describe, it, expect } from 'vitest';
import { evaluateSend } from '../cognitiveGate';

describe('cognitive gate — safe messages', () => {
  it('passes a neutral build request straight through', async () => {
    const r = await evaluateSend({ text: 'Build a calming dashboard with a spoon meter', spoonBalance: 12, karma: 5 });
    expect(r.allowed).toBe(true);
    expect(r.shouldShield).toBe(false);
    expect(r.shield).toBeNull();
  });
});

describe('cognitive gate — conflict shielding', () => {
  it('flags a personal attack for shielding and returns a template rewrite', async () => {
    const r = await evaluateSend({ text: 'You NEVER listen to me!!!', spoonBalance: 12, karma: 5 });
    expect(r.allowed).toBe(true);
    expect(r.shouldShield).toBe(true);
    expect(r.analysis.conflictLevel).not.toBe('SAFE');
    expect(r.shield?.rewritten).toBeTruthy();
  });

  it('flags absolutist language even without exclamation marks', async () => {
    const r = await evaluateSend({ text: 'You always ignore what I ask for', spoonBalance: 12, karma: 5 });
    expect(r.shouldShield).toBe(true);
    expect(r.analysis.triggers.length).toBeGreaterThan(0);
  });
});

describe('cognitive gate — stand down denial', () => {
  it('blocks sending when the spoon gate fires (no spoons remaining)', async () => {
    const r = await evaluateSend({ text: 'Build me a login form', spoonBalance: 0, karma: 0 });
    expect(r.allowed).toBe(false);
    expect(r.deniedBy?.id).toBe('gr-002');
  });

  it('allows sending when the spoon gate is clear', async () => {
    const r = await evaluateSend({ text: 'Build me a login form', spoonBalance: 12, karma: 0 });
    expect(r.allowed).toBe(true);
    expect(r.deniedBy).toBeUndefined();
  });
});
