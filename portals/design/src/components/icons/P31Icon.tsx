import type { ReactNode, SVGProps } from 'react';

const ICON_PATHS: Record<string, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M9.5 22v-6h5v6" />
    </>
  ),
  tokens: (
    <>
      <path d="M12 2.5 19 6.5l-7 4-7-4z" />
      <path d="M5 12l7 4 7-4" />
      <path d="M5 16.5 12 20.5l7-4" />
    </>
  ),
  components: (
    <>
      <path d="M21 7.5 12 3l-9 4.5v9L12 21l9-4.5z" />
      <path d="M3 7.5l9 4.5 9-4.5" />
      <path d="M12 12v9" />
    </>
  ),
  glass: (
    <>
      <path d="M12 2.5c2.5 3 5.5 5.65 5.5 9.5a5.5 5.5 0 0 1-11 0C6.5 8.15 9.5 5.5 12 2.5z" />
      <path d="M9.5 12a3 3 0 0 0 2.5 3" />
    </>
  ),
  brands: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.6 4 6.1 4 9s-1.5 6.4-4 9c-2.5-2.6-4-6.1-4-9s1.5-6.4 4-9z" />
    </>
  ),
  recipes: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20" />
      <path d="M8 7h8" />
      <path d="M8 11h6" />
    </>
  ),
  layout: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 9v11" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </>
  ),
  terminal: (
    <>
      <path d="M4 16.5 10 12l-6-4.5" />
      <path d="M12 19h8" />
    </>
  ),
  a11y: (
    <>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M18 7.5l-5.5.9L6.5 7.5" />
      <path d="M12 8.4V15" />
      <path d="M9.75 19.5 12 15.5l2 4" />
    </>
  ),
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 15l4-4 3 3 4-5 5 6" />
      <circle cx="9" cy="9" r="1" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1.4 0 2-.9 2-2.1V17.5c0-1.4.9-2.4 2.3-2.4H18a3 3 0 0 0 3-3C21 6.9 16.8 3 12 3z" />
      <circle cx="7.5" cy="11.5" r="0.9" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  command: (
    <>
      <path d="M9 9V6a3 3 0 1 0-3 3h3z" />
      <path d="M15 9V6a3 3 0 1 1 3 3h-3z" />
      <path d="M15 15v3a3 3 0 1 1-3-3h3z" />
      <path d="M9 15v3a3 3 0 1 0 3-3H9z" />
      <path d="M9 9h6v6H9z" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </>
  ),
  heart: (
    <>
      <path d="M12 20.2S4.5 15.6 3 11.5C1.9 8.5 4.2 5 7.5 5c1.9 0 3.3 1 4.5 2.4C13.2 6 14.6 5 16.5 5c3.3 0 5.6 3.5 4.5 6.5-1.5 4.1-9 8.7-9 8.7z" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  x: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  check: (
    <>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </>
  ),
  moon: (
    <>
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.9 4.9l1.4 1.4" />
      <path d="M17.7 17.7l1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.9 19.1l1.4-1.4" />
      <path d="M17.7 6.3l1.4-1.4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5.2c0 4.2-2.9 7.5-7 9.3-4.1-1.8-7-5.1-7-9.3V6z" />
      <path d="M9 11.5l2 2 4-4" />
    </>
  ),
  dot: (
    <>
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
};

export type IconName = keyof typeof ICON_PATHS;

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];

export interface P31IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  name: IconName;
  size?: number;
}

export default function P31Icon({ name, size = 20, ...rest }: P31IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}