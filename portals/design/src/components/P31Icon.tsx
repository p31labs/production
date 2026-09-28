/**
 * P31Icon — inline the animated P31 icon pack SVGs (theme-adaptive via
 * var(--p31-accent-*) inside the SVGs). Vite `?raw` imports the source; we
 * inject it as inert HTML (safe — these are first-party static SVGs).
 */
import spoon from '../assets/icons/regular/spoon.svg?raw';
import molecule from '../assets/icons/regular/molecule.svg?raw';
import loveHeart from '../assets/icons/regular/love-heart.svg?raw';
import k4Tetrahedron from '../assets/icons/regular/k4-tetrahedron.svg?raw';
import signal from '../assets/icons/regular/signal.svg?raw';
import meshNode from '../assets/icons/regular/mesh-node.svg?raw';
import resonance from '../assets/icons/regular/863hz-resonance.svg?raw';
import wordmark from '../assets/icons/regular/p31-wordmark.svg?raw';
import cometOrb from '../assets/icons/advanced/comet-orb.svg?raw';
import nebulaBurst from '../assets/icons/advanced/nebula-burst.svg?raw';
import prismFold from '../assets/icons/advanced/prism-fold.svg?raw';
import sovereignCrown from '../assets/icons/advanced/sovereign-crown.svg?raw';

export const ICON_MAP = {
  spoon,
  molecule,
  'love-heart': loveHeart,
  'k4-tetrahedron': k4Tetrahedron,
  signal,
  'mesh-node': meshNode,
  '863hz-resonance': resonance,
  'p31-wordmark': wordmark,
  'comet-orb': cometOrb,
  'nebula-burst': nebulaBurst,
  'prism-fold': prismFold,
  'sovereign-crown': sovereignCrown,
} as const;

export type IconName = keyof typeof ICON_MAP;

interface P31IconProps {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
}

export function P31Icon({ name, size = 32, className, title }: P31IconProps) {
  const raw = ICON_MAP[name];
  const wrapped = raw
    .replace(/(<svg[^>]*)(>)/, `$1 data-icon="${name}" width="${size}" height="${size}"${className ? ` class="${className}"` : ''}$2`)
    .replace(/<title>.*?<\/title>/, title ? `<title>${title}</title>` : '');
  return <span data-p31-icon={name} aria-hidden={title ? undefined : 'true'} dangerouslySetInnerHTML={{ __html: wrapped }} />;
}

export default P31Icon;