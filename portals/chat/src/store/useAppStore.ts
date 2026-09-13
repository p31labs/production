import { createSovereignStore } from '@p31/sovereign-core';

export type Tab = 'home' | 'bonding' | 'dashboard' | 'sandbox' | 'cockpit' | 'profile' | 'notifications' | 'research' | 'game' | 'commandHub' | 'monetization';

export const useAppStore = createSovereignStore<Tab>({ tab: 'home', storageKey: 'shell-storage' });
