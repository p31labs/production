import { useAppStore } from '../store/useAppStore';
import { useShellStore } from '../store/useShellStore';
import { useSandboxStore } from '../features/sandbox/sandboxStore';
import { useSensoryStore } from '../store/useSensoryStore';
import { useEffectsStore } from '../store/useEffectsStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { renderA2UIHost } from './a2uiHost';
import { akinatorStart, akinatorAnswer, akinatorGetState } from './akinator';
import { logSpoonChange, getForecast, getSpoonHistory } from './spoonHistory';
import { rotateKEL } from './keri';
import { connectMesh, disconnectMesh } from './mesh';
import * as cognitive from './cognitive';
import * as comms from './comms';
import { isTailscaleConfigured, storeTailscaleConfig, listTailscaleDevices } from './tailscale';
import { isOllamaRunning, listOllamaModels, ollamaChat } from './ollama';
import { preloadAllToolLists, MCP_ENDPOINTS, fetchMCPTools, callMCPTool } from './mcpRegistry';
import { SERVICES } from '../data/serviceRegistry';
import { bumpFrecency } from './frecency';
import type { Tab } from '../store/useAppStore';

export interface CommandArg {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  options?: string[];
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
}

export interface Command {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'action' | 'assistant' | 'tool';
  icon?: string;
  args?: CommandArg[];
  execute: (args?: Record<string, any>) => Promise<unknown> | unknown;
  when?: (context: CommandContext) => boolean;
  llmTool?: boolean;
}

export interface CommandContext {
  tab: Tab;
  spoons: number;
  unread: number;
}

const registry: Command[] = [];

export function registerCommand(cmd: Command): void {
  const i = registry.findIndex((c) => c.id === cmd.id);
  if (i >= 0) registry[i] = cmd;
  else registry.push(cmd);
}

export function getCommands(context: CommandContext): Command[] {
  return registry.filter((c) => !c.when || c.when(context));
}

export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const t = text.toLowerCase();
  let qi = 0;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score++;
      qi++;
    }
  }
  if (qi !== q.length) return 0;
  return (score / q.length) * (t.startsWith(q) ? 1.2 : 1);
}

function tabContext(tab: Tab): CommandContext {
  const app = useAppStore.getState();
  return {
    tab,
    spoons: app.spoons,
    unread: useShellStore.getState().unreadCount,
  };
}

