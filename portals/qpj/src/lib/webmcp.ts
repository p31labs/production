/**
 * Portals WebMCP helper — current Chrome imperative API (Chrome 149+).
 *
 * Key differences from the legacy single-arg pattern:
 * - `registerTool` returns a Promise (must await).
 * - `exposedTo` array gates cross-origin iframe access.
 * - `AbortSignal` enables lifecycle-aware unregistration.
 * - `annotations: { readOnlyHint, untrustedContentHint, consequentialHint }` are metadata hints for agents.
 *
 * @see https://developer.chrome.com/docs/ai/webmcp/imperative-api
 */

export interface WebMCPInputSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  items?: { type: string };
}

export interface WebMCPInputSchema {
  type: 'object';
  properties: Record<string, WebMCPInputSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface WebMCPToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
  consequentialHint?: boolean;
}

interface ModelContext {
  registerTool(
    tool: {
      name: string;
      description: string;
      inputSchema: WebMCPInputSchema;
      execute: (params: Record<string, unknown>, ctx?: { signal?: AbortSignal }) => unknown | Promise<unknown>;
      annotations?: WebMCPToolAnnotations;
    },
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ): Promise<void>;
  unregisterTool?(name: string): void;
}

function getModelContext(): ModelContext | null {
  const ctx = (document as Document & { modelContext?: ModelContext }).modelContext;
  if (ctx?.registerTool) return ctx;
  return null;
}

export interface RegisteredTool {
  name: string;
  description: string;
  inputSchema: WebMCPInputSchema;
  execute: (params: Record<string, unknown>, ctx?: { signal?: AbortSignal }) => unknown | Promise<unknown>;
  annotations: WebMCPToolAnnotations;
}

const registry = new Map<string, RegisteredTool & { controller: AbortController }>();

export function isWebMCPAvailable(): boolean {
  return getModelContext() !== null;
}

/**
 * Register a tool with the current Chrome imperative API.
 * Returns an AbortController whose `.abort()` unregisters the tool.
 *
 * @param tool - Tool definition (name, description, inputSchema, execute, annotations).
 * @param options.exposedTo - Origins allowed to view/execute this tool from a cross-origin iframe.
 */
export async function registerWebMCPTool(
  tool: RegisteredTool,
  options: { exposedTo?: string[] } = {},
): Promise<AbortController> {
  const ctx = getModelContext();
  const controller = new AbortController();

  if (!ctx?.registerTool) {
    console.warn('[WebMCP] document.modelContext not available — tool not registered:', tool.name);
    return controller;
  }

  try {
    await ctx.registerTool(
      {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: tool.execute,
        annotations: tool.annotations,
      },
      {
        signal: controller.signal,
        ...(options.exposedTo ? { exposedTo: options.exposedTo } : {}),
      },
    );

    registry.set(tool.name, { ...tool, controller });
  } catch (e) {
    console.warn('[WebMCP] registration failed:', tool.name, e);
  }

  return controller;
}

/**
 * Register multiple tools in one call, returning a single AbortController
 * whose `.abort()` unregisters all of them.
 */
export async function registerWebMCPTools(
  tools: RegisteredTool[],
  options: { exposedTo?: string[] } = {},
): Promise<AbortController> {
  const master = new AbortController();

  const results = await Promise.allSettled(
    tools.map((tool) => registerWebMCPTool(tool, options)),
  );

  // Tie individual controllers to the master so abort propagates.
  for (const result of results) {
    if (result.status === 'fulfilled') {
      master.signal.addEventListener('abort', () => result.value.abort(), { once: true });
    }
  }

  return master;
}

export function unregisterAllWebMCPTools(): void {
  for (const [, entry] of registry) {
    entry.controller.abort();
  }
  registry.clear();
}

export function listWebMCPTools(): { name: string; description: string; annotations: WebMCPToolAnnotations }[] {
  return Array.from(registry.values()).map(({ name, description, annotations }) => ({
    name,
    description,
    annotations,
  }));
}
