import React, { useRef, useEffect, useState } from 'react';

declare const loadSandboxAddon: () => Promise<{ SandboxAddon: any }>;

export function TerminalPanel({ sessionId, workerUrl }: { sessionId?: string; workerUrl?: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const fitAddonRef = useRef<any>(null);
  const addonRef = useRef<any>(null);
  const [connectionState, setConnectionState] = useState<string>('disconnected');

  useEffect(() => {
    if (!terminalRef.current) return;

    let term: any;
    let disposed = false;

    const init = async () => {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: 'JetBrains Mono, monospace',
        theme: {
          background: '#0A0A0F',
          foreground: '#e2e8f0',
          cursor: '#00ffcc',
          selectionBackground: '#00ffcc33',
          black: '#0A0A0F', red: '#ef4444', green: '#22c55e', yellow: '#f59e0b',
          blue: '#4d96ff', magenta: '#c084fc', cyan: '#00ffcc', white: '#e2e8f0',
          brightBlack: '#64748b', brightRed: '#fb7185', brightGreen: '#34d399',
          brightYellow: '#fbbf24', brightBlue: '#60a5fa', brightMagenta: '#d8b4fe',
          brightCyan: '#22d3ee', brightWhite: '#f1f5f9',
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      fitAddonRef.current = fitAddon;

      if (disposed) return;
      term.open(terminalRef.current);
      fitAddon.fit();

      connectTerminal(term);
    };

    const handleResize = () => { if (fitAddonRef.current) fitAddonRef.current.fit(); };
    window.addEventListener('resize', handleResize);

    init();

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      if (addonRef.current?.disconnect) addonRef.current.disconnect();
      if (term) term.dispose();
    };
  }, []);

  const connectTerminal = async (term: any) => {
    try {
      const { SandboxAddon } = await loadSandboxAddon();
      const wsOrigin = workerUrl || 'wss://terminal-relay.trimtab-signal.workers.dev';

      const addon = new SandboxAddon({
        getWebSocketUrl: () => `${wsOrigin}/ws?session=${sessionId || 'default'}`,
        reconnect: true,
        onStateChange: (state: string, error?: Error) => {
          setConnectionState(state);
          if (state === 'connected') {
            term.writeln('\x1b[32mConnected to P31 Sandbox\x1b[0m');
          } else if (state === 'disconnected' && error) {
            term.writeln(`\x1b[31mError: ${error.message}\x1b[0m`);
          }
        },
      });

      term.loadAddon(addon);
      addonRef.current = addon;
      addon.connect({ sandboxId: sessionId || 'default', sessionId: sessionId || 'default' });
    } catch (err) {
      term.writeln(`\x1b[31mFailed to load terminal: ${err}\x1b[0m`);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-1 border-b text-[10px]" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(10,10,15,0.6)' }}>
        <span className="opacity-40">TERMINAL</span>
        <span className={`${connectionState === 'connected' ? 'text-green-500' : connectionState === 'connecting' ? 'text-yellow-500' : 'text-red-500'}`}>
          {connectionState === 'connected' ? 'Connected' : connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </span>
        <div className="flex-1" />
        <button onClick={() => { if (addonRef.current?.disconnect) addonRef.current.disconnect(); connectTerminal(terminalRef.current as any); }}
          className="px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>
          Reconnect
        </button>
      </div>
      <div ref={terminalRef} className="flex-1 min-h-0" style={{ background: '#0A0A0F' }} />
    </div>
  );
}

export default TerminalPanel;
