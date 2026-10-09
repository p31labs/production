/**
 * P31SiteHeader — the composed canon header island.
 *
 * Astro cannot pass JSX as a prop to a hydrated island (withastro/astro#3575,
 * #3964). The fix: compose SiteNav + ThemeToggle inside a single React
 * component so the whole header is ONE island. Astro passes only
 * serializable props (brand, navLinks, spoonMode); the JSX is parsed by
 * React, not Astro.
 */
import { SiteNav, type SiteNavLink } from './SiteNav';
import { ThemeToggle } from './ThemeToggle';

export interface P31SiteHeaderProps {
  brand?: 'p31ca' | 'phosphorus' | 'phos' | 'willow';
  navLinks: SiteNavLink[];
  spoonMode?: 'compact' | 'icon' | 'pips' | 'button';
  showAuth?: boolean;
}

export function P31SiteHeader({
  brand = 'p31ca',
  navLinks,
  spoonMode = 'pips',
  showAuth = true,
}: P31SiteHeaderProps) {
  return (
    <SiteNav
      brand={brand}
      navLinks={navLinks}
      spoonMode={spoonMode}
      showAuth={showAuth}
      headerActions={<ThemeToggle />}
    />
  );
}

export default P31SiteHeader;