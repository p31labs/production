import { registerWebMCPTool, setupGlobalWebMCPExecutor, listWebMCPToolDefinitions } from './webmcp';
import type { WebMCPInputSchema } from './webmcp';
import { useAppStore } from '../store/useAppStore';

const strProp = (name: string, description: string): WebMCPInputSchema => ({
  type: 'object',
  properties: { [name]: { type: 'string', description } },
  required: [name],
  additionalProperties: false,
});

export function registerMeatspaceWebMCPTools(): void {
  registerWebMCPTool('getPortalState', 'Snapshot of meatspace portal state (spoons, LOVE balance, mood, mesh peer count, userName).', {
    type: 'object', properties: {}, additionalProperties: false,
  }, () => {
    const s = useAppStore.getState();
    return {
      spoons: s.spoons,
      loveBalance: s.loveBalance,
      userName: s.profile?.name || 'friend',
      meshPeers: s.mesh.nodes?.size || 0,
      mood: s.mood,
    };
  });

  registerWebMCPTool('getLoveBalance', 'Current LOVE balance with available and total amounts.', {
    type: 'object', properties: {}, additionalProperties: false,
  }, () => ({ loveBalance: useAppStore.getState().loveBalance }));

  registerWebMCPTool('getMeshPresence', 'List peers currently in the bonding mesh with last-seen timestamps.', {
    type: 'object', properties: {}, additionalProperties: false,
  }, () => {
    const nodes = useAppStore.getState().mesh.nodes;
    return Array.from((nodes as Map<string, { did: string; lastSeen: number }> | undefined)?.values() || []).map((n) => ({
      did: n.did,
      lastSeenAgoMin: Math.round((Date.now() - n.lastSeen) / 60000),
    }));
  });

  registerWebMCPTool('suggestActivity', 'Suggest a bonding activity appropriate for the current spoon level (0–5).', {
    type: 'object',
    properties: {
      spoons: { type: 'integer', minimum: 0, maximum: 5, description: 'Current spoon level (0 = sensory rest, 5 = full energy).' },
    },
    required: ['spoons'],
    additionalProperties: false,
  }, ({ spoons }) => {
    const level = Number(spoons) || 3;
    if (level <= 1) return { activity: 'Sit together and breathe slowly for 2 minutes.', zone: 'calm', spoons: level };
    if (level === 2) return { activity: 'Share one thing that made you smile today.', zone: 'calm', spoons: level };
    if (level === 3) return { activity: 'Try a 5-minute guided stretch together.', zone: 'calm', spoons: level };
    if (level === 4) return { activity: 'Cook a simple snack together in the kitchen.', zone: 'kitchen', spoons: level };
    return { activity: 'Go for a walk outside and notice 3 new things together.', zone: 'wild', spoons: level };
  });

  registerWebMCPTool('grounding54321', 'Return the 5-4-3-2-1 grounding exercise steps for calming down.', {
    type: 'object', properties: {}, additionalProperties: false,
  }, () => ({
    exercise: '5-4-3-2-1 Grounding',
    steps: [
      'Name 5 things you can SEE',
      'Name 4 things you can TOUCH',
      'Name 3 things you can HEAR',
      'Name 2 things you can SMELL',
      'Name 1 thing you can TASTE',
    ],
  }));

  setupGlobalWebMCPExecutor();
}

const PORTAL_FUNCTION_SUBSETS: Record<string, string[]> = {
  meatspace: [
    'getPortalState',
    'getLoveBalance',
    'getMeshPresence',
    'suggestActivity',
    'grounding54321',
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
