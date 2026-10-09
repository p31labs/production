import type { Tab } from '../store/useAppStore';

export interface NavItem {
  key: Tab;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'bonding', label: 'Bonding', icon: '🧬' },
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'sandbox', label: 'Sandbox', icon: '🧪' },
  { key: 'cockpit', label: 'Cockpit', icon: '🚀' },
  { key: 'monetization', label: 'Monetization', icon: '💎' },
  { key: 'profile', label: 'Profile', icon: '👤' },
  { key: 'research', label: 'Research', icon: '📚' },
  { key: 'game', label: 'Game', icon: '🎮' },
  { key: 'commandHub', label: 'Command Hub', icon: '🧭' },
];
