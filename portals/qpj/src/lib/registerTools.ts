import { registerWebMCPTools, type RegisteredTool } from './webmcp';
import { useQpjStore } from '../store/useQpjStore';
import { navigateTo, ROUTES, routeForPath, hashToPath } from './routes';
import type { QpjRoute } from './routes';

function tool(
  name: string,
  description: string,
  inputSchema: RegisteredTool['inputSchema'],
  execute: RegisteredTool['execute'],
  annotations: RegisteredTool['annotations'] = { readOnlyHint: true },
): RegisteredTool {
  return { name, description, inputSchema, execute, annotations };
}

export function getPortalSnapshot(): Record<string, unknown> {
  const s = useQpjStore.getState();
  return {
    passportId: s.passportId,
    mode: s.mode,
    spoons: s.spoons,
    theme: s.qpjTheme,
    density: s.density,
    motionScale: s.motionScale,
    soundScale: s.soundScale,
    contrastTarget: s.contrastTarget,
    mood: s.mood,
    presenceRoom: s.presenceRoom,
    breathPattern: s.breathPattern,
    workshopLevel: s.workshopLevel,
    treatsReceived: s.treatsReceived,
  };
}

export function getPortalWebMCPTools(): RegisteredTool[] {
  return [
    tool(
      'get_portal_state',
      'Snapshot of the current portal: mode, spoons, theme, density, sensory scales, mood, presence room, workshop level, treats received.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => getPortalSnapshot(),
    ),
    tool(
      'get_love_balance',
      'Current LOVE ledger balance: sovereignty pool, performance pool, and caregiver care score.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const { love } = useQpjStore.getState();
        return {
          sovereignty: love.sovereignty,
          performance: love.performance,
          careScore: love.careScore,
        };
      },
    ),
    tool(
      'get_current_route',
      'The active portal route (street, talk, craft, you, workshop, switch, and so on).',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const path = hashToPath(window.location.hash);
        const routeId = routeForPath(path);
        return { route: routeId, label: ROUTES[routeId].label, path };
      },
    ),
    tool(
      'get_presence',
      'Which family members are currently online on the trust mesh.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const { presence } = useQpjStore.getState();
        return Object.fromEntries(
          Object.entries(presence)
            .filter(([, node]) => node.online)
            .map(([id, node]) => [id, { mood: node.mood ?? null, spoons: node.spoons ?? null, verified: node.verified ?? false }]),
        );
      },
    ),
    tool(
      'get_identity_status',
      'Identity verification status for the current passport (verified, pending, or unverified).',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const { identity } = useQpjStore.getState();
        return { status: identity.status, name: identity.identity?.name ?? null };
      },
    ),
    tool(
      'navigate_to',
      'Navigate the portal to another route. Route-level guards (making, workshop PIN) still apply — this cannot bypass the caregiver gate.',
      {
        type: 'object',
        properties: {
          route: { type: 'string', enum: Object.keys(ROUTES), description: 'The route to open.' },
        },
        required: ['route'],
        additionalProperties: false,
      },
      ({ route }) => {
        const target = route as QpjRoute;
        if (!ROUTES[target]) return { status: 'error', error: `Unknown route: ${String(route)}` };
        navigateTo(target);
        return { status: 'ok', route: target, label: ROUTES[target].label };
      },
      { readOnlyHint: false },
    ),
  ];
}

/**
 * Register all Phase 1 read-only WebMCP tools plus route navigation.
 * Returns an AbortController — call `.abort()` to unregister everything.
 */
export function registerPortalWebMCPTools(): Promise<AbortController> {
  return registerWebMCPTools(getPortalWebMCPTools());
}