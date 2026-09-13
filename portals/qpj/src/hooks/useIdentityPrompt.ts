import { useQpjStore } from '../store/useQpjStore';
import { navigateTo } from '../lib/routes';

export function useIdentityPrompt() {
  const status = useQpjStore((s) => s.identity.status);
  const needsIdentity = status === 'none';
  return {
    needsIdentity,
    openEntry: () => navigateTo('entry'),
  };
}