export interface NavAtom {
  id: string;
  label: string;
  href: string;
  act: 'to' | 'in' | 'through';
  index: number;
}

export interface LabItem {
  id: string;
  label: string;
  href: string;
  description: string;
}

export type ActId = 'to' | 'in' | 'through';

export const ACT_NAMES: Record<ActId, { name: string; label: string }> = {
  to: { name: 'Act I', label: 'Invitation' },
  in: { name: 'Act II', label: 'Immersion' },
  through: { name: 'Act III', label: 'Action' },
};

// Every href here resolves to a real route. No phantom paths — the SPA
// catch-all used to serve the landing page for missing routes, so each atom
// now targets a page that exists.
export const NAV_ATOMS: NavAtom[] = [
  { id: 'home', label: 'Home', href: '/', act: 'to', index: 1 },
  { id: 'about', label: 'About', href: '/about', act: 'to', index: 2 },
  { id: 'team', label: 'Team', href: '/team', act: 'to', index: 3 },
  { id: 'stack', label: 'Stack', href: '/enterprise', act: 'to', index: 4 },
  { id: 'faq', label: 'FAQ', href: '/faq', act: 'to', index: 5 },
  { id: 'cli', label: 'CLI', href: '/apps/cli', act: 'to', index: 4 },
  { id: 'love', label: 'LOVE', href: '/journey', act: 'in', index: 1 },
  { id: 'research', label: 'Research', href: '/research', act: 'in', index: 2 },
  { id: 'docs', label: 'Docs', href: '/research', act: 'in', index: 3 },
  { id: 'tools', label: 'Tools', href: '/apps/loom', act: 'through', index: 1 },
  { id: 'ask', label: 'Ask', href: '/apps/lumi', act: 'through', index: 2 },
  { id: 'scene', label: 'Scene', href: '/apps/spaceship-earth', act: 'through', index: 3 },
  { id: 'monetization', label: 'Donate', href: '/donate', act: 'through', index: 4 },
  { id: 'ways-to-give', label: 'Ways to Give', href: '/ways-to-give', act: 'through', index: 5 },
];

export const LAB_ITEMS: LabItem[] = [
  { id: 'system', label: 'System', href: '/apps/governance', description: 'Fleet health dashboard' },
  { id: 'treasury', label: 'Treasury', href: '/treasury', description: 'Public treasury ledger' },
  { id: 'financials', label: 'Financials', href: '/financials', description: 'Registration + fiscal record' },
  { id: 'annual-report', label: 'Annual Report', href: '/annual-report', description: 'Year one in review' },
  { id: 'press', label: 'Press', href: '/press', description: 'Press materials + contact' },
  { id: 'security', label: 'Security', href: '/security', description: 'Security posture + disclosure' },
  { id: 'compliance', label: 'Compliance', href: '/compliance', description: 'Audit logging → requirements' },
  { id: 'arcade', label: 'Arcade', href: '/arcade', description: 'Game hub' },
];