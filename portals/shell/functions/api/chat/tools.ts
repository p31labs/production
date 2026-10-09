/**
 * api/chat/tools.ts — the tool registry for the chat surface.
 *
 * Each tool declares its name, a JSON schema, an `action` from the authz Action
 * union (the field isConsequential reads), and an execute function. The
 * `action` is the policy: a tool whose action is consequential (e.g. deploy)
 * gates behind human approval; every other tool executes immediately.
 *
 * Two tools are registered: `search_ledger` (read-only, action 'view') and
 * `deploy_surface` (consequential, action 'deploy'). The second is the approval
 * path's test case.
 */
import type { Action } from '../../../src/shell/authz';

export interface ToolDef {
  name: string;
  description: string;
  /** The authz action this tool maps to — isConsequential reads this. */
  action: Action;
  /** The JSON schema of the tool's arguments. */
  parameters: Record<string, unknown>;
  execute(args: Record<string, unknown>): Promise<string>;
}

export const TOOL_REGISTRY: ToolDef[] = [
  {
    name: 'search_ledger',
    description: 'Search the P31 event ledger for matching events.',
    action: 'view',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'The search query.' } },
      required: ['query'],
    },
    async execute(args) {
      return `ledger search for "${String(args.query ?? '')}" returned no matches (stub).`;
    },
  },
  {
    name: 'deploy_surface',
    description: 'Deploy a generated surface to production.',
    action: 'deploy',
    parameters: {
      type: 'object',
      properties: { surface: { type: 'string', description: 'The surface id to deploy.' } },
      required: ['surface'],
    },
    async execute(args) {
      return `deployed surface "${String(args.surface ?? '')}" (stub).`;
    },
  },
];

/** Resolve a tool by name. */
export function toolByName(name: string): ToolDef | undefined {
  return TOOL_REGISTRY.find((t) => t.name === name);
}

/** The shape Workers AI expects for the `tools` array. */
export function toolsForModel(): Array<{ name: string; description: string; parameters: Record<string, unknown> }> {
  return TOOL_REGISTRY.map(({ name, description, parameters }) => ({ name, description, parameters }));
}