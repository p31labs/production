/**
 * Portal MCP tool attributes — every surface root carries a data-mcp-tool
 * attribute so agents can navigate and test the design portal autonomously
 * (workspace pattern). Handlers are the named agent-callable verbs.
 */
export const MCP_TOOLS: Record<string, string> = {
  shell: 'portalShell',
  showcase: 'showcaseSurface',
  marketplace: 'marketplaceSurface',
  catalog: 'catalogSurface',
  playground: 'playgroundSurface',
  tokens: 'tokensSurface',
  glass: 'glassSurface',
  brands: 'brandsSurface',
  recipes: 'recipesSurface',
  mcp: 'mcpConsoleSurface',
  a11y: 'a11ySurface',
  icons: 'iconsSurface',
  dome: 'domeSurface',
}

export const MCP_HANDLERS: Record<string, string> = {
  showcase: 'mcp_design_showcase',
  marketplace: 'mcp_design_marketplace',
  catalog: 'mcp_design_catalog',
  playground: 'mcp_design_playground',
  tokens: 'mcp_design_tokens',
  glass: 'mcp_design_glass',
  brands: 'mcp_design_brands',
  recipes: 'mcp_design_recipes',
  mcp: 'mcp_design_console',
  a11y: 'mcp_design_a11y',
  icons: 'mcp_design_icons',
  dome: 'mcp_design_dome',
}

/** Map a route path to its MCP tool name (for per-route data-mcp-tool). */
export function mcpToolForPath(path: string): string {
  const key = path.replace(/^\/+/, '') || 'showcase'
  return MCP_TOOLS[key] ?? MCP_TOOLS.shell
}