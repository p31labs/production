/**
 * @file useCollabCalendar.ts — Subscribe the calendar UI to the Yjs events map.
 */

import { useEffect, useState } from 'react';
import { getEventsMap } from '../lib/eventsStore';

export function useCollabCalendar() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const map = getEventsMap();
    const bump = () => setTick((t) => t + 1);
    map.observe(bump);
    return () => map.unobserve(bump);
  }, []);

  return { tick };
}