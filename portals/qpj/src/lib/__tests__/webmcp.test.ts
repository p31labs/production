import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPortalWebMCPTools } from '../registerTools';
import * as webmcp from '../webmcp';

describe('getPortalWebMCPTools', () => {
  const tools = getPortalWebMCPTools();
  const byName = Object.fromEntries(tools.map((t) => [t.name, t]));

  it('registers the Phase 1 tool set', () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain('get_portal_state');
    expect(names).toContain('get_love_balance');
    expect(names).toContain('get_current_route');
    expect(names).toContain('get_presence');
    expect(names).toContain('navigate_to');
  });

  it('marks read-only tools with readOnlyHint', () => {
    for (const t of tools) {
      if (t.name === 'navigate_to') continue;
      expect(t.annotations?.readOnlyHint).toBe(true);
    }
    expect(byName['navigate_to'].annotations?.readOnlyHint).toBe(false);
  });

  it('validates input schemas', () => {
    for (const t of tools) {
      expect(t.inputSchema.type).toBe('object');
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(typeof t.execute).toBe('function');
    }
  });

  it('navigate_to rejects unknown routes', async () => {
    const result = await byName['navigate_to'].execute({ route: 'nowhere' });
    expect(result).toMatchObject({ status: 'error' });
  });
});

describe('webmcp spec-backed registration', () => {
  let mockRegister: ReturnType<typeof vi.fn>;
  let mockAbort: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRegister = vi.fn().mockResolvedValue(undefined);
    mockAbort = vi.fn();
    (document as Document & { modelContext?: unknown }).modelContext = {
      registerTool: mockRegister,
      unregisterTool: mockAbort,
    };
  });

  afterEach(() => {
    delete (document as Document & { modelContext?: unknown }).modelContext;
    vi.restoreAllMocks();
  });

  it('awaits registerTool and propagates AbortSignal on abort', async () => {
    const controller = await webmcp.registerWebMCPTool(
      {
        name: 'test_tool',
        description: 'Test',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        execute: () => 'ok',
        annotations: { readOnlyHint: true },
      },
      { exposedTo: ['https://example.com'] },
    );

    expect(mockRegister).toHaveBeenCalledTimes(1);
    const { signal, exposedTo } = mockRegister.mock.calls[0][1];
    expect(exposedTo).toEqual(['https://example.com']);
    expect(signal).toBeInstanceOf(AbortSignal);

    // Aborting the returned controller must not throw synchronously.
    expect(() => controller.abort()).not.toThrow();
  });

  it('returns an inert controller when modelContext is absent', async () => {
    delete (document as Document & { modelContext?: unknown }).modelContext;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const controller = await webmcp.registerWebMCPTool({
      name: 'missing_ctx',
      description: 'No ctx',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: () => null,
      annotations: { readOnlyHint: true },
    });

    expect(() => controller.abort()).not.toThrow();
  });

  it('reports availability cleanly', () => {
    expect(webmcp.isWebMCPAvailable()).toBe(true);
  });
});