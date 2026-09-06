export interface WebMCPInputSchema {
  type: 'object';
  properties: Record<string, { type: string; description?: string; enum?: string[]; minimum?: number; maximum?: number; items?: { type: string } }>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface WebMCPToolOptions {
  readOnlyHint?: boolean;
  timeout?: number;
  retryCount?: number;
  idempotent?: boolean;
}

interface RegisteredTool {
  name: string;
  description: string;
  inputSchema: WebMCPInputSchema;
  execute: (params: Record<string, unknown>) => unknown | Promise<unknown>;
  readOnlyHint: boolean;
  timeout: number;
  retryCount: number;
}

interface WindowWithMCPTools extends Window {
  __p31MCPTools?: Record<string, { execute: (params: Record<string, unknown>) => Promise<unknown>; version?: string }>;
}

function getModelContext(): { registerTool: (opts: unknown) => void; unregisterTool?: (name: string) => void } | null {
  const docCtx = (document as Document & { modelContext?: { registerTool: (opts: unknown) => void } }).modelContext;
  if (docCtx?.registerTool) return docCtx as never;
  const navCtx = (navigator as Navigator & { modelContext?: { registerTool: (opts: unknown) => void } }).modelContext;
  if (navCtx?.registerTool) return navCtx as never;
  return null;
}

const registry = new Map<string, RegisteredTool>();

function isReadOnly(name: string): boolean {
  return /^(get|list|recall|summary|estimate|check|suggest|outline|note|retrieve|detect|diagnose|reframe|simplify|chunk|breakdown|prioritize|grounding)/.test(name);
}

export function registerWebMCPTool(
  name: string,
  description: string,
  inputSchema: WebMCPInputSchema,
  execute: (params: Record<string, unknown>) => unknown | Promise<unknown>,
  options: WebMCPToolOptions = {}
): void {
  const tool: RegisteredTool = {
    name,
    description,
    inputSchema,
    execute,
    readOnlyHint: options.readOnlyHint ?? isReadOnly(name),
    timeout: options.timeout ?? 3000,
    retryCount: options.retryCount ?? 0,
  };
  registry.set(name, tool);

  const ctx = getModelContext();
  if (ctx?.registerTool) {
    try {
      ctx.registerTool({
        name: `${name}`,
        description,
        inputSchema,
        execute: async (params: Record<string, unknown>) => {
          const errors = validateToolInput(tool, params);
          if (errors.length) return { status: 'error', error: errors.join('; ') };
          return runTool(tool, params);
        },
        annotations: { readOnlyHint: tool.readOnlyHint },
      });
    } catch (e) {
      console.warn('[WebMCP] registration failed:', name, e);
    }
  }

  const win = window as WindowWithMCPTools;
  if (!win.__p31MCPTools) win.__p31MCPTools = {};
  win.__p31MCPTools[name] = {
    execute: async (params: Record<string, unknown>) => runTool(tool, params),
    version: '1.0.0',
  };
}

function validateToolInput(tool: RegisteredTool, params: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const { inputSchema } = tool;
  if (!inputSchema?.properties) return errors;
  if (inputSchema.required) {
    for (const key of inputSchema.required) {
      if (params[key] === undefined) errors.push(`Missing required: ${key}`);
    }
  }
  for (const [key, value] of Object.entries(params)) {
    const prop = inputSchema.properties[key];
    if (!prop) {
      if (inputSchema.additionalProperties === false) errors.push(`Unknown param: ${key}`);
      continue;
    }
    if (prop.type === 'string' && typeof value !== 'string') errors.push(`${key} must be string`);
    if (prop.type === 'integer' && !Number.isInteger(value)) errors.push(`${key} must be integer`);
    if (prop.type === 'number' && typeof value !== 'number') errors.push(`${key} must be number`);
    if (prop.type === 'boolean' && typeof value !== 'boolean') errors.push(`${key} must be boolean`);
    if (prop.type === 'array' && !Array.isArray(value)) errors.push(`${key} must be array`);
    if (prop.enum && !prop.enum.includes(value as string)) errors.push(`${key} must be one of ${prop.enum.join(',')}`);
    if (prop.minimum !== undefined && typeof value === 'number' && value < prop.minimum) errors.push(`${key} must be >= ${prop.minimum}`);
    if (prop.maximum !== undefined && typeof value === 'number' && value > prop.maximum) errors.push(`${key} must be <= ${prop.maximum}`);
  }
  return errors;
}

async function runTool(tool: RegisteredTool, params: Record<string, unknown>): Promise<unknown> {
  let attempts = 0;
  const max = tool.retryCount + 1;
  while (attempts < max) {
    try {
      return await Promise.race([
        Promise.resolve(tool.execute(params)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Tool timeout')), tool.timeout)),
      ]);
    } catch (err) {
      if (++attempts >= max) {
        return { status: 'error', error: err instanceof Error ? err.message : 'Execution failed', attempts };
      }
      await new Promise((r) => setTimeout(r, Math.pow(2, attempts) * 100));
    }
  }
  return { status: 'error', error: 'Execution failed' };
}

export function executeWebMCPTool(name: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const tool = registry.get(name);
  if (!tool) return Promise.resolve({ status: 'error', error: `Tool ${name} not registered` });
  const errors = validateToolInput(tool, params);
  if (errors.length) return Promise.resolve({ status: 'error', error: errors.join('; ') });
  return runTool(tool, params);
}

export function listWebMCPTools(): { name: string; description: string; readOnlyHint: boolean }[] {
  return Array.from(registry.values()).map((t) => ({
    name: t.name,
    description: t.description,
    readOnlyHint: t.readOnlyHint,
  }));
}

export interface WebMCPToolDefinition {
  name: string;
  description: string;
  inputSchema: WebMCPInputSchema;
  readOnlyHint: boolean;
}

export function listWebMCPToolDefinitions(): WebMCPToolDefinition[] {
  return Array.from(registry.values()).map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    readOnlyHint: t.readOnlyHint,
  }));
}

export function isWebMCPAvailable(): boolean {
  return getModelContext() !== null;
}

export function setupGlobalWebMCPExecutor(): void {
  const win = window as WindowWithMCPTools;
  (win as Window & { __p31MCPExec?: (name: string, args: Record<string, unknown>) => Promise<unknown> }).__p31MCPExec =
    (name, args = {}) => executeWebMCPTool(name, args);
}
