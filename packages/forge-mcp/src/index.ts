#!/usr/bin/env node
/**
 * P31 Forge MCP server (stdio transport).
 *
 * Exposes the live Forge worker (p31-forge.trimtab-signal.workers.dev) to any
 * MCP client — Claude Desktop, Cursor, Windsurf, VS Code, Continue — so agents
 * can generate themed, evidence-blocked .docx documents programmatically.
 *
 * Env:
 *   FORGE_BASE_URL  (optional) — override the Forge worker URL
 *   FORGE_API_KEY   (optional) — sent as X-Forge-Key when present
 *   FORGE_OUT_DIR   (optional) — where .docx files land (default ./forge-out)
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { ForgeClient } from './forge-client.js'
import { TOOLS, handleTool } from './tools.js'

const SERVER_NAME = 'p31-forge-mcp'
const SERVER_VERSION = '0.1.0'

async function main() {
  const client = new ForgeClient()
  const outDir = process.env.FORGE_OUT_DIR ?? './forge-out'

  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params
    try {
      return await handleTool(name, args, { client, outDir })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true }
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
  // stderr only — stdout is the MCP channel
  process.stderr.write(`[${SERVER_NAME}] v${SERVER_VERSION} ready (out=${outDir})\n`)
}

main().catch((e) => {
  process.stderr.write(`[${SERVER_NAME}] fatal: ${e instanceof Error ? e.message : String(e)}\n`)
  process.exit(1)
})