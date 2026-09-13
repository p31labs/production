import { createMachine, assign } from 'xstate';
import { canAccess, type PortalMode } from '../lib/passports';

export interface ModeGateContext {
  required: PortalMode;
  active: PortalMode;
  attempts: number;
}

export type ModeGateEvent =
  | { type: 'REQUEST'; required: PortalMode; active: PortalMode }
  | { type: 'PIN_OK' }
  | { type: 'PIN_CANCEL' }
  | { type: 'RESET' };

/**
 * modeGateMachine — caregiver-PIN elevation lifecycle for deep links.
 *
 *   idle → checking → (hasAccess → ok) | (prompt → PIN_OK → ok | PIN_CANCEL → redirecting)
 *
 * Used by ModeGuard so a `spark` passport hitting `#/craft` or `#/workshop`
 * is held at the PIN prompt instead of crashing into hidden machinery.
 */
export const modeGateMachine = createMachine({
  id: 'modeGate',
  initial: 'idle',
  context: { required: 'spark' as PortalMode, active: 'spark' as PortalMode, attempts: 0 },
  types: {} as { context: ModeGateContext; events: ModeGateEvent },
  states: {
    idle: {
      on: {
        REQUEST: {
          target: 'checking',
          actions: assign({
            required: ({ event }) => event.required,
            active: ({ event }) => event.active,
            attempts: () => 0,
          }),
        },
      },
    },
    checking: {
      always: [
        { guard: ({ context }) => canAccess(context.active, context.required), target: 'ok' },
        { target: 'prompt' },
      ],
    },
    prompt: {
      on: {
        PIN_OK: {
          target: 'ok',
          actions: assign({ attempts: ({ context }) => context.attempts + 1 }),
        },
        PIN_CANCEL: { target: 'redirecting' },
      },
    },
    ok: {
      on: { RESET: { target: 'idle' } },
    },
    redirecting: {
      on: { RESET: { target: 'idle' } },
    },
  },
});