import { useAppStore } from '../store/useAppStore';

export type ServiceCategory = 'mcp' | 'worker' | 'identity' | 'finance' | 'social' | 'hardware' | 'game' | 'ai' | 'research';

export type ServiceStatus = 'online' | 'degraded' | 'offline' | 'unknown';

export interface Service {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  icon: string;
  action: { label: string; onClick: () => void };
  toolCount?: number;
  url?: string;
  healthUrl?: string;
}

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  mcp: 'MCP Servers',
  worker: 'Workers',
  identity: 'Identity',
  finance: 'Finance',
  social: 'Social',
  hardware: 'Hardware',
  game: 'Game',
  ai: 'AI',
  research: 'Research',
};

export const CATEGORIES: ServiceCategory[] = Object.keys(CATEGORY_LABELS) as ServiceCategory[];

const setTab = (tab: string) => useAppStore.getState().setTab(tab as any);
const openUrl = (url?: string) => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); };

export const SERVICES: Service[] = [
  // ─── MCP Servers ───
  {
    id: 'mcp-shell',
    name: 'Shell MCP',
    description: '90+ shell commands, Ed25519 + ML-DSA-65 verified',
    category: 'mcp',
    icon: '🔌',
    action: { label: 'Explore', onClick: () => setTab('sandbox') },
    toolCount: 90,
    healthUrl: 'https://p31-shell.trimtab-signal.workers.dev/mcp',
  },
  {
    id: 'mcp-design',
    name: 'Design MCP',
    description: '23 design tools: tokens, components, layouts, icons',
    category: 'mcp',
    icon: '🎨',
    action: { label: 'Explore', onClick: () => setTab('sandbox') },
    toolCount: 23,
    healthUrl: 'https://design-mcp.trimtab-signal.workers.dev',
  },
  {
    id: 'mcp-justice',
    name: 'Justice Hub',
    description: 'Sovereign justice, ODR, evidence deposition, escrow',
    category: 'mcp',
    icon: '⚖️',
    action: { label: 'Open', onClick: () => setTab('dashboard') },
    toolCount: 8,
    healthUrl: 'https://p31-justice-hub.trimtab-signal.workers.dev/mcp',
  },
  {
    id: 'mcp-marketplace',
    name: 'Marketplace',
    description: 'List, offer, escrow, dispute — trustless commerce',
    category: 'mcp',
    icon: '🛍️',
    action: { label: 'Browse', onClick: () => setTab('monetization') },
    toolCount: 10,
    healthUrl: 'https://marketplace-mcp.trimtab-signal.workers.dev/mcp',
  },
  {
    id: 'mcp-wallet',
    name: 'Phenix Vault',
    description: 'Hardware-backed credential vault, multi-sig recovery',
    category: 'mcp',
    icon: '🏛️',
    action: { label: 'Open', onClick: () => setTab('profile') },
    toolCount: 5,
    healthUrl: 'https://phenix-wallet-mcp.trimtab-signal.workers.dev/mcp',
  },
  {
    id: 'mcp-crypto',
    name: 'PQC Crypto',
    description: 'ML-DSA-65, X-Wing KEM, SD-JWT, Taler, x402',
    category: 'mcp',
    icon: '🔐',
    action: { label: 'Explore', onClick: () => setTab('dashboard') },
    toolCount: 12,
    healthUrl: 'https://p31-crypto-mcp.trimtab-signal.workers.dev/mcp',
  },
  {
    id: 'mcp-bros',
    name: 'BROS Care',
    description: 'Persona switching, signaling rooms, care issuance',
    category: 'mcp',
    icon: '❤️',
    action: { label: 'Open', onClick: () => setTab('dashboard') },
    toolCount: 8,
    healthUrl: 'https://bros.trimtab-signal.workers.dev/mcp',
  },
  {
    id: 'mcp-dads',
    name: 'DADS Trust',
    description: 'EigenTrust, task dispatch, LOVE minting',
    category: 'mcp',
    icon: '🧠',
    action: { label: 'Open', onClick: () => setTab('dashboard') },
    toolCount: 7,
    healthUrl: 'https://dads.trimtab-signal.workers.dev/mcp',
  },
  {
    id: 'mcp-roblox',
    name: 'Roblox Bridge',
    description: 'Deploy worlds, manage terrain, sync skins',
    category: 'mcp',
    icon: '🎮',
    action: { label: 'Open', onClick: () => setTab('game') },
    toolCount: 14,
    healthUrl: 'https://roblox-bridge.trimtab-signal.workers.dev/mcp',
  },

  // ─── Workers ───
  {
    id: 'worker-game-builder',
    name: 'Game Builder',
    description: 'Create and deploy Roblox worlds, mint LOVE credits',
    category: 'game',
    icon: '🎯',
    action: { label: 'Launch', onClick: () => setTab('game') },
    healthUrl: 'https://game-builder.trimtab-signal.workers.dev/health',
  },
  {
    id: 'worker-sandbox',
    name: 'Sandbox',
    description: 'Vibe-code with live generation and design system',
    category: 'worker',
    icon: '⚗️',
    action: { label: 'Open', onClick: () => setTab('sandbox') },
    healthUrl: 'https://vibe-generate.trimtab-signal.workers.dev/health',
  },
  {
    id: 'worker-vibe-sandbox',
    name: 'Vibe Sandbox',
    description: 'HTML execution, artifact preview, live reload',
    category: 'worker',
    icon: '🧪',
    action: { label: 'Open', onClick: () => setTab('sandbox') },
    healthUrl: 'https://vibe-sandbox.trimtab-signal.workers.dev/health',
  },
  {
    id: 'worker-shadow-bridge',
    name: 'Shadow Bridge',
    description: 'Roblox LOVE event sync, pending-love queue',
    category: 'worker',
    icon: '🌑',
    action: { label: 'View', onClick: () => setTab('dashboard') },
  },
  {
    id: 'worker-ledger-bridge',
    name: 'Ledger Bridge',
    description: 'SBT minting, SD-JWT, X-Wing KEM, care proofs',
    category: 'finance',
    icon: '📒',
    action: { label: 'Open', onClick: () => setTab('dashboard') },
  },
  {
    id: 'worker-spaceship-relay',
    name: 'Spaceship Relay',
    description: 'Cross-app state relay to spaceship-earth',
    category: 'worker',
    icon: '🛰️',
    action: { label: 'View', onClick: () => setTab('cockpit') },
  },
  {
    id: 'worker-intent-resolver',
    name: 'Intent Resolver',
    description: 'Creation intent quoting, LOVE/USDC valuation',
    category: 'ai',
    icon: '💡',
    action: { label: 'Open', onClick: () => setTab('sandbox') },
  },
  {
    id: 'worker-creation-accountant',
    name: 'Creation Accountant',
    description: 'Receipt submission for completed tasks',
    category: 'finance',
    icon: '🧮',
    action: { label: 'Open', onClick: () => setTab('dashboard') },
  },

  // ─── Identity ───
  {
    id: 'service-did',
    name: 'DID Identity',
    description: 'Ed25519 + ML-DSA-65, did:key, no central authority',
    category: 'identity',
    icon: '🔑',
    action: { label: 'Manage', onClick: () => setTab('profile') },
  },
  {
    id: 'service-federation',
    name: 'Federation',
    description: 'DID registration, key verification, cross-app identity',
    category: 'identity',
    icon: '🌐',
    action: { label: 'View', onClick: () => openUrl('https://federation.p31ca.org') },
    url: 'https://federation.p31ca.org',
  },
  {
    id: 'service-credentials',
    name: 'Credentials',
    description: 'SD-JWT verifiable credentials, presentation proofs',
    category: 'identity',
    icon: '📜',
    action: { label: 'Manage', onClick: () => setTab('profile') },
  },

  // ─── Finance ───
  {
    id: 'service-love-ledger',
    name: 'LOVE Ledger',
    description: 'Balance, earn, chain, status — emotional economy',
    category: 'finance',
    icon: '💚',
    action: { label: 'Check', onClick: () => setTab('dashboard') },
    url: 'https://love-ledger.p31ca.org',
  },
  {
    id: 'service-sbt',
    name: 'SBT Minting',
    description: 'Soulbound tokens, Base Sepolia, proof-of-care',
    category: 'finance',
    icon: '🏆',
    action: { label: 'Mint', onClick: () => setTab('profile') },
  },

  // ─── Social ───
  {
    id: 'social-mesh',
    name: 'Mesh Network',
    description: 'libp2p, Tailscale, peer discovery, LoRa relay',
    category: 'social',
    icon: '🕸️',
    action: { label: 'View', onClick: () => setTab('dashboard') },
  },
  {
    id: 'social-bonding',
    name: 'Bonding Rituals',
    description: 'Meatspace tetra, K₄ graphs, family mesh',
    category: 'social',
    icon: '💜',
    action: { label: 'Open', onClick: () => setTab('bonding') },
  },

  // ─── Hardware ───
  {
    id: 'hardware-node-zero',
    name: 'Node Zero',
    description: 'ESP32-S3 pairing, haptics, LoRa mesh, hardware security',
    category: 'hardware',
    icon: '🔌',
    action: { label: 'Pair', onClick: () => setTab('dashboard') },
  },
  {
    id: 'hardware-ble',
    name: 'BLE Zone Scanner',
    description: 'Bluetooth beacons, zone presence, spoon-aware proximity',
    category: 'hardware',
    icon: '📡',
    action: { label: 'Scan', onClick: () => setTab('dashboard') },
  },

  // ─── AI ───
  {
    id: 'ai-assistant',
    name: 'Assistant',
    description: 'Local LLM (Ollama) or cloud, conversational interface',
    category: 'ai',
    icon: '🤖',
    action: { label: 'Chat', onClick: () => setTab('sandbox') },
  },
  {
    id: 'ai-phos',
    name: 'PHOS Oracle',
    description: 'Akinator-style intent resolver, 20 questions',
    category: 'ai',
    icon: '🔮',
    action: { label: 'Ask', onClick: () => setTab('sandbox') },
  },
  {
    id: 'ai-portal-chat',
    name: 'Portal Chat',
    description: 'AI chat backend, cloud assistant relay',
    category: 'ai',
    icon: '💬',
    action: { label: 'Open', onClick: () => setTab('sandbox') },
    healthUrl: 'https://portal-chat.trimtab-signal.workers.dev/health',
  },

  // ─── Research ───
  {
    id: 'research-zenodo',
    name: 'Zenodo Library',
    description: 'William R. Johnson papers, P31 research series',
    category: 'research',
    icon: '📚',
    action: { label: 'Browse', onClick: () => openUrl('https://zenodo.org') },
    url: 'https://zenodo.org',
  },
];

export function getServicesByCategory(category: ServiceCategory): Service[] {
  return SERVICES.filter((s) => s.category === category);
}

export function getServiceById(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}
