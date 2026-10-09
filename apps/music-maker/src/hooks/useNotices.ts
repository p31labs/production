/**
 * The music maker — useNotices.
 *
 * A tiny local notice queue for the in-instrument pop-ups. Auto-dismisses after
 * ~4s, capped at 3 visible. Not persisted, not part of the log — presence
 * feedback ("Cornichon played the sun"), never authoritative state.
 */
import { useCallback, useRef, useState } from 'react';

export interface Notice {
  id: number;
  text: string;
}

const NOTICE_LIFETIME_MS = 4000;
const MAX_VISIBLE = 3;

export function useNotices(): { notices: Notice[]; add: (text: string) => void } {
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextId = useRef(0);

  const add = useCallback((text: string) => {
    const id = ++nextId.current;
    setNotices((n) => [...n.slice(-(MAX_VISIBLE - 1)), { id, text }]);
    setTimeout(() => {
      setNotices((n) => n.filter((x) => x.id !== id));
    }, NOTICE_LIFETIME_MS);
  }, []);

  return { notices, add };
}