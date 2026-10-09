import React from 'react';
import {
  Topbar,
  SidebarNav,
  MobileBottomNav,
  CalmOverlay,
  CommandPalette,
  NotificationStack,
  BottomNav,
  SectionStrip,
  Crown,
  Footer,
  SpoonDial,
  CrisisOverlay,
  StatusCluster,
  ModePill,
  CalmIndicator,
  SpoonCluster,
  type SidebarNavItem,
} from '@p31ca/design-core/compositions';

/** Canon nav fixture — the same items shape all chrome nav consumes. */
const NAV: SidebarNavItem[] = [
  { path: '/', label: 'Home', emoji: '🏠' },
  { path: '/catalog', label: 'Catalog', emoji: '🧩', flagship: true },
  { path: '/marketplace', label: 'Marketplace', emoji: '🛍️', flagship: true },
  { path: '/playground', label: 'Playground', emoji: '🧪' },
];

/** Render ONE canon chrome component in isolation. */
export function renderChrome(name: string): React.ReactNode {
  switch (name) {
    case 'Topbar':
      return (
        <Topbar
          brand={<Crown label="P31" />}
          center={<span />}
          statusCluster={
            <StatusCluster>
              <ModePill mode="spark" />
              <SpoonCluster level={3} />
              <CalmIndicator spoons={3} />
            </StatusCluster>
          }
          mode={<ModePill mode="spark" />}
          trailing={<SpoonDial level={3} />}
        />
      );
    case 'SidebarNav':
      return <SidebarNav items={NAV} activePath="/catalog" />;
    case 'MobileBottomNav':
      return <MobileBottomNav items={NAV} activePath="/catalog" />;
    case 'CalmOverlay':
      return <CalmOverlay spoons={0} onReturn={() => undefined} />;
    case 'CommandPalette':
      return (
        <CommandPalette
          open
          items={[
            { id: '1', label: 'Go to Catalog', keywords: 'catalog nav' },
            { id: '2', label: 'Go to Marketplace', keywords: 'marketplace shop' },
          ]}
          onSelect={() => undefined}
          onClose={() => undefined}
        />
      );
    case 'NotificationStack':
      return (
        <NotificationStack
          items={[
            { id: '1', kind: 'success', title: 'Verified', body: 'Evidence chain intact' },
            { id: '2', kind: 'info', title: 'Synced', body: 'All portals on canon' },
          ]}
        />
      );
    case 'BottomNav':
      return <BottomNav items={NAV} activeIndex={1} />;
    case 'SectionStrip':
      return (
        <SectionStrip
          items={NAV.map((n) => ({ id: n.path, label: n.label, active: n.path === '/catalog' }))}
        />
      );
    case 'Crown':
      return <Crown label="P31" />;
    case 'Footer':
      return (
        <Footer
          brandLabel="P31 Labs"
          columns={[
            { title: 'System', links: [{ label: 'Tokens', href: '/tokens' }, { label: 'Catalog', href: '/catalog' }] },
          ]}
        />
      );
    case 'SpoonDial':
      return <SpoonDial level={3} />;
    case 'CrisisOverlay':
      return <CrisisOverlay visible message="Crisis mode" buttonLabel="Recover" onReady={() => undefined} />;
    default:
      return <div className="harness-unknown">Unknown component: {name}</div>;
  }
}