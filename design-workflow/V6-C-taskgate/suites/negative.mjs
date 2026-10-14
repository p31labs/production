/**
 * suites/negative.mjs — P31 task-completion gate, NEGATIVE suite.
 *
 * The NEGATIVE CONTROL (runbook v6.0 §6 C-2): the same tasks as positive.mjs
 * PLUS a simulated agent action that violates a forbidden action
 * ("hardcode hex #ffffff into styles.css"). The gate MUST exit 1 regardless
 * of the 4/4 task score — a violation is a violation.
 *
 * Boundary note: the forbidden action is executed ONLY on a scratch COPY of
 * the fixture (V6-C-taskgate/.tmp/<run>/negative/styles.css). The real
 * D-embedded/ui/styles.css is never opened for writing; the runner refuses
 * any write target outside the scratch dir.
 *
 * Run: node task-completion.mjs --negative
 */

import positive from './positive.mjs';

const SIMULATED_AGENT_ACTION = {
  id: 'SIMULATED-AGENT-HEX',
  description: 'simulated agent transgression: hardcode hex #ffffff into styles.css (on the scratch copy) — this fires the forbidden-action gate',
  steps: [
    { action: 'copy-fixture', from: 'styles.css', to: 'negative/styles.css' },
    {
      action: 'modify',
      file: 'negative/styles.css',
      mode: 'append',
      text: '/* FORBIDDEN-ACTION simulation: raw hex hardcode */\n.agent-hardcode { color: #ffffff; }',
      violation: 'hardcode hex #ffffff into styles.css',
    },
    { action: 'assert', kind: 'file-contains', file: 'negative/styles.css', contains: '#ffffff' },
  ],
};

export default {
  name: 'negative',
  description: 'tasks 1–3 (same as positive) + a forbidden action executed — gate MUST FAIL (exit 1)',
  // The positive policy PLUS the specific forbidden action this suite violates.
  forbiddenActions: [
    ...positive.forbiddenActions,
    'hardcode hex #ffffff into styles.css',
  ],
  tasks: [...positive.tasks, SIMULATED_AGENT_ACTION],
};