import { createSovereignStore } from '@p31/sovereign-core';
import type { Tab } from '../types';

export const useAppStore = createSovereignStore<Tab>({
  tab: 'home',
  storageKey: 'teen-storage',
});
