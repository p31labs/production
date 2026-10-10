import type { IconName } from '../components/icons/P31Icon';

export type NavSectionId = 'foundations' | 'components' | 'patterns' | 'resources' | 'agents';

export interface NavSection {
  path: string;
  label: string;
  icon: IconName;
  emoji: string;
  description: string;
  flagship?: boolean;
  /** Which of the five system-of-record sections this entry re-homes under. */
  section: NavSectionId;
}

/** The five sections, in foundations-first order. This is the system's
 *  self-portrait: Foundations (the token tree) → Components (the 32
 *  compositions) → Patterns (multi-component solutions) → Resources (tokens,
 *  changelog, migration) → Agents (AGENTS.md, DESIGN.md, llms.txt, MCP).
 *  Mirrors the token architecture's own hierarchy.
 *
 *  Classification rule (so a new surface re-homes mechanically, not by guess):
 *  - Foundations — mirrors a token-tree branch (color/type/spacing/motion/
 *    radius/elevation/iconography) or a cross-cutting principle (a11y, theming).
 *  - Components — the 32 compositions and their interactive labs (catalog,
 *    playground, glass lab).
 *  - Patterns — multi-component solutions and named demonstrations (recipes,
 *    dome, sign-in flow, dashboard shell).
 *  - Resources — reference + governance: tokens reference, changelog,
 *    migration, contributing, registry, marketplace.
 *  - Agents — AGENTS.md, DESIGN.md, llms.txt, MCP console, composition tools.
 */
export const SECTION_GROUPS: { id: NavSectionId; label: string; emoji: string; description: string }[] = [
  { id: 'foundations', label: 'Foundations', emoji: '📐', description: 'The token tree, rendered' },
  { id: 'components', label: 'Components', emoji: '🧩', description: 'The 32 compositions, live' },
  { id: 'patterns', label: 'Patterns', emoji: '📖', description: 'Multi-component solutions' },
  { id: 'resources', label: 'Resources', emoji: '🛠', description: 'Tokens, changelog, migration, contributing' },
  { id: 'agents', label: 'Agents', emoji: '🤖', description: 'AGENTS.md, DESIGN.md, llms.txt, MCP' },
];

/** Flat navigation list — every entry carries a `section` so the shell can
 *  group it under the five system-of-record headings. Paths are UNCHANGED in
 *  this commit; route re-homing (deep-link moves) is the next step. */
export const NAV_SECTIONS: NavSection[] = [
  { path: '/', label: 'Home / Launcher', icon: 'home', emoji: '🏠', description: 'At a glance: the Quantum Material language and where to start', flagship: true, section: 'components' },
  { path: '/tokens', label: 'Tokens', icon: 'tokens', emoji: '🎨', description: 'W3C DTCG token explorer — OKLCH swatches, variables, values', section: 'foundations' },
  { path: '/glass', label: 'Glass Lab', icon: 'glass', emoji: '🧊', description: 'Glassmorphism laboratory and surface recipes', section: 'components' },
  { path: '/icons', label: 'Icons', icon: 'image', emoji: '🖼️', description: 'P31 icon system — inline, stroked, glow-driven', section: 'foundations' },
  { path: '/a11y', label: 'Accessibility', icon: 'a11y', emoji: '♿', description: 'Neuroinclusion, spoon ladder, and sensory defaults', section: 'foundations' },
  { path: '/catalog', label: 'Catalog', icon: 'catalog', emoji: '🧩', description: 'Canonical component catalog with live previews and contracts', flagship: true, section: 'components' },
  { path: '/marketplace', label: 'Marketplace', icon: 'marketplace', emoji: '🛍️', description: 'Design shop — install components, compositions, and recipes', flagship: true, section: 'resources' },
  { path: '/playground', label: 'Playground', icon: 'layout', emoji: '🧪', description: 'Live component lab + Intent DSL QA gates', flagship: true, section: 'components' },
  { path: '/a2ui', label: 'A2UI', icon: 'sparkles', emoji: '✨', description: 'Generative UI — agent intent → declarative data → rendered from the catalog', flagship: true, section: 'agents' },
  { path: '/recipes', label: 'Recipes', icon: 'recipes', emoji: '📖', description: 'Copy-paste recipes for common P31 patterns', section: 'patterns' },
  { path: '/brands', label: 'Brands', icon: 'brands', emoji: '🌐', description: 'Multi-brand orchestration through the Chameleon', section: 'foundations' },
  { path: '/dome', label: 'Dome', icon: 'dome', emoji: '🔮', description: 'Spaceship Earth cockpit — geodesic dome + starfield with LED controller', flagship: true, section: 'patterns' },
  { path: '/mcp', label: 'MCP Console', icon: 'terminal', emoji: '💻', description: 'Live design-core MCP server console and tool calls', section: 'agents' },
];

export const FLAGSHIP_PATHS = NAV_SECTIONS.filter((s) => s.flagship).map((s) => s.path);

export function isActivePath(path: string, pathname: string): boolean {
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(path + '/');
}