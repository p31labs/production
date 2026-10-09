import React, { useState, useCallback, useRef } from 'react';
import { DockviewReact } from 'dockview';
import 'dockview/dist/styles/dockview.css';
import { TerminalPanel } from './terminal';
import { MCPToolPanel } from './mcp';
import { ForgeStatusBar } from './status-bar';
import type { ForgePlugin, ForgeConfig } from './types';

const FORGE_PLUGINS: ForgePlugin[] = [
  { id: 'terminal', label: 'Terminal', icon: '⬛', component: () => null, defaultPosition: 'bottom', defaultSize: 25 },
  { id: 'mcp-tools', label: 'MCP Tools', icon: '🔧', component: () => null, defaultPosition: 'left', defaultSize: 20 },
];

export function ForgeWorkspace({ config: _config }: { config?: ForgeConfig }) {
  const [spoons, setSpoons] = useState(4);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const dockviewRef = useRef<any>(null);
  const [layoutLoaded, setLayoutLoaded] = useState(false);

  const onReady = useCallback((event: any) => {
    const api = event.api;
    dockviewRef.current = api;

    const saved = localStorage.getItem('p31-forge-layout');
    if (saved) {
      try { api.fromJSON(JSON.parse(saved)); setLayoutLoaded(true); return; } catch {}
    }

    const centerGroup = api.addGroup({});
    api.addPanel({
      id: 'welcome',
      component: 'welcome',
      title: 'Welcome',
      position: { referenceGroup: centerGroup, direction: 'within' },
    });

    const leftGroup = api.addGroup({ referenceGroup: centerGroup, direction: 'left' });
    api.addPanel({
      id: 'mcp-tools',
      component: 'mcp-tools',
      title: 'MCP Tools',
      position: { referenceGroup: leftGroup, direction: 'within' },
    });

    const bottomGroup = api.addGroup({ referenceGroup: centerGroup, direction: 'bottom' });
    api.addPanel({
      id: 'terminal',
      component: 'terminal',
      title: 'Terminal',
      position: { referenceGroup: bottomGroup, direction: 'within' },
    });

    api.onDidLayoutChange(() => {
      const layout = api.toJSON();
      localStorage.setItem('p31-forge-layout', JSON.stringify(layout));
    });

    api.onDidActivePanelChange((panel: any) => {
      if (panel) setActivePanel(panel.id);
    });

    setLayoutLoaded(true);
  }, []);

  const components: Record<string, React.FunctionComponent<any>> = {
    'welcome': () => (
      <div className="forge-welcome h-full flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="text-center space-y-4 max-w-md">
          <div className="text-4xl">⚒️</div>
          <h2 className="text-xl font-semibold" style={{ color: '#00ffcc' }}>P31 Forge</h2>
          <p className="text-xs opacity-40 leading-relaxed">
            Drag panels to rearrange. Add new panels from the menu.
            Every action earns XP in the Membrane gamification engine.
          </p>
        </div>
      </div>
    ),
    'terminal': () => <TerminalPanel />,
    'mcp-tools': () => <MCPToolPanel />,
  };

  return (
    <div className="forge-workspace h-full flex flex-col" data-spoons={spoons}>
      <div className="flex-1 min-h-0">
        <DockviewReact
          className="forge-dockview"
          components={components}
          onReady={onReady}
        />
      </div>
      <ForgeStatusBar
        spoons={spoons}
        setSpoons={setSpoons}
        activePanel={activePanel}
      />
    </div>
  );
}

export default ForgeWorkspace;
