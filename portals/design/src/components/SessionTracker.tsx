import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSessionStore } from '../lib/useSessionStore';
import { useSpoonsStore } from '../lib/useSpoonsStore';

/**
 * SessionTracker — records real portal events into the session store:
 * unique route visits (via the router) + spoon-level changes (calm presses,
 * peak energy). Token edits and snippet copies are counted at their source
 * (tokenLab.writeToken + the clipboard handlers) so they stay in lock-step
 * with the actual action.
 */
export function SessionTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    useSessionStore.getState().visit(pathname);
  }, [pathname]);

  useEffect(() => {
    return useSpoonsStore.subscribe((s, prev) => {
      if (s.spoons !== prev.spoons) useSessionStore.getState().noteSpoons(s.spoons);
    });
  }, []);

  return null;
}