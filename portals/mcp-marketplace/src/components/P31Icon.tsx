/**
 * P31Icon — inline the first-party P31 icon-pack SVGs (theme-adaptive via
 * var(--p31-accent-*) inside the SVGs). Vite `?raw` imports the source; we
 * inject it as inert HTML (safe — these are first-party static SVGs).
 *
 * Pattern follows portals/design/src/components/P31Icon.tsx. Only the
 * assets this portal uses ship in src/assets/icons — OS emoji stay where
 * the pack has no matching asset (compass/wrench/share keep their glyphs).
 */
import loveHeart from '../assets/icons/regular/love-heart.svg?raw';
import sovereignCrown from '../assets/icons/advanced/sovereign-crown.svg?raw';

export const ICON_MAP = {
  'love-heart': loveHeart,
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