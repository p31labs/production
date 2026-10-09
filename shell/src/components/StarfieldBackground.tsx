import { useJitterbugStarfield } from '../hooks/useJitterbugStarfield';
import { useAppStore } from '../store/useAppStore';

export default function StarfieldBackground() {
  const spoons = useAppStore((s) => s.spoons);
  const reduceMotion = useAppStore((s) => s.reduceMotion);
  const { containerRef } = useJitterbugStarfield({ spoons, paused: reduceMotion });
  return <div ref={containerRef} className="starfield-bg" aria-hidden="true" />;
}
