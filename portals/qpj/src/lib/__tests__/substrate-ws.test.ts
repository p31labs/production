import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSubstrateSocket } from '../substrate-ws';

type Listener = (event: { type: string; data?: unknown }) => void;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  url: string;
  listeners: Record<string, Listener[]> = {};
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, cb: Listener) {
    (this.listeners[type] ??= []).push(cb);
  }

  removeEventListener(type: string, cb: Listener) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((f) => f !== cb);
  }

  emit(type: string, data?: unknown) {
    for (const cb of this.listeners[type] ?? []) cb({ type, data });
  }

  send(data: string) {
    this.sent.push(data);
  }

  open() {
    this.readyState = 1;
    this.emit('open');
  }

  message(data: string) {
    this.emit('message', data);
  }

  close() {
    this.readyState = 3;
    this.emit('close');
  }
}

const WS_URL = 'wss://p31-dispatch.example.workers.dev/ws?passportId=dillpickle';

describe('substrate-ws', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('connects to the ws URL', () => {
    createSubstrateSocket({ wsUrl: WS_URL, onBuildUpdate: () => {} });
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe(WS_URL);
  });

  it('subscribes on open', () => {
    const socket = createSubstrateSocket({ wsUrl: WS_URL, onBuildUpdate: () => {} });
    const ws = FakeWebSocket.instances[0];
    ws.open();
    expect(ws.sent).toEqual([JSON.stringify({ type: 'subscribe' })]);
    expect(socket.isConnected()).toBe(true);
  });

  it('routes buildUpdated messages to the callback', () => {
    const onBuildUpdate = vi.fn();
    const socket = createSubstrateSocket({ wsUrl: WS_URL, onBuildUpdate });
    const ws = FakeWebSocket.instances[0];
    ws.message('{"type":"buildUpdated","buildId":"b1","status":"complete","artifactKey":"k1"}');
    expect(onBuildUpdate).toHaveBeenCalledWith({
      type: 'buildUpdated',
      buildId: 'b1',
      status: 'complete',
      artifactKey: 'k1',
    });
    expect(socket.isConnected()).toBe(false);
  });

  it('ignores malformed and non-object messages', () => {
    const onBuildUpdate = vi.fn();
    const onSocketMessage = vi.fn();
    createSubstrateSocket({ wsUrl: WS_URL, onBuildUpdate, onSocketMessage });
    const ws = FakeWebSocket.instances[0];
    ws.message('not json');
    ws.message('{"type":42}');
    expect(onBuildUpdate).not.toHaveBeenCalled();
    expect(onSocketMessage).not.toHaveBeenCalled();
  });

  it('reconnects with backoff after an unexpected close', () => {
    const socket = createSubstrateSocket({ wsUrl: WS_URL, onBuildUpdate: () => {} });
    FakeWebSocket.instances[0].close();
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(FakeWebSocket.instances[1].url).toBe(WS_URL);

    FakeWebSocket.instances[1].close();
    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(3);

    socket.close();
  });

  it('does not reconnect after close() cleanup', () => {
    const socket = createSubstrateSocket({ wsUrl: WS_URL, onBuildUpdate: () => {} });
    socket.close();
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('does not reconnect while shouldReconnect is false', () => {
    createSubstrateSocket({ wsUrl: WS_URL, onBuildUpdate: () => {}, shouldReconnect: () => false });
    FakeWebSocket.instances[0].close();
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('resets the backoff on successful reconnect', () => {
    const socket = createSubstrateSocket({ wsUrl: WS_URL, onBuildUpdate: () => {} });
    FakeWebSocket.instances[0].close();
    vi.advanceTimersByTime(1000);
    FakeWebSocket.instances[1].open();
    FakeWebSocket.instances[1].close();
    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(3);
    socket.close();
  });

  it('send returns true only while open', () => {
    const socket = createSubstrateSocket({ wsUrl: WS_URL, onBuildUpdate: () => {} });
    const ws = FakeWebSocket.instances[0];
    expect(socket.send('{ "a": 1 }')).toBe(false);
    ws.open();
    expect(socket.send('{ "a": 1 }')).toBe(true);
    expect(ws.sent[1]).toBe('{ "a": 1 }');
  });

  it('serializes non-string sends', () => {
    const socket = createSubstrateSocket({ wsUrl: WS_URL, onBuildUpdate: () => {} });
    FakeWebSocket.instances[0].open();
    socket.send({ type: 'ping' });
    expect(FakeWebSocket.instances[0].sent[1]).toBe('{"type":"ping"}');
  });

  it('is a safe no-op when WebSocket is unavailable', () => {
    vi.unstubAllGlobals();
    const socket = createSubstrateSocket({ wsUrl: WS_URL, onBuildUpdate: () => {} });
    expect(socket.isConnected()).toBe(false);
    expect(socket.send({ type: 'ping' })).toBe(false);
    socket.close();
    expect(FakeWebSocket.instances).toHaveLength(0);
  });
});