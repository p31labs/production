export type WidgetId =
  | 'revenue'
  | 'positions'
  | 'allocator'
  | 'love'
  | 'opportunities'
  | 'usage'
  | 'donations'
  | 'btcpay';

export type PresetId = 'treasury' | 'trader' | 'agent' | 'family';

export interface WidgetDef {
  id: WidgetId;
  label: string;
  emoji: string;
  tier: 'spark' | 'maker';
}

export interface Preset {
  id: PresetId;
  label: string;
  emoji: string;
  blurb: string;
  widgets: WidgetId[];
}

export const WIDGETS: Record<WidgetId, WidgetDef> = {
  revenue: { id: 'revenue', label: 'Revenue', emoji: '💰', tier: 'spark' },
  positions: { id: 'positions', label: 'Positions', emoji: '📈', tier: 'spark' },
  allocator: { id: 'allocator', label: 'Allocator', emoji: '🧭', tier: 'spark' },
  love: { id: 'love', label: 'LOVE Token', emoji: '💜', tier: 'spark' },
  opportunities: { id: 'opportunities', label: 'Opportunities', emoji: '⚡', tier: 'maker' },
  usage: { id: 'usage', label: 'Usage', emoji: '📶', tier: 'spark' },
  donations: { id: 'donations', label: 'Donations', emoji: '🎁', tier: 'spark' },
  btcpay: { id: 'btcpay', label: 'BTCPay', emoji: '🟠', tier: 'spark' },
};

export const PRESETS: Preset[] = [
  { id: 'treasury', label: 'Treasury', emoji: '🏦', blurb: 'Revenue integrity and allocator health.', widgets: ['revenue', 'allocator', 'love', 'positions'] },
  { id: 'trader', label: 'Trader', emoji: '📊', blurb: 'Positions, revenue, and MEV signals.', widgets: ['positions', 'revenue', 'opportunities', 'allocator'] },
  { id: 'agent', label: 'Agent', emoji: '🤖', blurb: 'Usage, revenue, and opportunity feed.', widgets: ['usage', 'revenue', 'opportunities', 'love'] },
  { id: 'family', label: 'Family', emoji: '🏡', blurb: 'LOVE flows, positions, and donations.', widgets: ['love', 'positions', 'revenue', 'donations'] },
];

export const DEFAULT_PRESET: PresetId = 'treasury';

/** How many widgets to render below the disclosure threshold. */
export const DISCLOSURE_MIN_WIDGETS = 3;