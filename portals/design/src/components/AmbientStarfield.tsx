import { useEffect, useRef } from 'react';
import {
  mountJitterbugStarfield,
  type JitterbugStarfieldInstance,
} from '@p31ca/design-core/starfield/jitterbug';
import { useThemeStore } from '@p31ca/design-core/theming/theme-store';
import { starfieldInstance } from '../lib/starfield-instance';

interface Props {
  /** cognitive load level — engine throttles geometry + motion */
  spoons?: number;
}

/** Fixed full-viewport molecular background. Pauses at spoons ≤1 / reduced motion. */
export default function AmbientStarfield({ spoons = 3 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const instance = useRef<JitterbugStarfieldInstance | null>(null);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    if (!ref.current) return;
    const inst = mountJitterbugStarfield(ref.current, { spoons });
    instance.current = inst;
    starfieldInstance.current = inst;
    return () => {
      inst.destroy();
      instance.current = null;
      starfieldInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    instance.current?.setSpoons(spoons);
    instance.current?.setPaused(spoons <= 1);
  }, [spoons]);

  // Re-tint star colors when the chameleon swaps worlds
  useEffect(() => {
    const inst = instance.current;
    if (!inst || typeof window === 'undefined') return;
    const colors = window.__P31_STAR_COLORS__;
    if (!colors) return;
    inst.notify('mesh_peer', 0.5, 0.4);
  }, [theme]);

  return <div ref={ref} className="starfield-bg" aria-hidden="true" />;
}
