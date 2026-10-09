import { Suspense, type ReactNode } from 'react';
import { BlockList, type BlockRegistry } from './render';
import type { ShellConfig } from './contract';

/** The chameleon shell — one canonical frame, theme-parameterized (the research
 *  pattern: shell owns layout, the host supplies slot fills). PortalShell owns
 *  the INVARIANT structure — skip-link, ambient mount, header frame, app-shell
 *  (sidebar + main-workspace), mobile nav, and the overlay extras — and each
 *  portal supplies its content as slots: header (its Topbar wrapper), ambient
 *  (dome + LED chip), nav (sidebar + mobile), extras (palette/calm/notifs),
 *  and the route tree. The theme (Chameleon) is the parameter; the frame is
 *  constant. */
/** The chameleon shell config — the ShellConfig already constrains
 *  shell.header to the canon topbar; this alias names the intent. */
export type PortalShellConfig = ShellConfig;

export interface PortalShellProps {
  config: PortalShellConfig;
  /** Block registry — blockId → canon component (config-driven placements). */
  registry: BlockRegistry;
  /** Slot: the portal's Topbar wrapper (composes the canon Topbar). */
  header: ReactNode;
  /** Slot: the ambient — DomeBackground + LedController (dome + LED chip). */
  ambient?: ReactNode;
  /** Slot: the sidebar rail (canon SidebarNav via the portal's nav data). */
  sidebar?: ReactNode;
  /** Slot: the mobile bottom nav (canon MobileBottomNav via the portal's nav). */
  mobileNav?: ReactNode;
  /** Slot: overlay extras — CommandPalette + CalmOverlay + NotificationStack. */
  extras?: ReactNode;
  /** Route tree rendered inside main-workspace (after config block placements). */
  children: ReactNode;
  /** Suspense fallback (the portal's component-shaped loading, not a spinner). */
  fallback?: ReactNode;
  /** Optional data-mcp-tool attribute for the main surface (design portal). */
  mcpTool?: string;
}

/** The canonical chameleon frame. Every structural element here is shared by
 *  every portal; nothing portal-specific belongs in this component (the shell
 *  owns chrome, the portal owns content — Campminder's rule).
 *
 *  Main-slot interleave rule (the two-content-source contract): config block
 *  placements render FIRST in main-workspace, then the portal's route tree as
 *  children. Per-route config placement (replacing children for a route) is
 *  the Composer's job and will extend this rule — config blocks are global
 *  until then. */
export function PortalShell({
  config,
  registry,
  header,
  ambient,
  sidebar,
  mobileNav,
  extras,
  children,
  fallback,
  mcpTool,
}: PortalShellProps) {
  const main = config.shell.main ?? [];
  const aside = config.shell.aside ?? [];

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {ambient}
      {header}
      <div className="app-shell">
        {sidebar}
        {aside.length > 0 && (
          <aside className="p31-shell__aside">
            <BlockList slot={aside} registry={registry} />
          </aside>
        )}
        <main className="main-workspace" id="main-content" data-mcp-tool={mcpTool}>
          {main.length > 0 && <BlockList slot={main} registry={registry} />}
          <Suspense fallback={fallback ?? null}>{children}</Suspense>
        </main>
      </div>
      {mobileNav}
      {extras}
    </>
  );
}

export default PortalShell;