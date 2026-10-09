import { Starfield } from '@p31ca/design-core/compositions';
import { useSpoons } from '../store/spoons';

interface AppStarfieldProps {
  enabled: boolean;
  className?: string;
}

/**
 * Full-app starfield backdrop. Renders the design-core Starfield (already
 * consumable) fixed behind the content. `enabled` ties into the user's calm
 * / reduced-stimulation preference — when off, no stars are rendered at all.
 * prefers-reduced-motion is handled natively by mountStarfield (static draw,
 * no rAF loop).
 */
export default function AppStarfield({ enabled, className = '' }: AppStarfieldProps) {
  const spoons = useSpoons((s) => s.spoons);
  if (!enabled) return null;
  return (
    <div className={`app-starfield ${className}`} aria-hidden="true">
      <Starfield spoons={spoons} safeMode />
    </div>
  );
}