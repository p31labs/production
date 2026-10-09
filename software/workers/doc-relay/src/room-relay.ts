/**
 * @file room-relay.ts — y-websocket server protocol for one room.
 *
 * Independent of the Cloudflare WebSocket runtime so it can be unit-tested
 * against a fake peer. Wire format per the y-protocols spec:
 *
 *   frame = [messageType varUint, payload]
 *   messageSync (0)        → inner sync step1/step2/update via readSyncMessage.
 *                             A client syncStep1 is answered with syncStep2
 *                             (the state the client is missing). Updates are
 *                             applied to the room doc and the resulting doc
 *                             'update' event is broadcast by the owner.
 *   messageAwareness (1)   → applied to room awareness, re-broadcast by owner.
 *   messageQueryAwareness (3) → answered with the current awareness states.
 *   messageAuth (2)        → denied (no auth configured on this relay).
 */

import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as authProtocol from 'y-protocols/auth';

export const messageSync = 0;
export const messageAwareness = 1;
export const messageAuth = 2;
export const messageQueryAwareness = 3;

export interface RelayPeer {
  send(data: Uint8Array): void;
}

export class RoomRelay {
  readonly doc: Y.Doc;
  readonly awareness: awarenessProtocol.Awareness;

  constructor(doc?: Y.Doc) {
    this.doc = doc ?? new Y.Doc({ gc: true });
    this.awareness = new awarenessProtocol.Awareness(this.doc);
  }

  /** Handles one incoming frame from `peer`. Direct responses go to `peer`. */
  handleMessage(peer: RelayPeer, buffer: Uint8Array): void {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(buffer);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync: {
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, this.doc, peer);
        const response = encoding.toUint8Array(encoder);
        if (response.length > 1) peer.send(response);
        break;
      }
      case messageQueryAwareness: {
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(
            this.awareness,
            Array.from(this.awareness.getStates().keys()),
          ),
        );
        peer.send(encoding.toUint8Array(encoder));
        break;
      }
      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(
          this.awareness,
          decoding.readVarUint8Array(decoder),
          peer,
        );
        break;
      }
      case messageAuth: {
        const denied = encoding.createEncoder();
        authProtocol.writePermissionDenied(
          denied,
          'authentication is not configured on this relay',
        );
        peer.send(encoding.toUint8Array(denied));
        break;
      }
      default:
        break;
    }
  }

  /** A syncUpdate frame broadcasting `update` to every connected peer. */
  static encodeSyncUpdate(update: Uint8Array): Uint8Array {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    return encoding.toUint8Array(encoder);
  }

  /** An awareness frame for the given client ids. */
  static encodeAwareness(awareness: awarenessProtocol.Awareness, clients: number[]): Uint8Array {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, clients),
    );
    return encoding.toUint8Array(encoder);
  }
}