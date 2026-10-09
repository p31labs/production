/**
 * MCP tool definitions + handlers for the Forge.
 *
 * Four tools:
 *   forge_health    — liveness probe
 *   forge_brand     — the two-mode token set (scene | hub)
 *   forge_stylize   — render a content pack to a themed .docx (REFORMAT route)
 *   forge_compile   — render a content pack (base route)
 *
 * Each docx-returning tool writes the file to disk (FORGE_OUT_DIR, default
 * ./forge-out) and returns both the path and a base64 payload for hosts that
 * prefer inline resources.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { ForgeClient } from './forge-client.js'
import type { ForgeBodyItem, ForgeKind, ForgeTheme } from './types.js'

export const BodyItemSchema: z.ZodType<ForgeBodyItem> = z.union([
  z.object({ type: z.literal('para'), text: z.string() }),
  z.object({ type: z.literal('h1'), text: z.string() }),
  z.object({ type: z.literal('h2'), text: z.string() }),
  z.object({ type: z.literal('bullet'), text: z.string() }),
  z.object({ type: z.literal('numbered'), text: z.string() }),
  z.object({ type: z.literal('affects'), text: z.string() }),
  z.object({
    type: z.literal('evidence'),
    claim: z.string(),
    value: z.string().optional(),
    source: z.string(),
    verified: z.string(),
  }),
  z.object({
    type: z.literal('timeline'),
    entries: z.array(z.object({ date: z.string(), event: z.string() })),
  }),
])

export const PackSchema = z.object({
  kind: z.enum(['paper', 'court', 'letter', 'resolution', 'memo', 'grant', 'report']),
  theme: z.enum(['hub', 'scene']).optional(),
  title: z.string(),
  date: z.string().optional(),
  filename: z.string().optional(),
  amount: z.string().optional(),
  body: z.array(BodyItemSchema),
})

export interface ToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export const TOOLS: readonly ToolDef[] = [
  {
    name: 'forge_health',
    description:
      'Check the P31 Forge worker liveness. Returns service status and version.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'forge_brand',
    description:
      'Return the P31 Forge brand tokens: two-mode palette (scene = dark cyan, hub = warm terracotta), typography, entity constants, and social links. Use this to inspect what themes are available before rendering.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'forge_stylize',
    description:
      'Render a themed .docx from a content pack. This is the primary document-generation tool. Every factual claim should carry an evidence item (claim + value + source + verified date) — the P31 credibility transducer. Returns the file path and a base64 payload.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['paper', 'court', 'letter', 'resolution', 'memo', 'grant', 'report'],
          description: 'The document type. Determines the renderer layout.',
        },
        theme: {
          type: 'string',
          enum: ['hub', 'scene'],
          description:
            'hub = warm cream + terracotta (public front door); scene = deep void + cyan (technical). Defaults to hub.',
        },
        title: { type: 'string', description: 'Document title (used for the filename and heading).' },
        date: { type: 'string', description: 'Document date (ISO or human-readable).' },
        filename: { type: 'string', description: 'Override the output filename (must end in .docx).' },
        amount: { type: 'string', description: 'For grant packs: the requested amount.' },
        body: {
          type: 'array',
          description:
            'The typed body. Each item is one of: para, h1, h2, bullet, numbered, affects, evidence, timeline.',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['para', 'h1', 'h2', 'bullet', 'numbered', 'affects', 'evidence', 'timeline'],
              },
              text: { type: 'string' },
              claim: { type: 'string' },
              value: { type: 'string' },
              source: { type: 'string' },
              verified: { type: 'string' },
              entries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { date: { type: 'string' }, event: { type: 'string' } },
                },
              },
            },
            required: ['type'],
          },
        },
      },
      required: ['kind', 'title', 'body'],
      additionalProperties: false,
    },
  },
  {
    name: 'forge_compile',
    description:
      'Render a .docx from a content pack using the base route (no explicit theme; uses the pack default). Same schema as forge_stylize. Use forge_stylize when you want to control the theme explicitly.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['paper', 'court', 'letter', 'resolution', 'memo', 'grant', 'report'],
        },
        title: { type: 'string' },
        date: { type: 'string' },
        filename: { type: 'string' },
        amount: { type: 'string' },
        body: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['kind', 'title', 'body'],
      additionalProperties: false,
    },
  },
]

export interface ToolContext {
  client: ForgeClient
  outDir: string
}

export async function handleTool(
  name: string,
  args: unknown,
  ctx: ToolContext,
): Promise<{
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'resource'; resource: { uri: string; mimeType: string; blob: string } }
  >
  isError?: boolean
}> {
  switch (name) {
    case 'forge_health': {
      const h = await ctx.client.health()
      return { content: [{ type: 'text', text: JSON.stringify(h, null, 2) }] }
    }

    case 'forge_brand': {
      const b = await ctx.client.brand()
      return { content: [{ type: 'text', text: JSON.stringify(b, null, 2) }] }
    }

    case 'forge_stylize':
    case 'forge_compile': {
      const parsed = PackSchema.parse(args)
      const pack = parsed as {
        kind: ForgeKind
        theme?: ForgeTheme
        title: string
        date?: string
        filename?: string
        amount?: string
        body: ForgeBodyItem[]
      }
      const result =
        name === 'forge_stylize'
          ? await ctx.client.stylize(pack)
          : await ctx.client.compile(pack)

      await mkdir(ctx.outDir, { recursive: true })
      const abs = resolve(join(ctx.outDir, result.filename))
      await writeFile(abs, result.bytes)

      const b64 = Buffer.from(result.bytes).toString('base64')
      return {
        content: [
          {
            type: 'text',
            text: `Rendered ${pack.kind} (theme: ${pack.theme ?? 'default'}).
File: ${abs}
Bytes: ${result.bytes.length}`,
          },
          {
            type: 'resource',
            resource: {
              uri: `forge://${result.filename}`,
              mimeType:
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              blob: b64,
            },
          },
        ],
      }
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
  }
}