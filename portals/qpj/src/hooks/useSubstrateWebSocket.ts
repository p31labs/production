import { useEffect, useRef } from 'react';
import { createSubstrateSocket, type BuildUpdate } from '../lib/substrate-ws';
import { getSubstrateWsBaseUrl } from '../lib/substrate';
import { useAppStore } from '../store/useAppStore';
import type { PassportId } from '../lib/passports';

export function useSubstrateWebSocket(
  passportId: PassportId,
  onBuildUpdate?: (update: BuildUpdate) => void,
): void {
  const handlerRef = useRef(onBuildUpdate);
  handlerRef.current = onBuildUpdate;

  useEffect(() => {
    const base = getSubstrateWsBaseUrl();
    if (!base) return;
    const wsUrl = `${base.replace(/^http/, 'ws')}/ws?passportId=${encodeURIComponent(passportId)}`;
    const showToast = useAppStore.getState().showToast;
    const handle = createSubstrateSocket({
      wsUrl,
      onBuildUpdate: (update) => {
        handlerRef.current?.(update);
        showToast(
          update.status === 'complete'
            ? `Build ${update.buildId} complete`
            : `Build ${update.buildId}: ${update.status}`,
          update.status === 'complete' ? 'success' : 'error',
        );
      },
    });
    return () => handle.close();
  }, [passportId]);
}