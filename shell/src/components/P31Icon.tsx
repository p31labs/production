import { useMemo } from 'react';
import { trustedHtml } from '../lib/trustedTypes';

const ICONS = import.meta.glob('../assets/icons/**/*.svg', { query: '?raw', eager: true }) as Record<string, { default: string }>;

function getSvg(key: string): string | null {
  const mod = ICONS[key];
  if (!mod) return null;
  let raw: string | null = null;
  if (typeof mod === 'string') raw = mod;
  else if (mod && typeof mod === 'object' && typeof mod.default === 'string') raw = mod.default;
  if (!raw) return null;
  return raw.replace(/<svg\b/, '<svg pointer-events="none"');
}

const NAME_TO_PATH: Record<string, string> = {
  'k4-tetrahedron': 'regular/k4-tetrahedron',
  spoon: 'regular/spoon',
  'love-heart': 'regular/love-heart',
  molecule: 'regular/molecule',
  'mesh-node': 'regular/mesh-node',
  signal: 'regular/signal',
  'p31-wordmark': 'regular/p31-wordmark',
  '863hz-resonance': 'regular/863hz-resonance',
  'comet-orb': 'advanced/comet-orb',
  'nebula-burst': 'advanced/nebula-burst',
  'prism-fold': 'advanced/prism-fold',
  'sovereign-crown': 'advanced/sovereign-crown',
};

export default function P31Icon({
  name,
  width = '100%',
  height = '100%',
  style,
  className,
  ...rest
}: {
  name: string;
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
  className?: string;
  [key: string]: unknown;
}) {
  const raw = useMemo(() => {
    const base = NAME_TO_PATH[name];
    if (!base) return null;
    return getSvg(`../assets/icons/${base}.svg`);
  }, [name]);

  if (!raw) return null;

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', width, height, flexShrink: 0, pointerEvents: 'none', ...style }}
      dangerouslySetInnerHTML={{ __html: trustedHtml(raw) }}
      {...rest}
    />
  );
}
