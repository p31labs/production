import type { IconName } from '../components/icons/P31Icon';

export interface NavSection {
  path: string;
  label: string;
  icon: IconName;
  emoji: string;
  description: string;
  flagship?: boolean;
}

/** Quantum Material IA — four task-based flagships + supporting sections.
 *  Emoji mirrors the workspace/mcp-marketplace suite sidebar + launcher. */
export const NAV_SECTIONS: NavSection[] = [
  { path: '/', label: 'Home / Launcher', icon: 'home', emoji: '🏠', description: 'At a glance: the Quantum Material language and where to start', flagship: true },
  { path: '/marketplace', label: 'Marketplace', icon: 'marketplace', emoji: '🛍️', description: 'Design shop — install components, compositions, and recipes', flagship: true },
  { path: '/catalog', label: 'Catalog', icon: 'catalog', emoji: '🧩', description: 'Canonical component catalog with live previews and contracts', flagship: true },
  { path: '/playground', label: 'Playground', icon: 'layout', emoji: '🧪', description: 'Live component lab + Intent DSL QA gates', flagship: true },
  { path: '/a2ui', label: 'A2UI', icon: 'sparkles', emoji: '✨', description: 'Generative UI — agent intent → declarative data → rendered from the catalog', flagship: true },
  { path: '/tokens', label: 'Tokens', icon: 'tokens', emoji: '🎨', description: 'W3C DTCG token explorer — OKLCH swatches, variables, values' },
  { path: '/glass', label: 'Glass Lab', icon: 'glass', emoji: '🧊', description: 'Glassmorphism laboratory and surface recipes' },
  { path: '/brands', label: 'Brands', icon: 'brands', emoji: '🌐', description: 'Multi-brand orchestration through the Chameleon' },
  { path: '/recipes', label: 'Recipes', icon: 'recipes', emoji: '📖', description: 'Copy-paste recipes for common P31 patterns' },
  { path: '/mcp', label: 'MCP Console', icon: 'terminal', emoji: '💻', description: 'Live design-core MCP server console and tool calls' },
  { path: '/a11y', label: 'Accessibility', icon: 'a11y', emoji: '♿', description: 'Neuroinclusion, spoon ladder, and sensory defaults' },
  { path: '/icons', label: 'Icons', icon: 'image', emoji: '🖼️', description: 'P31 icon system — inline, stroked, glow-driven' },
  { path: '/dome', label: 'Dome', icon: 'dome', emoji: '🔮', description: 'Spaceship Earth cockpit — geodesic dome + starfield with LED controller', flagship: true },

];

export const FLAGSHIP_PATHS = NAV_SECTIONS.filter((s) => s.flagship).map((s) => s.path);

export function isActivePath(path: string, pathname: string): boolean {
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(path + '/');
}