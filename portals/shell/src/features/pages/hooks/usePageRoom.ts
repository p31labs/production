/**
 * @file usePageRoom.ts — raw-WebSocket Yjs room binding for a single page.
 *
 * Minimal room client: the Y.Doc is created once (useState), a raw WebSocket
 * joins `/api/pages/{id}/room`, and every `MSG_SYNC` frame (first byte 0) is
 * applied with `Y.applyUpdate`. No y-websocket provider required.
 */

import { useEffect, useState } from 'react';
import * as Y from 'yjs';

const MSG_SYNC = 0;

function frameSync(update: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(update.length + 1);
  out[0] = MSG_SYNC;
  out.set(update, 1);
  return out.buffer;
}

export function usePageRoom(pageId: string): { doc: Y.Doc; connected: boolean } {
  const [doc] = useState<Y.Doc>(() => {
    const next = new Y.Doc();
    next.getText('content');
    return next;
  });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!pageId) {
      setConnected(false);
      return;
    }

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(
      `${proto}://${location.host}/api/pages/${encodeURIComponent(pageId)}/room`,
    );
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      setConnected(true);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(frameSync(Y.encodeStateAsUpdate(doc)));
      }
    };

    ws.onmessage = (event: MessageEvent<ArrayBuffer | string>) => {
      const raw =
        typeof event.data === 'string'
          ? new TextEncoder().encode(event.data)
          : new Uint8Array(event.data);
      if (raw.length > 0 && raw[0] === MSG_SYNC) {
        Y.applyUpdate(doc, raw.slice(1));
      }
    };

    ws.onclose = () => setConnected(false);

    const onUpdate = (update: Uint8Array) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(frameSync(update));
    };
    doc.on('update', onUpdate);

    return () => {
      doc.off('update', onUpdate);
      ws.close();
    };
  }, [pageId, doc]);

  return { doc, connected };
}