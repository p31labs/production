import type { IconName } from '../components/icons/P31Icon';

export interface NavSection {
  path: string;
  label: string;
  icon: IconName;
  description: string;
}

export const NAV_SECTIONS: NavSection[] = [
  { path: '/', label: 'Home', icon: 'home', description: 'At a glance: tokens, worlds, and where to start' },
  { path: '/tokens', label: 'Tokens', icon: 'tokens', description: 'W3C DTCG token explorer — swatches, variables, values' },
  { path: '/components', label: 'Components', icon: 'components', description: 'Canonical component catalog with live examples' },
  { path: '/glass', label: 'Glass Lab', icon: 'glass', description: 'Glassmorphism 2.0 laboratory and surface recipes' },
  { path: '/brands', label: 'Brands', icon: 'brands', description: 'Multi-brand orchestration orchestrated through the Chameleon' },
  { path: '/recipes', label: 'Recipes', icon: 'recipes', description: 'Copy-paste recipes for common P31 patterns' },
  { path: '/playground', label: 'Playground', icon: 'layout', description: 'Intent gates, prompt doors, and composer experiments' },
  { path: '/mcp', label: 'MCP Console', icon: 'terminal', description: 'Live MCP server console and tool call log' },
  { path: '/a11y', label: 'Accessibility', icon: 'a11y', description: 'Neuroinclusion, spoon ladder, and sensory defaults' },
  { path: '/icons', label: 'Icons', icon: 'image', description: 'P31 icon system — inline, stroked, glow-driven' },
];

export function isActivePath(path: string, pathname: string): boolean {
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(path + '/');
}