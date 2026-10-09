/**
 * renderer/McpApp.tsx — the open-ended tier of the generative-UI spectrum.
 *
 * MCP Apps: when a tool declares a UI resource, the shell renders it in a
 * sandboxed iframe and enables bidirectional communication via JSON-RPC over
 * postMessage. The iframe is sandboxed (allow-scripts only — no same-origin,
 * no top navigation, no forms) so third-party UI can't touch the host.
 *
 * Bridge protocol (the MCP Apps extension):
 *   host → iframe:  { jsonrpc: '2.0', method: 'ui/initialize', params }
 *   iframe → host:  { jsonrpc: '2.0', method: 'mcp.callTool' | 'mcp.sendMessage', params }
 *   host → iframe:  { jsonrpc: '2.0', id, result }  (tool results / host capabilities)
 */
import { useEffect, useRef, useState } from 'react';

export interface McpAppProps {
  /** The UI resource URL the MCP server declares (rendered in the iframe). */
  resource: string;
  /** Display mode: 'widget' (inline) | 'full' (fills the surface). */
  displayMode?: 'widget' | 'full';
}

/** A minimal JSON-RPC bridge for an MCP App iframe. */
export function McpApp({ resource, displayMode = 'widget' }: McpAppProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Only accept messages from our own iframe origin.
      if (iframeRef.current?.contentWindow !== e.source) return;
      const msg = e.data as { jsonrpc?: string; method?: string; id?: number | string; result?: unknown; error?: { message: string } };
      if (msg.jsonrpc !== '2.0') return;
      if (msg.method === 'ui/initialize') {
        setReady(true);
        // Respond with host capabilities.
        iframeRef.current?.contentWindow?.postMessage(
          { jsonrpc: '2.0', id: msg.id, result: { capabilities: ['sendMessage', 'openLink'], host: 'p31-shell' } },
          '*',
        );
      } else if (msg.method === 'mcp.callTool' || msg.method === 'mcp.sendMessage') {
        // Forward tool calls to the shell adapter (the parent handles the
        // real MCP invocation). For now, acknowledge.
        iframeRef.current?.contentWindow?.postMessage(
          { jsonrpc: '2.0', id: msg.id, result: { ok: true, note: 'tool call received' } },
          '*',
        );
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Send the ui/initialize handshake once the iframe loads.
  const onLoad = () => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { jsonrpc: '2.0', method: 'ui/initialize', params: { displayMode } },
        '*',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'iframe handshake failed');
    }
  };

  return (
    <div className={`mcapp mcapp--${displayMode}`} role="region" aria-label="MCP app">
      <iframe
        ref={iframeRef}
        className="mcapp__frame"
        src={resource}
        sandbox="allow-scripts"
        title="MCP app"
        onLoad={onLoad}
      />
      {ready && <span className="mcapp__badge">live</span>}
      {error && <p className="mcapp__error" role="alert">{error}</p>}
    </div>
  );
}