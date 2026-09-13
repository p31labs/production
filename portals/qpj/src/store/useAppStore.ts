import { create } from 'zustand';
import { useQpjStore } from './useQpjStore';

interface AppState {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const useAppStore = create<AppState>(() => ({
  showToast: (message, type = 'info') => useQpjStore.getState().showToast(message, type),
}));