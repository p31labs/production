import { describe, it, expect, vi } from 'vitest';
import { createWsMeta, handleWsMessage, parseWsMessage } from '../../../../workers/p31-passport/src/ws-protocol';

function makeSocket() {
  const sent: string[] = [];
  let attachment: unknown = null;
  return {
    sent,
    socket: {
      send: (data: string) => {
        sent.push(data);
      },
      serializeAttachment: (value: unknown) => {
        attachment = value;
      },
      deserializeAttachment: () => attachment,
    },
    attachment: () => attachment,
  };
}

describe('ws-protocol (Track A.4 hibernation protocol)', () => {
  it('parses a JSON string message', () => {
    expect(parseWsMessage('{"type":"ping"}')).toEqual({ type: 'ping' });
    expect(parseWsMessage('{"type":"echo","data":42}')).toEqual({ type: 'echo', data: 42 });
  });

  it('parses an ArrayBuffer message', () => {
    const buf = new TextEncoder().encode('{"type":"ping"}').buffer;
    expect(parseWsMessage(buf)).toEqual({ type: 'ping' });
  });

  it('returns null for invalid or non-protocol payloads', () => {
    expect(parseWsMessage('not json')).toBeNull();
    expect(parseWsMessage('{"no":"type"}')).toBeNull();
  });

  it('replies pong to ping', () => {
    const { socket, sent } = makeSocket();
    handleWsMessage('{"type":"ping"}', socket, { now: () => 123 });
    expect(JSON.parse(sent[0])).toEqual({ type: 'pong', ts: 123 });
  });

  it('echoes data back', () => {
    const { socket, sent } = makeSocket();
    handleWsMessage('{"type":"echo","data":{"hello":"world"}}', socket);
    expect(JSON.parse(sent[0])).toEqual({ type: 'echo', data: { hello: 'world' } });
  });

  it('marks the socket subscribed and acknowledges', () => {
    const { socket, sent, attachment } = makeSocket();
    handleWsMessage('{"type":"subscribe"}', socket, { now: () => 5 });
    expect(JSON.parse(sent[0])).toEqual({ type: 'subscribed', ts: 5 });
    const meta = attachment() as { connectedAt: number; subscribed: boolean };
    expect(meta).toEqual({ connectedAt: 5, subscribed: true });
  });

  it('keeps an existing connection meta when subscribing', () => {
    const { socket, attachment } = makeSocket();
    socket.serializeAttachment({ connectedAt: 99, subscribed: false });
    handleWsMessage('{"type":"subscribe"}', socket);
    const meta = attachment() as { connectedAt: number; subscribed: boolean };
    expect(meta).toEqual({ connectedAt: 99, subscribed: true });
  });

  it('sends status via the handler when requested', () => {
    const { socket, sent } = makeSocket();
    handleWsMessage('{"type":"status"}', socket, {
      now: () => 7,
      onStatus: () => ({ builds: [{ id: 'b1', status: 'complete' }] }),
    });
    expect(JSON.parse(sent[0])).toEqual({
      type: 'status',
      ts: 7,
      builds: [{ id: 'b1', status: 'complete' }],
    });
  });

  it('reports invalid and unsupported messages', () => {
    const a = makeSocket();
    handleWsMessage('garbage', a.socket);
    expect(JSON.parse(a.sent[0])).toEqual({ type: 'error', error: 'invalid message' });

    const b = makeSocket();
    handleWsMessage('{"type":"nope"}', b.socket, { now: () => 1 });
    expect(JSON.parse(b.sent[0])).toEqual({ type: 'error', error: 'unsupported: nope' });
  });

  it('createWsMeta defaults subscribed to false', () => {
    expect(createWsMeta(42)).toEqual({ connectedAt: 42, subscribed: false });
  });

  it('createWsMeta carries the passportId through', () => {
    expect(createWsMeta(42, 'smoke')).toEqual({ connectedAt: 42, subscribed: false, passportId: 'smoke' });
  });

  it('does not send when protocol dispatch has no reply', () => {
    const { socket, sent } = makeSocket();
    const spy = vi.spyOn(socket, 'send');
    handleWsMessage('{"type":"subscribe"}', socket);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(1);
  });
});