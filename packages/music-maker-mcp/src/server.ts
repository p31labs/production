#!/usr/bin/env node
/**
 * @p31ca/music-maker-mcp — src/server.ts
 *
 * The music maker's agent-facing surface. An MCP server exposing the spatial
 * instrument's actions as tools. Agents can observe the family's composition
 * and — with the same bounded autonomy every AAF agent has — place, clear,
 * name, and trigger zones. All committed writes go through the canon gate on
 * the worker; the live trigger is ephemeral and never persisted.
 *
 * The Loom's canon-mcp reads a local file log; the music maker's log lives in
 * D1 behind the worker. These tools call the worker's HTTP API. Same tools,
 * different transport (see music-tools.ts).
 *
 * Run: npm run start   (tsx, stdio transport)
 */
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/server';
import { z } from 'zod';
import * as music from './music-tools';

/** Modern-era revision this server advertises via `server/discover`. */
const PROTOCOL_VERSION = '2026-07-28';

export async function createServer(): Promise<McpServer> {
  // Advertise BOTH eras: the 2026-07-28 stateless surface (server/discover,
  // resultType) plus the legacy initialize handshake (2025-11-25 …) so
  // 2025-era clients keep working. Without the modern revision the raw
  // transport path rejects 2026-07-28 with -32000 (conformance gap).
  const server = new McpServer(
    { name: 'music-maker-mcp', version: '0.0.1' },
    { supportedProtocolVersions: [...SUPPORTED_PROTOCOL_VERSIONS, PROTOCOL_VERSION] },
  );

  // Conformance (2026-07-28): `server/discover` must return top-level
  // `protocolVersion` + capabilities + serverInfo. The SDK emits
  // `supportedVersions` + `capabilities` and stamps serverInfo into `_meta`;
  // add the missing top-level keys (additive only, no other behavior change).
  const sdkServer = server.server as unknown as { _ondiscover: () => Record<string, unknown> };
  const sdkDiscover = sdkServer._ondiscover.bind(sdkServer);
  sdkServer._ondiscover = () => {
    const base = sdkDiscover();
    return {
      protocolVersion: PROTOCOL_VERSION,
      supportedProtocolVersions: Array.isArray(base.supportedVersions)
        ? [...(base.supportedVersions as string[])]
        : [PROTOCOL_VERSION],
      ...base,
    };
  };

  server.registerTool(
    'music_observe',
    {
      description:
        'Read the spatial music maker composition — the family\u2019s score. Returns every zone with its position, timbre, and name. Committed, provenance-tracked.',
      inputSchema: z.object({}),
    },
    async () => {
      const result = await music.observe();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'music_place',
    {
      description:
        'Place a new zone in the spatial music maker at a 3D position with a timbre. COMMITTED — goes through the canon gate, seq-stamped, hash-chained. The family\u2019s arrangement is a replayable log entry.',
      inputSchema: z.object({
        position: z.array(z.number()).length(3).describe('[x, y, z] on the sphere'),
        timbre: z.enum(['hydrogen', 'carbon', 'oxygen', 'phosphor']).describe('the zone\u2019s sound'),
        name: z.string().optional().describe('a display name for the zone'),
      }),
    },
    async ({ position, timbre, name }) => {
      const result = await music.place(position as [number, number, number], timbre, name);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'music_clear',
    {
      description:
        'Remove a zone from the spatial music maker. COMMITTED — the removal is a log entry like any other composition change.',
      inputSchema: z.object({ zoneId: z.string().describe('the zone id to remove') }),
    },
    async ({ zoneId }) => {
      const result = await music.clear(zoneId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'music_name',
    {
      description:
        'Rename a zone in the spatial music maker. COMMITTED — the name is part of the provenance-tracked score.',
      inputSchema: z.object({ zoneId: z.string(), name: z.string().describe('the new display name') }),
    },
    async ({ zoneId, name }) => {
      const result = await music.name(zoneId, name);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'music_trigger',
    {
      description:
        'Trigger a zone \u2014 the live act of it sounding. EPHEMERAL: broadcast to the other family members\u2019 devices, never persisted, never gated.',
      inputSchema: z.object({ zoneId: z.string() }),
    },
    async ({ zoneId }) => {
      const result = await music.trigger(zoneId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}

/**
 * A stateless HTTP handler for edge deployment (the music-maker-mcp Worker).
 * Builds a fresh server per request (registering the tools) and serves it
 * through the SDK v2 HTTP entry (`createMcpHandler`) — the same modern
 * 2026-07-28 surface the other P31 workers use: SEP-2243 Mcp-* headers,
 * `server/discover`, `resultType`, -32022 version mismatches, and the legacy
 * `initialize` fallback for 2025-era clients. Reused by the Cloudflare Worker
 * wrapper.
 */
export async function createWorkerHandler(fetcher?: typeof fetch): Promise<(request: Request) => Promise<Response>> {
  if (fetcher) music.setFetcher(fetcher);
  const handler = createMcpHandler(() => createServer());
  return (request: Request) => handler.fetch(request);
}