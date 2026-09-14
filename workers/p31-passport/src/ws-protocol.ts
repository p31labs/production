export interface WsSocketLike {
  send(data: string): void;
  serializeAttachment(attachment: unknown): void;
  deserializeAttachment(): unknown;
}

export interface WsMeta {
  connectedAt: number;
  subscribed: boolean;
  passportId?: string;
}

export interface WsMessageHandlers {
  now?: () => number;
  onStatus?: () => Record<string, unknown>;
}

export function createWsMeta(now: number, passportId?: string): WsMeta {
  return { connectedAt: now, subscribed: false, passportId };
}

export function parseWsMessage(raw: string | ArrayBuffer): { type: string; data?: unknown } | null {
  const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
  try {
    const parsed = JSON.parse(text) as { type?: unknown; data?: unknown };
    if (typeof parsed?.type !== 'string' || !parsed.type) return null;
    return { type: parsed.type, data: parsed.data };
  } catch {
    return null;
  }
}

export function handleWsMessage(
  raw: string | ArrayBuffer,
  socket: WsSocketLike,
  handlers: WsMessageHandlers = {},
): void {
  const parsed = parseWsMessage(raw);
  if (!parsed) {
    socket.send(JSON.stringify({ type: 'error', error: 'invalid message' }));
    return;
  }
  const now = handlers.now ?? Date.now;
  switch (parsed.type) {
    case 'ping':
      socket.send(JSON.stringify({ type: 'pong', ts: now() }));
      break;
    case 'echo':
      socket.send(JSON.stringify({ type: 'echo', data: parsed.data }));
      break;
    case 'subscribe': {
      const meta = (socket.deserializeAttachment() as WsMeta | null) ?? createWsMeta(now());
      meta.subscribed = true;
      socket.serializeAttachment(meta);
      socket.send(JSON.stringify({ type: 'subscribed', ts: now() }));
      break;
    }
    case 'status':
      socket.send(JSON.stringify({ type: 'status', ts: now(), ...handlers.onStatus?.() }));
      break;
    default:
      socket.send(JSON.stringify({ type: 'error', error: `unsupported: ${parsed.type}` }));
  }
}