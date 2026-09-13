import { useEffect } from 'react';
import { useQpjStore } from '../store/useQpjStore';
import {
  createIdentity,
  loadIdentity,
  setIdentityVerified,
  type IdentityStatus,
} from '../lib/identity';
import type { PassportId } from '../lib/passports';

export function useIdentity(passportId: PassportId) {
  const storeStatus = useQpjStore((s) => s.identity.status);
  const identity = useQpjStore((s) => s.identity.identity);

  useEffect(() => {
    let cancelled = false;
    useQpjStore.getState().setIdentityStatus(passportId, 'loading');
    loadIdentity(passportId).then((id) => {
      if (cancelled) return;
      if (id) useQpjStore.getState().setIdentity(passportId, id);
      else useQpjStore.getState().setIdentityStatus(passportId, 'none');
    });
    return () => { cancelled = true; };
  }, [passportId]);

  return {
    status: storeStatus as IdentityStatus['status'],
    identity,
    create: (opts: Parameters<typeof createIdentity>[1]) => createIdentity(passportId, opts),
    verify: () => setIdentityVerified(passportId),
  };
}
