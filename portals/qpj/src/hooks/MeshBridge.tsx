import { useEffect } from 'react';
import { useQpjStore } from '../store/useQpjStore';

/**
 * MeshBridge — owns the HeartbeatMesh lifecycle for the active passport.
 *
 * On passport change the store tears the old instance down first; this hook
 * then (re)initializes the mesh for the new identity and re-arms the
 * simulated presence as offline fallback.
 */
export function MeshBridge({ passportId }: { passportId: string }): null {
  const initMesh = useQpjStore((s) => s.initMesh);
  const meshStatus = useQpjStore((s) => s.meshStatus);

  useEffect(() => {
    void initMesh(passportId);
  }, [passportId, initMesh]);

  useEffect(() => {
    if (meshStatus === 'error' || meshStatus === 'idle') {
      document.documentElement.dataset.mesh = 'simulated';
    } else {
      document.documentElement.dataset.mesh = meshStatus;
    }
  }, [meshStatus]);

  return null;
}