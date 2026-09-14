export interface BuildUpdate {
  type: 'buildUpdated';
  buildId: string;
  status: string;
  artifactKey?: string;
}

export interface SubstrateSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface SubstrateSocketOptions {
  wsUrl: string;
  onBuildUpdate: (update: BuildUpdate) => void;
  onSocketMessage?: (message: SubstrateSocketMessage) => void;
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
  shouldReconnect?: () => boolean;
}

export interface SubstrateSocketHandle {
  close: () => void;
  isConnected: () => boolean;
  send: (data: unknown) => boolean;
}

const OPEN = 1;
const DEFAULT_RECONNECT_BASE_MS = 1000;
const DEFAULT_RECONNECT_MAX_MS = 30_000;

export function createSubstrateSocket(options: SubstrateSocketOptions): SubstrateSocketHandle {
  const {
    wsUrl,
    onBuildUpdate,
    onSocketMessage,
    reconnectBaseMs = DEFAULT_RECONNECT_BASE_MS,
    reconnectMaxMs = DEFAULT_RECONNECT_MAX_MS,
    shouldReconnect = () => true,
  } = options;

  let ws: WebSocket | null = null;
  let attempts = 0;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleReconnect = () => {
    if (closed || !shouldReconnect()) return;
    const delay = Math.min(reconnectMaxMs, reconnectBaseMs * 2 ** attempts);
    attempts += 1;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, delay);
  };

  function connect(): void {
    if (closed) return;
    const Socket = globalThis.WebSocket;
    if (!Socket) return;
    try {
      ws = new Socket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }
    ws.addEventListener('open', () => {
      attempts = 0;
      ws?.send(JSON.stringify({ type: 'subscribe' }));
    });
    ws.addEventListener('message', (event) => {
      const data = (event as MessageEvent).data;
      if (typeof data !== 'string') return;
      let parsed: SubstrateSocketMessage | null;
      try {
        parsed = JSON.parse(data) as SubstrateSocketMessage;
      } catch {
        return;
      }
      if (parsed === null || typeof parsed.type !== 'string') return;
      if (parsed.type === 'buildUpdated') {
        onBuildUpdate(parsed as unknown as BuildUpdate);
      }
      onSocketMessage?.(parsed);
    });
    ws.addEventListener('close', () => {
      if (closed) return;
      scheduleReconnect();
    });
    ws.addEventListener('error', () => {
      try {
        ws?.close();
      } catch {
        /* already closing */
      }
    });
  }

  connect();

  return {
    close: () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {
        /* ignored */
      }
      ws = null;
    },
    isConnected: () => ws?.readyState === OPEN,
    send: (data: unknown) => {
      if (ws?.readyState !== OPEN) return false;
      ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    },
  };
}