export type SectionId =
  | 'home'
  | 'revenue'
  | 'positions'
  | 'opportunities'
  | 'invoices'
  | 'donations'
  | 'billing'
  | 'usage'
  | 'ops'
  | 'settings'
  | 'profile'
  | 'trust'
  | 'community';

export interface Section {
  id: SectionId;
  label: string;
  emoji: string;
  blurb: string;
  tier: 'spark' | 'maker';
  flagship?: boolean;
}

/** Quantum Material IA — home launcher + 8 task surfaces. */
export const SECTIONS: Section[] = [
  { id: 'home',          label: 'Home / Launcher', emoji: '🏠', blurb: 'Your Capital Machine at a glance.', tier: 'spark', flagship: true },
  { id: 'revenue',       label: 'Revenue',         emoji: '💰', blurb: 'USDC / EUR / LOVE revenue ledger with per-source rollups.', tier: 'spark', flagship: true },
  { id: 'positions',     label: 'Positions',       emoji: '📈', blurb: 'Yield vault positions, APY, and auto-compounder status.', tier: 'spark', flagship: true },
  { id: 'opportunities', label: 'Opportunities',   emoji: '⚡', blurb: 'MEV arbitrage and allocator signals.', tier: 'maker', flagship: true },
  { id: 'invoices',      label: 'Invoices',        emoji: '📄', blurb: 'BTCPay invoices — paid / pending / expired.', tier: 'maker' },
  { id: 'donations',     label: 'Donations',       emoji: '🎁', blurb: 'Community LOVE inflows and BTCPay donations.', tier: 'spark' },
  { id: 'billing',       label: 'Billing',         emoji: '💳', blurb: 'Tier plans, entitlements, and call allowances.', tier: 'maker' },
  { id: 'usage',         label: 'Usage',           emoji: '📶', blurb: 'API usage, rate limits, and quota burn-down.', tier: 'spark' },
  { id: 'ops',           label: 'x402 Ops',        emoji: '🛰️', blurb: 'x402 settlement observability and invariants.', tier: 'maker' },
  { id: 'settings',      label: 'Settings',        emoji: '⚙️', blurb: 'RPC, vaults, strategies, features, secrets, workers.', tier: 'maker' },
  { id: 'profile',       label: 'Profile',         emoji: '🪪', blurb: 'Sovereign identity, contributions, and soulbound tokens.', tier: 'spark' },
  { id: 'trust',         label: 'Trust Center',    emoji: '🛡️', blurb: 'Security posture, evidence, and pre-answered questionnaire.', tier: 'spark' },
  { id: 'community',     label: 'Community',       emoji: '🌐', blurb: 'Governance, proposals, and contribution recognition.', tier: 'spark' },
];

export const FLAGSHIP_PATHS = SECTIONS.filter((s) => s.flagship).map((s) => s.id);

export function sectionFromHash(hash: string): SectionId {
  const id = hash.replace(/^#\/?/, '').split('/')[0] as SectionId;
  return SECTIONS.some((s) => s.id === id) ? id : 'home';
}

export function sectionById(id: string): Section | undefined {
  return SECTIONS.find((s) => s.id === id);
}