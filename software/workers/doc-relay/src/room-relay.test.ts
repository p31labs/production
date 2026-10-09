/**
 * y-websocket relay protocol tests — exercise RoomRelay against the same
 * client frames the `y-websocket` WebsocketProvider sends, with a fake peer.
 */

import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import {
  RoomRelay,
  messageSync,
  messageAwareness,
  messageQueryAwareness,
} from './room-relay';

class FakePeer {
  sent: Uint8Array[] = [];
  send(data: Uint8Array): void {
    this.sent.push(data);
  }
}

function clientSyncStep1(doc: Y.Doc): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, doc);
  return encoding.toUint8Array(encoder);
}

function clientSyncUpdate(update: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  return encoding.toUint8Array(encoder);
}

describe('RoomRelay sync protocol', () => {
  it('answers a client syncStep1 with the state the client is missing', () => {
    const server = new Y.Doc({ gc: true });
    server.getText('content').insert(0, 'hello from server');
    const relay = new RoomRelay(server);

    const client = new Y.Doc();
    const peer = new FakePeer();
    relay.handleMessage(peer, clientSyncStep1(client));

    expect(peer.sent).toHaveLength(1);
    const decoder = decoding.createDecoder(peer.sent[0]);
    expect(decoding.readVarUint(decoder)).toBe(messageSync);
    expect(decoding.readVarUint(decoder)).toBe(syncProtocol.messageYjsSyncStep2);
    const update = decoding.readVarUint8Array(decoder);
    Y.applyUpdate(client, update);
    expect(client.getText('content').toString()).toBe('hello from server');
  });

  it('applies a client update to the room doc and emits a broadcast update', () => {
    const relay = new RoomRelay(new Y.Doc({ gc: true }));
    const captured: Uint8Array[] = [];
    relay.doc.on('update', (update: Uint8Array) => captured.push(update));

    const client = new Y.Doc();
    client.getText('content').insert(0, 'client edit');
    const peer = new FakePeer();
    relay.handleMessage(peer, clientSyncUpdate(Y.encodeStateAsUpdate(client)));

    expect(relay.doc.getText('content').toString()).toBe('client edit');
    expect(captured.length).toBeGreaterThan(0);
  });

  it('two clients synchronise through the shared room state', () => {
    const relay = new RoomRelay(new Y.Doc({ gc: true }));

    // Alice writes content.
    const alice = new Y.Doc();
    alice.getText('content').insert(0, 'alice text');
    relay.handleMessage(new FakePeer(), clientSyncUpdate(Y.encodeStateAsUpdate(alice)));

    // Bob connects fresh and asks for the state.
    const bob = new Y.Doc();
    const bobPeer = new FakePeer();
    relay.handleMessage(bobPeer, clientSyncStep1(bob));
    const decoder = decoding.createDecoder(bobPeer.sent[0]);
    expect(decoding.readVarUint(decoder)).toBe(messageSync);
    expect(decoding.readVarUint(decoder)).toBe(syncProtocol.messageYjsSyncStep2);
    Y.applyUpdate(bob, decoding.readVarUint8Array(decoder));
    expect(bob.getText('content').toString()).toBe('alice text');
  });
});

describe('RoomRelay awareness protocol', () => {
  it('applies awareness updates and answers a query with the states', () => {
    const relay = new RoomRelay(new Y.Doc({ gc: true }));

    const alice = new awarenessProtocol.Awareness(new Y.Doc());
    alice.setLocalState({ user: { name: 'alice', color: '#00ff00' } });
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, messageAwareness);
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(alice, [alice.clientID]),
    );
    relay.handleMessage(new FakePeer(), encoding.toUint8Array(enc));

    // The relay awareness also carries its own local {} state (it is a peer
    // too); assert alice's presence specifically.
    expect(relay.awareness.getStates().get(alice.clientID)).toMatchObject({
      user: { name: 'alice' },
    });

    const qPeer = new FakePeer();
    const qEnc = encoding.createEncoder();
    encoding.writeVarUint(qEnc, messageQueryAwareness);
    relay.handleMessage(qPeer, encoding.toUint8Array(qEnc));

    expect(qPeer.sent).toHaveLength(1);
    const decoder = decoding.createDecoder(qPeer.sent[0]);
    expect(decoding.readVarUint(decoder)).toBe(messageAwareness);
    const update = decoding.readVarUint8Array(decoder);

    const bob = new awarenessProtocol.Awareness(new Y.Doc());
    awarenessProtocol.applyAwarenessUpdate(bob, update, null);
    expect(bob.getStates().get(alice.clientID)).toMatchObject({ user: { name: 'alice' } });
  });
});