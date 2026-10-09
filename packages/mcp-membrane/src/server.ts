#!/usr/bin/env node

import { MembraneClient } from './client';

const client = new MembraneClient();

const TOOLS = [
  {
    name: 'membrane_status',
    description: 'Get Membrane system status (XP, LOVE, level, streak, achievements)',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'membrane_dora',
    description: 'Get DORA metrics — deployment frequency, lead time, change failure rate, MTTR',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'membrane_history',
    description: 'Get deploy history with check results',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Number of deploys to return (default 20)' } },
      required: [],
    },
  },
  {
    name: 'membrane_achievements',
    description: 'List all unlocked achievements with tiers and timestamps',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'membrane_deploy_check',
    description: 'Record a deploy check result and earn XP/LOVE',
    inputSchema: {
      type: 'object',
      properties: {
        deployId: { type: 'string', description: 'Deploy ID from startDeploy' },
        checkId: { type: 'string', description: 'Unique check identifier' },
        name: { type: 'string', description: 'Check name (e.g. HTTP Status, Console Errors)' },
        category: { type: 'string', enum: ['http', 'browser', 'asset', 'security', 'performance'], description: 'Check category' },
        passed: { type: 'boolean', description: 'Whether the check passed' },
        message: { type: 'string', description: 'Result message' },
        durationMs: { type: 'number', description: 'Check duration in milliseconds' },
      },
      required: ['deployId', 'checkId', 'name', 'category', 'passed', 'message', 'durationMs'],
    },
  },
  {
    name: 'membrane_dora_scorecard',
    description: 'Get a formatted DORA scorecard with color-coded status per metric',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'membrane_artifact_mint',
    description: 'Mint a physical artifact from an achievement (generates serial number)',
    inputSchema: {
      type: 'object',
      properties: {
        achievementId: { type: 'string', description: 'Achievement ID to mint' },
        did: { type: 'string', description: 'DID of the owner' },
        tier: { type: 'string', enum: ['bronze', 'silver', 'gold', 'platinum'], description: 'Artifact tier' },
      },
      required: ['achievementId', 'did', 'tier'],
    },
  },
];

function respond(id: unknown, result: unknown) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function respondError(id: unknown, code: number, message: string) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

async function handleRequest(msg: { id: unknown; method: string; params?: any }) {
  const { id, method, params } = msg;

  switch (method) {
    case 'initialize':
      return respond(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'p31-mcp-membrane', version: '1.0.0' },
      });

    case 'tools/list':
      return respond(id, { tools: TOOLS });

    case 'tools/call': {
      const toolName = params?.name;
      const args = params?.arguments || {};

      try {
        switch (toolName) {
          case 'membrane_status': {
            const state = await client.getState();
            return respond(id, {
              content: [{ type: 'text', text: JSON.stringify(state, null, 2) }],
            });
          }

          case 'membrane_dora': {
            const metrics = await client.getDORAMetrics();
            return respond(id, {
              content: [{ type: 'text', text: JSON.stringify(metrics, null, 2) }],
            });
          }

          case 'membrane_history': {
            const history = await client.getHistory(args.limit || 20);
            return respond(id, {
              content: [{ type: 'text', text: JSON.stringify(history, null, 2) }],
            });
          }

          case 'membrane_achievements': {
            const state = await client.getState();
            return respond(id, {
              content: [{ type: 'text', text: JSON.stringify(state.achievements, null, 2) }],
            });
          }

          case 'membrane_deploy_check': {
            const deployId = args.deployId as string;
            if (!deployId) return respondError(id, -32602, 'deployId required');

            const result = await client.recordCheck(deployId, {
              id: args.checkId as string,
              name: args.name as string,
              category: args.category as string,
              passed: args.passed as boolean,
              message: args.message as string,
              durationMs: args.durationMs as number,
            });
            return respond(id, {
              content: [{ type: 'text', text: JSON.stringify({ ok: true, ...result }, null, 2) }],
            });
          }

          case 'membrane_dora_scorecard': {
            const metrics = await client.getDORAMetrics();
            const scorecard = [
              { metric: 'Deployment Frequency', value: `${metrics.deploymentFrequency}/day`, label: metrics.deploymentFrequencyLabel, color: getColor(metrics.deploymentFrequencyLabel), status: toStatus(metrics.deploymentFrequencyLabel) },
              { metric: 'Lead Time for Changes', value: `${metrics.leadTimeForChanges} min`, label: metrics.leadTimeForChangesLabel, color: getColor(metrics.leadTimeForChangesLabel), status: toStatus(metrics.leadTimeForChangesLabel) },
              { metric: 'Change Failure Rate', value: `${metrics.changeFailureRate}%`, label: metrics.changeFailureRateLabel, color: getColor(metrics.changeFailureRateLabel), status: toStatus(metrics.changeFailureRateLabel) },
              { metric: 'Mean Time to Restore', value: `${metrics.meanTimeToRestore} hrs`, label: metrics.meanTimeToRestoreLabel, color: getColor(metrics.meanTimeToRestoreLabel), status: toStatus(metrics.meanTimeToRestoreLabel) },
              { metric: 'Overall DORA Score', value: `${metrics.overallScore}/100`, label: metrics.overallLabel, color: getColor(metrics.overallLabel), status: toStatus(metrics.overallLabel) },
            ];
            return respond(id, {
              content: [{ type: 'text', text: JSON.stringify(scorecard, null, 2) }],
            });
          }

          case 'membrane_artifact_mint': {
            const serial = `P31-${(args.tier as string).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
            return respond(id, {
              content: [{ type: 'text', text: JSON.stringify({
                ok: true, serial,
                achievementId: args.achievementId,
                tier: args.tier,
                did: args.did,
                timestamp: new Date().toISOString(),
                verificationUrl: `https://phos.p31ca.org/verify/${serial}`,
              }, null, 2) }],
            });
          }

          default:
            return respondError(id, -32602, `Unknown tool: ${toolName}`);
        }
      } catch (e: any) {
        return respond(id, {
          content: [{ type: 'text', text: JSON.stringify({ error: e.message, status: 'error' }) }],
          isError: true,
        });
      }
    }

    default:
      return respondError(id, -32601, `Method not found: ${method}`);
  }
}

function getColor(label: string): string {
  switch (label.toLowerCase()) {
    case 'elite': return '#22c55e';
    case 'high': return '#4d96ff';
    case 'medium': return '#f59e0b';
    case 'low': return '#ef4444';
    default: return '#64748b';
  }
}

function toStatus(label: string): 'elite' | 'high' | 'medium' | 'low' {
  const l = label.toLowerCase();
  if (l === 'elite') return 'elite';
  if (l === 'high') return 'high';
  if (l === 'medium') return 'medium';
  return 'low';
}

export function startMCPServer() {
  let buffer = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        handleRequest(JSON.parse(trimmed));
      } catch {}
    }
  });

  process.stdin.on('end', () => {
    if (buffer.trim()) {
      try {
        handleRequest(JSON.parse(buffer.trim()));
      } catch {}
    }
  });
}

if (process.argv[1]?.endsWith('server.js') || process.argv[1]?.endsWith('server.ts')) {
  startMCPServer();
}