export function registerShellCommands(): void {
  const app = useAppStore.getState();
  const shell = useShellStore.getState();
  const setTab = app.setTab;
  const setSpoons = app.setSpoons;
  const setUi = app.setUi;
  const showToast = app.showToast;
  const setAssistantOpen = shell.setAssistantOpen;
  const setAssistantMode = shell.setAssistantMode;
  const setAkinatorOpen = shell.setAkinatorOpen;
  const setProfileSubTab = shell.setProfileSubTab;
  const setMeshOpen = shell.setMeshOpen;
  const setNodeZeroOpen = shell.setNodeZeroOpen;
  const setJusticeOpen = shell.setJusticeOpen;
  const setSbtOpen = shell.setSbtOpen;
  const setMarketOpen = shell.setMarketOpen;
  const setMcpOpen = shell.setMcpOpen;
  const setDunaOpen = shell.setDunaOpen;
  const setHubOpen = shell.setHubOpen;
  const setInsightsOpen = shell.setInsightsOpen;
  const markAllRead = shell.markAllRead;
  const clearAll = shell.clearAll;
  const refreshLoveBalance = app.refreshLoveBalance;

  const openWalletTab = (sub: 'identity' | 'wallet' | 'passport' | 'credentials') => {
    setProfileSubTab(sub);
    setTab('profile');
  };

  const nav = (tab: Tab): Command => ({
    id: `nav:${tab}`,
    name: `Go to ${tab}`,
    description: `Navigate to the ${tab} surface`,
    category: 'navigation',
    icon: '🧭',
    execute: () => setTab(tab),
    llmTool: true,
  });

  const navCommands = (['home', 'bonding', 'dashboard', 'sandbox', 'cockpit', 'profile', 'research'] as Tab[]).map(nav);

  const navArgs = {
    home: navCommands[0],
    bonding: navCommands[1],
    dashboard: navCommands[2],
    sandbox: navCommands[3],
    profile: navCommands[4],
  };

  const commands: Command[] = [
    ...navCommands,

    {
      id: 'spoons:set',
      name: 'Set spoon level',
      description: 'Adjust your energy level from 0 (rest) to 5 (full)',
      category: 'action',
      icon: '🥄',
      args: [
        { name: 'level', type: 'select', options: ['0', '1', '2', '3', '4', '5'], placeholder: '0–5', required: true },
      ],
      execute: async (args) => {
        const level = args?.level;
        const n = Number(level);
        if (Number.isInteger(n) && n >= 0 && n <= 5) {
          setSpoons(n);
          logSpoonChange(n, 'command').catch(() => {});
          if (n === 0) {
            setUi({ showCrisis: true, toast: null });
          } else {
            setUi({ showCrisis: false, showBreak: false });
          }
          showToast(`🥄 Spoons set to ${n}`, 'success');
        }
      },
      llmTool: true,
    },
    {
      id: 'spoons:rest',
      name: 'Enter rest mode',
      description: 'Drop to 0 spoons — only the starfield remains',
      category: 'action',
      icon: '🧘',
      execute: () => {
        setSpoons(0);
        logSpoonChange(0, 'command-rest').catch(() => {});
        setUi({ showCrisis: true, toast: null });
      },
      llmTool: true,
    },
    {
      id: 'love:refresh',
      name: 'Refresh LOVE balance',
      description: 'Pull the latest LOVE balance from the ledger',
      category: 'action',
      icon: '💎',
      execute: async () => {
        try {
          await refreshLoveBalance();
          const bal = useAppStore.getState().loveBalance?.availableBalance;
          showToast(`💎 LOVE balance: ${bal ?? '—'}`, 'success');
        } catch {
          showToast('💎 Could not reach the ledger', 'error');
        }
      },
      llmTool: true,
    },

    {
      id: 'assistant:open',
      name: 'Open assistant',
      description: 'Open the assistant panel to ask a question or use a tool',
      category: 'assistant',
      icon: '🧠',
      execute: () => setAssistantOpen(true),
      llmTool: true,
    },
    {
      id: 'assistant:mode',
      name: 'Set assistant engine mode',
      description: 'Choose where the assistant runs: auto (local when ready, else cloud), local (on-device WebGPU), or cloud',
      category: 'assistant',
      icon: '🧠',
      args: [
        { name: 'mode', type: 'select', options: ['auto', 'local', 'cloud'], placeholder: 'auto | local | cloud', required: true },
      ],
      execute: (args) => {
        const mode = args?.mode as 'auto' | 'local' | 'cloud';
        if (mode === 'auto' || mode === 'local' || mode === 'cloud') {
          setAssistantMode(mode);
          return `🧠 Assistant engine set to ${mode}`;
        }
        return '❌ Invalid mode — use auto, local, or cloud';
      },
      llmTool: true,
    },
    {
      id: 'assistant:summarize',
      name: 'Summarize notifications',
      description: 'Ask the assistant to summarize your notification hub',
      category: 'assistant',
      icon: '📋',
      execute: () => {
        setAssistantOpen(true);
        setHubOpen(false);
      },
    },

    {
      id: 'hub:open',
      name: 'Open notifications',
      description: 'Show the notification hub',
      category: 'action',
      icon: '🔔',
      execute: () => setHubOpen(true),
      when: (ctx) => ctx.unread > 0,
    },
    {
      id: 'notif:markAllRead',
      name: 'Mark all notifications read',
      description: 'Clear the unread badge in the hub',
      category: 'action',
      icon: '✅',
      execute: () => markAllRead(),
      llmTool: true,
    },
    {
      id: 'notif:clear',
      name: 'Clear notifications',
      description: 'Remove all notifications from the hub',
      category: 'action',
      icon: '🧹',
      execute: () => clearAll(),
      llmTool: true,
    },
    {
      id: 'akinator',
      name: 'PHOS Oracle',
      description: 'Answer a few questions — I will find the right surface or tool for you',
      category: 'assistant',
      icon: '🧭',
      execute: () => setAkinatorOpen(true),
      llmTool: true,
    },
    {
      id: 'akinator:start',
      name: 'Start akinator',
      description: 'Begin the 20-questions intent resolver — returns the first question and candidate count',
      category: 'tool',
      icon: '🧭',
      execute: () => akinatorStart(),
      llmTool: true,
    },
    {
      id: 'akinator:answer',
      name: 'Answer similar question',
      description: 'Answer yes or no to the current akinator question. Returns the next question or final suggestions.',
      category: 'tool',
      icon: '✅',
      args: [{ name: 'yes', type: 'boolean', placeholder: 'true or false', required: true }],
      execute: (args) => akinatorAnswer(!!args?.yes),
      llmTool: true,
    },
    {
      id: 'akinator:state',
      name: 'Get akinator state',
      description: 'Get the current question, candidate count, and any ready suggestions from the akinator',
      category: 'tool',
      icon: '📊',
      execute: () => akinatorGetState(),
      llmTool: true,
    },
    {
      id: 'spoons:forecast',
      name: 'Spoon forecast',
      description: 'Predict upcoming energy dips based on your spoon history and suggest proactive rest',
      category: 'tool',
      icon: '🥄',
      execute: () => getForecast(),
      llmTool: true,
    },
    {
      id: 'identity:open',
      name: 'Open identity panel',
      description: 'View your sovereign identity: did:key, Ed25519 key, ML-DSA-65 post-quantum key, and credentials',
      category: 'tool',
      icon: '🔐',
      execute: () => openWalletTab('identity'),
    },
    {
      id: 'vault:open',
      name: 'Open Vault',
      description: 'Open the Phenix Vault for vault management, credentials, and recovery guardians',
      category: 'tool',
      icon: '🔐',
      execute: () => openWalletTab('wallet'),
    },
    {
      id: 'mesh:status',
      name: 'Mesh status',
      description: 'View the K₄ mesh — connected family peers, topology, symmetry, and connection status',
      category: 'tool',
      icon: '🕸️',
      execute: () => setMeshOpen(true),
    },
    {
      id: 'node:pair',
      name: 'Pair Node Zero',
      description: 'Pair your shell with Node Zero (ESP32-S3 sovereign hardware) for spoon sync and care proofs',
      category: 'tool',
      icon: '🖥️',
      execute: () => setNodeZeroOpen(true),
    },
    {
      id: 'node:status',
      name: 'Node Zero status',
      description: 'Check the pairing and connection status of your Node Zero hardware',
      category: 'tool',
      icon: '📡',
      execute: () => setNodeZeroOpen(true),
    },
    {
      id: 'justice:open',
      name: 'Open justice panel',
      description: 'Sovereign justice — evidence deposition, escrow, and online dispute resolution',
      category: 'tool',
      icon: '⚖️',
      execute: () => setJusticeOpen(true),
    },
    {
      id: 'sbt:open',
      name: 'LOVE SBTs',
      description: 'Mint, view, and manage your on-chain LOVE Soulbound Tokens (SBTs) on Base Sepolia',
      category: 'tool',
      icon: '💎',
      execute: () => setSbtOpen(true),
    },
    {
      id: 'market:open',
      name: 'Marketplace',
      description: 'P31 Marketplace — list, offer, accept, escrow, and dispute LOVE-credits and care services',
      category: 'tool',
      icon: '🏪',
      execute: () => setMarketOpen(true),
    },
    {
      id: 'love:earn',
      name: 'Earn LOVE',
      description: 'Mint LOVE care credits for a completed task or attestation',
      category: 'tool',
      icon: '💎',
      args: [{ name: 'reason', type: 'string', placeholder: 'reason for earning LOVE' }],
      execute: async (args) => {
        const did = await useAppStore.getState().did || (await (await import('./memory')).ensureDid());
        const res = await fetch('https://love-ledger.p31ca.org/api/love/earn', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userId: did, transactionType: 'care-attestation', metadata: { reason: args?.reason } }),
        });
        return res.json();
      },
      llmTool: true,
    },
    {
      id: 'love:chain',
      name: 'View LOVE chain',
      description: 'Get the SHA-256 hash-chained LOVE ledger for verifiable care credits',
      category: 'tool',
      icon: '🔗',
      execute: async () => {
        const res = await fetch('https://love-ledger.p31ca.org/api/love/chain');
        return res.json();
      },
      llmTool: true,
    },
    {
      id: 'intent:quote',
      name: 'Creation quote',
      description: 'Ask the intent resolver for a creation quote — how much LOVE or USDC your task is worth',
      category: 'tool',
      icon: '🧾',
      args: [{ name: 'prompt', type: 'string', placeholder: 'describe the task', required: true }],
      execute: async (args) => {
        const did = await useAppStore.getState().did || (await (await import('./memory')).ensureDid());
        const res = await fetch('https://intent-resolver.trimtab-signal.workers.dev/intent', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ prompt: args?.prompt, did, spoons: useAppStore.getState().spoons }),
        });
        return res.json();
      },
      llmTool: true,
    },
    {
      id: 'receipt:submit',
      name: 'Submit receipt',
      description: 'Log a completed task as a creation receipt — records spoon delta for LOVE compensation',
      category: 'tool',
      icon: '📄',
      args: [
        { name: 'intent_id', type: 'string', placeholder: 'intent ID from quote', required: true },
        { name: 'pre_spoons', type: 'number', placeholder: 'spoons before task', required: true },
        { name: 'post_spoons', type: 'number', placeholder: 'spoons after task', required: true },
      ],
      execute: async (args) => {
        const did = await useAppStore.getState().did || (await (await import('./memory')).ensureDid());
        const res = await fetch('https://creation-accountant.trimtab-signal.workers.dev/receipt', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            intent_id: args?.intent_id,
            did,
            pre_spoons: Number(args?.pre_spoons),
            post_spoons: Number(args?.post_spoons),
            nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          }),
        });
        return res.json();
      },
      llmTool: true,
    },

    // ───── A2UI (declarative agent UI → React) ─────
    {
      id: 'a2ui:render',
      name: 'Render A2UI components',
      description: 'Render declarative A2UI component JSON into the shell. Accepts an array of {id, component, props, children}. Components: Button, Card, Form, List, Badge, ProgressBar, Modal, Table, Tabs, Toast, Meter, Grid.',
      category: 'tool',
      icon: '🧩',
      args: [
        { name: 'ui', type: 'string', placeholder: 'JSON array of A2UI elements', required: true },
      ],
      execute: async (args) => {
        try {
          const raw = args?.ui;
          const ui = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (!Array.isArray(ui)) throw new Error('a2ui:render expects a JSON array of elements');
          const container = document.getElementById('a2ui-container');
          if (!container) return { status: 'error', message: 'No #a2ui-container element' };
          const handlers = (window as any).__a2uiHandlers as Record<string, (payload?: unknown, el?: HTMLElement) => void> | undefined;
          const rendered = renderA2UIHost(
            ui,
            container,
            (action, payload, el) => handlers?.[action]?.(payload, el),
            (message, variant) => showToast(message, variant === 'error' ? 'error' : 'success'),
          );
          return { status: 'ok', rendered };
        } catch (e) {
          return { status: 'error', message: e instanceof Error ? e.message : String(e) };
        }
      },
      llmTool: true,
    },

    // ───── KERI identity ─────
    {
      id: 'identity:rotate',
      name: 'Rotate KERI identity',
      description: 'Append a key rotation event to your Key Event Log (KEL) and broadcast through the mesh',
      category: 'tool',
      icon: '🔑',
      execute: async () => { const e = await rotateKEL(); return e ?? { ok: false }; },
      llmTool: true,
    },

    // ───── Mesh ─────
    {
      id: 'mesh:connect',
      name: 'Connect to mesh',
      description: 'Connect the shell to the P31 family mesh (PeerJS + optional Tailscale discovery)',
      category: 'tool',
      icon: '🕸️',
      execute: () => connectMesh(),
    },
    {
      id: 'mesh:disconnect',
      name: 'Disconnect from mesh',
      description: 'Disconnect from the P31 family mesh',
      category: 'tool',
      icon: '⛔',
      execute: () => disconnectMesh(),
    },

    // ───── Tailscale ─────
    {
      id: 'tailscale:config',
      name: 'Configure Tailscale',
      description: 'Set your Tailscale tailnet ID and API token for mesh discovery',
      category: 'tool',
      icon: '🔐',
      args: [
        { name: 'tailnet', type: 'string', placeholder: 'tailnet ID (e.g. TB5Upq5Gkw11CNTRL)', required: true },
        { name: 'apiToken', type: 'string', placeholder: 'tskey-api-...', required: true },
      ],
      execute: (args) => {
        storeTailscaleConfig({ tailnet: args?.tailnet as string, apiToken: args?.apiToken as string });
        return { ok: true };
      },
    },
    {
      id: 'tailscale:status',
      name: 'Tailscale status',
      description: 'List devices on your Tailscale tailnet and their connection status',
      category: 'tool',
      icon: '📡',
      execute: async () => {
        if (!isTailscaleConfigured()) return { ok: false, error: 'Tailscale not configured' };
        const devices = await listTailscaleDevices();
        return { ok: true, devices };
      },
      llmTool: true,
    },

    // ───── LOVE registry ─────
    // ───── Bonding ─────
    {
      id: 'bonding:quest',
      name: 'Complete bonding ritual',
      description: 'Complete the next ritual quest (or self-care fallback) and mint LOVE care credits for it',
      category: 'tool',
      icon: '🧬',
      execute: async () => {
        const { completeNextRitual } = await import('../features/bonding/questEngine');
        const res = await completeNextRitual();
        if (res.ok) {
          showToast(`💎 +${res.loveReward} LOVE — ${res.solo ? 'self-care' : 'ritual'} complete`, 'success');
        }
        return res;
      },
      llmTool: true,
    },
    {
      id: 'block:place',
      name: 'Place test block',
      description: 'Emit a BLOCK_PLACED event (+1 LOVE) for testing the game→ledger hook',
      category: 'tool',
      icon: '🧱',
      execute: async () => {
        const { placeBlock } = await import('../features/bonding/bondingState');
        placeBlock({ test: true, ts: Date.now() });
        return { ok: true };
      },
    },

    // ───── Roblox Bridge ─────
    {
      id: 'roblox:status',
      name: 'Roblox bridge status',
      description: 'Check if the roblox-bridge Worker is reachable',
      category: 'tool',
      icon: '📡',
      execute: async () => {
        const res = await fetch('https://roblox-bridge.trimtab-signal.workers.dev/health');
        const data = await res.json();
        return { type: 'text', content: JSON.stringify(data, null, 2) };
      },
      llmTool: true,
    },
    {
      id: 'roblox:deploy',
      name: 'Deploy bonding tetrahedron to Roblox',
      description: 'Deploy a minimal P31 test structure to Roblox via the bridge',
      category: 'tool',
      icon: '🚀',
      execute: async () => {
        const res = await fetch('https://roblox-bridge.trimtab-signal.workers.dev/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ worldName: 'P31 Bonding Tetra' }),
        });
        const data = await res.json();
        return { type: 'text', content: JSON.stringify(data, null, 2) };
      },
      llmTool: true,
    },
    {
      id: 'roblox:sync',
      name: 'Sync LOVE from Roblox',
      description: 'Pull pending LOVE events from shadow-bridge and credit them in the local ledger',
      category: 'tool',
      icon: '🔄',
      execute: async () => {
        const { syncRobloxLove } = await import('../lib/robloxBridge');
        const result = await syncRobloxLove();
        return { type: 'text', content: JSON.stringify(result, null, 2) };
      },
      llmTool: true,
    },

    // ───── Sandbox ─────
    {
      id: 'sandbox:open',
      name: 'Open sandbox viewport',
      description: 'Open the floating build/monitor viewport (Gemini/Claude-style pop-up window)',
      category: 'tool',
      icon: '🖥️',
      execute: async () => {
        useShellStore.getState().setSandboxOpen(true);
        return { ok: true };
      },
      llmTool: true,
    },
    {
      id: 'sandbox:generate',
      name: 'Retry last sandbox generation',
      description: 'Re-run the last sandbox build prompt through the generation pipeline (remote worker with local fallback)',
      category: 'tool',
      icon: '⚡',
      execute: async () => {
        const last = useSandboxStore.getState().lastPrompt;
        useAppStore.getState().setTab('sandbox');
        useShellStore.getState().setSandboxOpen(false);
        if (!last) {
          useAppStore.getState().showToast('No previous sandbox prompt to retry', 'error');
          return { ok: false, error: 'No previous sandbox prompt to retry' };
        }
        window.dispatchEvent(new CustomEvent('p31:sandbox-retry'));
        return { ok: true, prompt: last };
      },
      llmTool: true,
    },

    // ───── LOVE registry ─────
    {
      id: 'love:status',
      name: 'LOVE status',
      description: 'Get the full LOVE ledger status: total LOVE minted, care score, pools, and vesting',
      category: 'tool',
      icon: '💎',
      execute: async () => {
        const did = await useAppStore.getState().did || (await (await import('./memory')).ensureDid());
        const res = await fetch(`https://love-ledger.p31ca.org/api/love/balance/${did}`);
        return res.json();
      },
      llmTool: true,
    },
    {
      id: 'love:balance',
      name: 'LOVE balance',
      description: 'Get your current LOVE balance from the ledger',
      category: 'tool',
      icon: '💎',
      execute: async () => {
        const did = await useAppStore.getState().did || (await (await import('./memory')).ensureDid());
        const res = await fetch(`https://love-ledger.p31ca.org/api/love/balance/${did}`);
        return res.json();
      },
      llmTool: true,
    },

    // ───── Cognitive prosthetic ─────
    { id: 'time:estimate', name: 'Time estimate', icon: '⏱', category: 'tool', args: [{ name: 'complexity', type: 'number', placeholder: '1–5' }, { name: 'spoons', type: 'number', placeholder: '0–5' }, { name: 'minutes', type: 'number', placeholder: 'estimated minutes' }], execute: (a) => cognitive.timeEstimate({ complexity: Number(a?.complexity), spoons: Number(a?.spoons) }), llmTool: true, description: 'Estimate how long a task will take given complexity and your current spoon level' },
    { id: 'task:breakdown', name: 'Break down task', icon: '📋', category: 'tool', args: [{ name: 'goal', type: 'string', placeholder: 'your goal', required: true }, { name: 'steps', type: 'number', placeholder: 'number of steps' }], execute: async (a) => await cognitive.taskBreakdown({ goal: a?.goal as string, steps: Number(a?.steps) }), llmTool: true, description: 'Decompose a goal into actionable, spoon-friendly steps' },
    { id: 'task:complete', name: 'Complete task step', icon: '✅', category: 'tool', args: [{ name: 'goalId', type: 'string', placeholder: 'goal id', required: true }, { name: 'stepIndex', type: 'number', placeholder: '0-based step index', required: true }], execute: async (a) => { await cognitive.completeStep(a?.goalId as string, Number(a?.stepIndex)); return { ok: true }; }, llmTool: true, description: 'Mark a step as done in a broken-down task' },
    { id: 'task:rebreakdown', name: 'Re-break down task', icon: '🔄', category: 'tool', args: [{ name: 'goalId', type: 'string', placeholder: 'goal id', required: true }], execute: async (a) => { const steps = await cognitive.rebreakdownGoal(a?.goalId as string); return { steps, ok: !!steps }; }, llmTool: true, description: 'Re-run the LLM breakdown on a saved task to get fresh steps' },
    { id: 'crisis:check', name: 'Crisis check', icon: '🆘', category: 'tool', args: [{ name: 'message', type: 'string', placeholder: 'message to scan', required: true }], execute: (a) => cognitive.crisisCheck({ message: a?.message as string }), llmTool: true, description: 'Scan a message for crisis keywords (hurt, harm, unsafe, emergency)' },
    { id: 'grounding:54321', name: 'Grounding 5-4-3-2-1', icon: '🧘', category: 'tool', args: [], execute: () => cognitive.grounding54321(), llmTool: true, description: 'Guided sensory grounding exercise — reduce anxiety and reconnect to the present' },
    { id: 'stall:diagnose', name: 'Unstick yourself', icon: '🔍', category: 'tool', args: [{ name: 'stuckOn', type: 'string', placeholder: 'what are you stuck on?', required: true }], execute: (a) => cognitive.stallDiagnose({ stuckOn: a?.stuckOn as string }), llmTool: true, description: 'Diagnose why you feel stuck and get a tailored nudge' },
    { id: 'meltdown:plan', name: 'Meltdown plan', icon: '🛟', category: 'tool', args: [{ name: 'spoons', type: 'number', placeholder: '0–5' }], execute: (a) => cognitive.meltdownPlan({ spoons: Number(a?.spoons) }), llmTool: true, description: 'De-escalation plan scaled to your current spoon level' },
    { id: 'next:action', name: 'Next action', icon: '➡', category: 'tool', args: [{ name: 'tasks', type: 'string', placeholder: 'comma-separated tasks' }], execute: (a) => cognitive.nextAction({ tasks: (a?.tasks as string)?.split(',') ?? [], spoons: useAppStore.getState().spoons }), llmTool: true, description: 'Pick the single best next action given your energy' },
    { id: 'habit:stack', name: 'Habit stack', icon: '🔗', category: 'tool', args: [{ name: 'habit', type: 'string', placeholder: 'new habit', required: true }, { name: 'anchor', type: 'string', placeholder: 'existing routine', required: true }], execute: (a) => cognitive.habitStack({ habit: a?.habit as string, anchor: a?.anchor as string }), llmTool: true, description: 'Attach a new habit to an existing routine' },

    // ───── Comms ─────
    { id: 'comms:say-no', name: 'Say no', icon: '\uD83D\uDEAB', category: 'tool', args: [{ name: 'request', type: 'string', placeholder: 'what to decline', required: true }], execute: (a) => comms.sayNo({ request: a?.request as string }), llmTool: true, description: 'Decline a request gracefully and clearly' },
    { id: 'comms:boundary', name: 'Set boundary', icon: '🛡', category: 'tool', args: [{ name: 'topic', type: 'string', placeholder: 'boundary topic', required: true }], execute: (a) => comms.setBoundary({ topic: a?.topic as string }), llmTool: true, description: 'Set a clear boundary around a topic' },
    { id: 'comms:capacity', name: 'Express capacity', icon: '🔋', category: 'tool', args: [{ name: 'spoons', type: 'number', placeholder: '0–5' }], execute: (a) => comms.expressCapacity({ spoons: Number(a?.spoons) }), llmTool: true, description: 'Express your current capacity clearly to others' },
    { id: 'comms:clarify', name: 'Ask to clarify', icon: '❓', category: 'tool', args: [{ name: 'unclear', type: 'string', placeholder: 'what was unclear', required: true }], execute: (a) => comms.askClarify({ unclear: a?.unclear as string }), llmTool: true, description: 'Ask for clarification without sounding confrontational' },
    { id: 'comms:followup', name: 'Follow up', icon: '📨', category: 'tool', args: [{ name: 'topic', type: 'string', placeholder: 'topic to follow up on', required: true }], execute: (a) => comms.followUp({ topic: a?.topic as string }), llmTool: true, description: 'Gentle follow-up message that respects the other person\'s time' },

    // ───── DUNA ─────
    {
      id: 'duna:status',
      name: 'DUNA status',
      description: 'Wyoming DUNA membership countdown — 18/100 members, track progress toward the 100-member threshold',
      category: 'tool',
      icon: '🚀',
      execute: () => setDunaOpen(true),
    },

    // ───── MCP Ecosystem ─────
    {
      id: 'mcp:explorer',
      name: 'MCP Explorer',
      description: 'Browse, list, and call tools from all connected MCP servers (200+ tools across 7 servers)',
      category: 'tool',
      icon: '🔌',
      execute: () => { preloadAllToolLists(); setMcpOpen(true); },
    },
    {
      id: 'mcp:list',
      name: 'List MCP servers',
      description: 'List all 7 connected MCP servers and their tool counts',
      category: 'tool',
      icon: '📋',
      execute: async () => {
        const r = await import('./mcpRegistry');
        await r.preloadAllToolLists();
        const tools = r.getCachedTools();
        return r.MCP_ENDPOINTS.map((e) => {
          const count = tools?.get(e.id);
          const countStr = count ? ` (${count.length} tools)` : '';
          return `${e.id}: ${e.description}${countStr}`;
        });
      },
      llmTool: true,
    },
    {
      id: 'mcp:call',
      name: 'Call MCP tool',
      description: 'Call a tool on a P31 MCP server (mcp:list shows servers and tools)',
      category: 'tool',
      icon: '🔧',
      args: [
        { name: 'server', type: 'select', options: ['sandbox','justice','marketplace','wallet','crypto','bros','dads'], placeholder: 'server ID', required: true },
        { name: 'tool', type: 'string', placeholder: 'tool name', required: true },
        { name: 'args', type: 'string', placeholder: '{"key":"value"} (JSON args, optional)', required: false },
      ],
      execute: async (args) => {
        if (!args) throw new Error('mcp:call requires args');
        const ct = await import('./mcpRegistry');
        const parsedArgs = args.args ? JSON.parse(args.args) : {};
        const result = await ct.callMCPTool(args.server, args.tool, parsedArgs);
        return { ok: true, result };
      },
      llmTool: true,
    },

    // ───── MCP Design (Sandbox tools) ─────
    {
      id: 'mcp:design',
      name: 'Design MCP — Open Sandbox',
      description: 'Open the Sandbox vibe-coding surface with the 23‑tool Design MCP server preloaded',
      category: 'tool',
      icon: '🎨',
      execute: async () => {
        const { preloadAllToolLists } = await import('../lib/mcpRegistry');
        await preloadAllToolLists();
        const store = (window as any).__p31_shellStore;
        if (store?.getState) store.getState().setTab('sandbox');
        return { ok: true, message: 'Sandbox opened with Design MCP ready' };
      },
      llmTool: true,
    },

    // ───── Ollama ─────
    {
      id: 'ollama:status',
      name: 'Ollama status',
      description: 'Check if Ollama is running locally and list installed models',
      category: 'tool',
      icon: '🦙',
      execute: async () => {
        const running = await isOllamaRunning();
        if (!running) return { ok: false, error: 'Ollama not running on localhost:11434' };
        const models = await listOllamaModels();
        return { ok: true, models };
      },
      llmTool: true,
    },
    {
      id: 'ollama:chat',
      name: 'Chat via Ollama',
      description: 'Send a chat message to a local Ollama model (requires Ollama running on localhost:11434)',
      category: 'tool',
      icon: '🦙',
      args: [
        { name: 'model', type: 'select', options: ['llama3.2', 'llama3.1', 'mistral', 'gemma2'], placeholder: 'model name' },
        { name: 'message', type: 'string', placeholder: 'message to send', required: true },
      ],
      execute: async (args) => {
        const reply = await ollamaChat((args?.model as string) || 'llama3.2', [{ role: 'user', content: args?.message as string }]);
        return { ok: true, reply };
      },
      llmTool: true,
    },

    // ───── Mesh transport ─────
    {
      id: 'mesh:transport',
      name: 'Switch mesh transport',
      description: 'Switch between mesh transports: peerjs (cloud), tailscale (VPN), libp2p (browser WebRTC-Direct)',
      category: 'tool',
      icon: '🔄',
      args: [{ name: 'transport', type: 'select', options: ['peerjs', 'tailscale', 'libp2p'], placeholder: 'peerjs | tailscale | libp2p', required: true }],
      execute: async (args) => {
        if (!args) throw new Error('mesh:transport requires args');
        const t = args.transport as string;
        if (t === 'tailscale') {
          const { connectMesh } = await import('./mesh');
          await connectMesh();
        } else if (t === 'libp2p') {
          const { disconnectMesh } = await import('./mesh');
          disconnectMesh();
          const { connectLibp2p } = await import('./mesh/libp2pMesh');
          const ok = await connectLibp2p();
          if (!ok) return { ok: false, transport: t, error: 'libp2p connection failed' };
        }
        return { ok: true, transport: t };
      },
    },

    // ───── Sensory passport ─────
    {
      id: 'passport:open',
      name: 'Open sensory passport',
      description: 'Open the sensory passport — color comfort, typography, calm/focus, simplification, and task mode',
      category: 'action',
      icon: '🪪',
      execute: () => openWalletTab('passport'),
    },
    {
      id: 'passport:read',
      name: 'Read cognitive passport',
      description: 'Return the current Cognitive Passport JSON (DID, keys, SBTs, cognitive state, LOVE balances, KEL)',
      category: 'tool',
      icon: '📄',
      execute: async () => {
        const { buildPassport } = await import('../lib/cognitivePassport');
        const passport = await buildPassport();
        return { type: 'text', content: JSON.stringify(passport, null, 2) };
      },
      llmTool: true,
    },
    {
      id: 'passport:write',
      name: 'Update cognitive passport',
      description: 'Update cognitive fields (spoons, r) and return the updated passport JSON',
      category: 'tool',
      icon: '✍️',
      args: [
        { name: 'spoons', type: 'number', placeholder: '0–5', required: false },
        { name: 'r', type: 'number', placeholder: '0.0–1.0', required: false },
      ],
      execute: async (args) => {
        const { buildPassport } = await import('../lib/cognitivePassport');
        if (args?.spoons !== undefined) {
          const n = Number(args.spoons);
          if (Number.isInteger(n) && n >= 0 && n <= 5) {
            useAppStore.getState().setSpoons(n);
          }
        }
        if (args?.r !== undefined) {
          const rVal = Number(args.r);
          if (typeof window !== 'undefined') {
            (window as any).__p31_kura = { ...(window as any).__p31_kura, r: Math.max(0, Math.min(1, rVal)) };
          }
        }
        const passport = await buildPassport(true);
        return { type: 'text', content: JSON.stringify(passport, null, 2) };
      },
      llmTool: true,
    },
    {
      id: 'insights:open',
      name: 'Open insights panel',
      description: 'View spoon trends, forecast accuracy, and LOVE analytics',
      category: 'tool',
      icon: '📊',
      execute: () => { setInsightsOpen(true); },
      llmTool: true,
    },
    {
      id: 'analytics:export',
      name: 'Export analytics',
      description: 'Download spoon history and LOVE data as CSV or JSON',
      category: 'tool',
      icon: '📥',
      args: [
        { name: 'format', type: 'select', options: ['csv', 'json'], placeholder: 'csv | json', required: false },
        { name: 'type', type: 'select', options: ['spoons', 'love', 'all'], placeholder: 'spoons | love | all', required: false },
      ],
      execute: async (args) => {
        const format = (args?.format as string) || 'csv';
        const exportType = (args?.type as string) || 'all';
        const dateStr = new Date().toISOString().slice(0, 10);

        const wrapSpoons = exportType === 'spoons' || exportType === 'all';
        const wrapLove = exportType === 'love' || exportType === 'all';

        let spoonEntries: Awaited<ReturnType<typeof getSpoonHistory>> = [];
        let loveChain: unknown = null;
        let loveBalance: unknown = null;

        if (wrapSpoons) {
          spoonEntries = await getSpoonHistory(365);
        }

        if (wrapLove) {
          const did = await useAppStore.getState().did || (await (await import('./memory')).ensureDid());
          const [chainRes, balanceRes] = await Promise.all([
            fetch('https://love-ledger.p31ca.org/api/love/chain').then((r) => r.json()),
            fetch(`https://love-ledger.p31ca.org/api/love/balance/${did}`).then((r) => r.json()),
          ]);
          loveChain = chainRes;
          loveBalance = balanceRes;
        }

        let content = '';
        let mimeType = '';
        let filename = '';

        if (format === 'json') {
          const payload: Record<string, unknown> = {};
          if (wrapSpoons) payload.spoons = spoonEntries;
          if (wrapLove) payload.love = { chain: loveChain, balance: loveBalance };
          content = JSON.stringify(exportType === 'all' ? payload : exportType === 'spoons' ? spoonEntries : payload.love, null, 2);
          mimeType = 'application/json';
          filename = `p31-${exportType}-${dateStr}.json`;
        } else {
          if (exportType === 'spoons') {
            const rows = ['timestamp,spoons,source'];
            for (const e of spoonEntries) {
              rows.push(`${new Date(e.ts).toISOString()},${e.level},"${e.source}"`);
            }
            content = rows.join('\n');
            mimeType = 'text/csv';
            filename = `p31-spoons-${dateStr}.csv`;
          } else if (exportType === 'love') {
            content = JSON.stringify({ chain: loveChain, balance: loveBalance }, null, 2);
            mimeType = 'application/json';
            filename = `p31-love-${dateStr}.json`;
          } else {
            const spoonRows = ['timestamp,spoons,source'];
            for (const e of spoonEntries) {
              spoonRows.push(`${new Date(e.ts).toISOString()},${e.level},"${e.source}"`);
            }
            content = spoonRows.join('\n');
            content += `\n\n# LOVE data\n${JSON.stringify({ chain: loveChain, balance: loveBalance }, null, 2)}`;
            mimeType = 'text/csv';
            filename = `p31-all-${dateStr}.csv`;
          }
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        return { ok: true, filename, rows: spoonEntries.length };
      },
      llmTool: true,
    },
    { id: 'sensory:muted', name: 'Toggle muted colors', description: 'Reduce color chroma by 45% while preserving contrast', category: 'action', icon: '🎨', execute: () => { const s = useSensoryStore.getState(); s.setMuted(!s.muted); showToast(`🎨 Muted colors ${!s.muted ? 'on' : 'off'}`, 'success'); } },
    { id: 'sensory:warm', name: 'Toggle warm light', description: 'Blend all hues toward amber for dusk-friendly viewing', category: 'action', icon: '🌇', execute: () => { const s = useSensoryStore.getState(); s.setWarmLight(!s.warmLight); showToast(`🌇 Warm light ${!s.warmLight ? 'on' : 'off'}`, 'success'); } },
    { id: 'sensory:calm', name: 'Toggle calm mode', description: 'Zero motion — starfield and dome go static', category: 'action', icon: '🧘', execute: () => { const s = useSensoryStore.getState(); s.setCalm(!s.calm); showToast(`🧘 Calm mode ${!s.calm ? 'on' : 'off'}`, 'success'); } },
    { id: 'sensory:focus', name: 'Toggle focus mode', description: 'High-priority notifications only; quiet toasts', category: 'action', icon: '🎯', execute: () => { const s = useSensoryStore.getState(); s.setFocus(!s.focus); showToast(`🎯 Focus mode ${!s.focus ? 'on' : 'off'}`, 'success'); } },
    { id: 'sensory:simple', name: 'Toggle simplify cockpit', description: 'Show only the two essential panels per rail', category: 'action', icon: '🌱', execute: () => { const s = useSensoryStore.getState(); s.setSimple(!s.simple); showToast(`🌱 Simplification ${!s.simple ? 'on' : 'off'}`, 'success'); } },
    { id: 'sensory:task', name: 'Toggle task hub', description: 'Add spoon forecast and step breakdown to the cockpit right rail', category: 'action', icon: '📋', execute: () => { const s = useSensoryStore.getState(); s.setTask(!s.task); showToast(`📋 Task hub ${!s.task ? 'on' : 'off'}`, 'success'); } },
    { id: 'effects:reset', name: 'Reset effects & cosmos', description: 'Restore default starfield density, motion, and cosmos effects', category: 'action', icon: '↺', execute: () => { useEffectsStore.getState().resetEffects(); showToast('↺ Effects reset to defaults', 'success'); } },
    { id: 'effects:quantum', name: 'Toggle quantum constellation', description: 'Show the K₄ / SIC-POVM constellation and 12-house ring over the dome', category: 'action', icon: '🔮', execute: () => { const s = useEffectsStore.getState(); s.setQuantum(!s.quantum); showToast(`🔮 Quantum constellation ${!s.quantum ? 'on' : 'off'}`, 'success'); } },
    { id: 'undo', name: 'Undo last change', description: 'Revert the most recent spoon, theme, or layout change (⌘Z)', category: 'action', icon: '↩', execute: () => { useHistoryStore.getState().undo(); }, when: () => useHistoryStore.getState().entries.length > 0 },
    { id: 'cross-app:spaceship-state', name: 'Show spaceship state', description: 'Fetch current spoon level and dataset from spaceship-earth', category: 'tool', icon: '🛸', execute: async () => { const res = await fetch('https://spaceship-relay.trimtab-signal.workers.dev/api/spaceship-state'); const json = await res.json(); return json; }, llmTool: true },
    { id: 'cross-app:load-personal', name: 'Load personal constellation on spaceship', description: 'Send personal-constellation dataset to spaceship-earth', category: 'tool', icon: '🌍', execute: async () => { const res = await fetch('https://spaceship-relay.trimtab-signal.workers.dev/api/spaceship-state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'personal-constellation' }) }); const json = await res.json(); return json; }, llmTool: true },
    { id: 'cross-app:status', name: 'Unified app status', description: 'Show health status for shell + spaceship-earth', category: 'tool', icon: '💚', execute: async () => { const res = await fetch('/api/status'); const json = await res.json(); return json; }, llmTool: true },

  ];

  for (const cmd of commands) registerCommand(cmd);

  // Auto-register all services from the ServiceRegistry
  for (const svc of SERVICES) {
    registerCommand({
      id: `service:${svc.id}`,
      name: svc.name,
      description: svc.description,
      category: 'navigation',
      icon: svc.icon,
      execute: svc.action.onClick,
    });
  }
  navArgs;
}

export interface OpenAIFunctionDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export function getOpenAIFunctionDefinitions(): OpenAIFunctionDefinition[] {
  const ctx = tabContext(useAppStore.getState().tab);
  return getCommands(ctx)
    .filter((c) => c.llmTool)
    .map((c) => {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const a of c.args ?? []) {
        properties[a.name] =
          a.type === 'select'
            ? { type: 'string', description: a.placeholder, enum: a.options }
            : a.type === 'number'
              ? { type: 'number', description: a.placeholder, minimum: a.min, maximum: a.max }
              : { type: a.type, description: a.placeholder };
        if (a.required) required.push(a.name);
      }
      return {
        type: 'function',
        function: {
          name: c.id,
          description: c.description,
          parameters: {
            type: 'object',
            properties,
            ...(required.length ? { required } : {}),
          },
        },
      };
    });
}

export async function executeCommand(id: string, args?: Record<string, any>): Promise<unknown> {
  const ctx = tabContext(useAppStore.getState().tab);
  const cmd = getCommands(ctx).find((c) => c.id === id);
  if (!cmd) throw new Error(`Unknown command: ${id}`);
  const result = await cmd.execute(args);
  try { bumpFrecency(id); } catch { /* frecency is best-effort */ }
  return result;
}

if (import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
  (window as any).__p31_analytics = { exportReady: true };
}
