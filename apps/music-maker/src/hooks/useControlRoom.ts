/**
 * useControlRoom — the browser's connection to the ControlRoom DO.
 *
 * Responsibilities:
 *   • Open the /control/ui WS, reconnect with capped exponential backoff.
 *   • Reconcile the connect snapshot into the mappings state.
 *   • Commit a mapping/patch through the WS, awaiting the ack.
 *   • Arm a learn (ephemeral learn-arm — the DAW convention: the next CC
 *     resolves it) and commit the resolved mapping.
 *   • Send ephemeral control moves at the gesture rate.
 *   • Surface backpressure and frame-rejected frames honestly — never
 *     swallow them.
 *
 * The hook holds no routing truth of its own: the snapshot from the DO is
 * the fold, and every commit is echoed back. Local state is a view.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyMappingClear,
  applyMappingSet,
  type ControlFrame,
  type Mapping,
} from '../lib/router';

export type ConnectionState = 'connecting' | 'open' | 'closed' | 'error';

export interface ControlRoomState {
  connection: ConnectionState;
  mappings: Mapping[];
  patches: unknown[];
  /** The last structured error (a refusal or a backpressure drop). */
  lastError: { code: string; message: string } | null;
  /** The number of backpressure drops since connect — surfaced, not hidden. */
  dropCount: number;
}

export interface ControlRoomApi extends ControlRoomState {
  /** Commit a mapping.set. Resolves on ack; rejects on a structured refusal. */
  setMapping: (source: string, destination: string, mapping?: Record<string, unknown>) => Promise<void>;
  /** Commit a mapping.clear. */
  clearMapping: (source: string, destination: string) => Promise<void>;
  /** Commit a patch.set. */
  setPatch: (engine: string, params: Record<string, number | string>) => Promise<void>;
  /** Arm a learn for a control — EPHEMERAL. The next physical CC binds it. */
  armLearn: (controlId: string) => void;
  /** Disarm a learn (gesture ended with no CC). */
  disarmLearn: (controlId: string) => void;
  /** Send an ephemeral control move (the 60Hz path). Never awaited. */
  sendMove: (source: string, value: number, cc?: number) => void;
}

function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/control/ui`;
}

export function useControlRoom(): ControlRoomApi {
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [patches, setPatches] = useState<unknown[]>([]);
  const [lastError, setLastError] = useState<{ code: string; message: string } | null>(null);
  const [dropCount, setDropCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Map<string, { resolve: () => void; reject: (e: Error) => void }>>(new Map());
  const backoffRef = useRef(1000);
  /** The pending reconnect timer — cleared on unmount so a stale reconnect
   *  can't open a new socket after the hook is gone (gap #4). */
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUnmount = useRef(false);

  const send = useCallback((payload: unknown) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(payload));
    return true;
  }, []);

  const connect = useCallback(() => {
    setConnection('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl());
    } catch {
      setConnection('error');
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      setConnection('open');
      backoffRef.current = 1000;
    };

    ws.onmessage = (ev) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      switch (msg.type) {
        case 'control-snapshot':
          setMappings((msg.mappings as Mapping[]) ?? []);
          setPatches((msg.patches as unknown[]) ?? []);
          break;
        case 'mapping.set':
          setMappings((prev) =>
            applyMappingSet(prev, {
              source: String(msg.source),
              destination: String(msg.destination),
              mapping: (msg.mapping as Record<string, unknown>) ?? {},
            }),
          );
          break;
        case 'mapping.clear':
          setMappings((prev) =>
            applyMappingClear(prev, {
              source: String(msg.source),
              destination: String(msg.destination),
            }),
          );
          break;
        case 'patch.set':
          setPatches((prev) => [...prev, msg]);
          break;
        case 'control-ack': {
          const id = String(msg.requestId ?? '');
          const pending = pendingRef.current.get(id);
          if (pending) {
            pendingRef.current.delete(id);
            if (msg.valid) pending.resolve();
            else pending.reject(new Error(String(msg.error ?? 'commit refused')));
          }
          break;
        }
        case 'backpressure':
          setDropCount((n) => n + 1);
          setLastError({ code: 'BACKPRESSURE', message: 'control moves are being dropped — the 60Hz budget is exhausted' });
          break;
        case 'frame-rejected':
          setLastError({ code: 'FRAME_REJECTED', message: String(msg.error ?? 'frame rejected') });
          break;
        default:
          break;
      }
    };

    ws.onclose = () => {
      setConnection('closed');
      if (closedByUnmount.current) return;
      const delay = Math.min(backoffRef.current, 15000);
      backoffRef.current = Math.min(backoffRef.current * 2, 15000);
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => setConnection('error');
  }, []);

  useEffect(() => {
    closedByUnmount.current = false;
    connect();
    return () => {
      closedByUnmount.current = true;
      // A reconnect already scheduled before unmount must not open a socket
      // after the hook is gone (gap #4).
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const commit = useCallback(
    (input: Record<string, unknown>): Promise<void> =>
      new Promise((resolve, reject) => {
        const requestId = `req-${Math.random().toString(36).slice(2)}`;
        pendingRef.current.set(requestId, { resolve, reject });
        const ok = send({ requestId, input });
        if (!ok) {
          pendingRef.current.delete(requestId);
          reject(new Error('control room is not connected'));
          return;
        }
        setTimeout(() => {
          if (pendingRef.current.delete(requestId)) {
            reject(new Error('commit timed out'));
          }
        }, 10000);
      }),
    [send],
  );

  const setMapping = useCallback(
    (source: string, destination: string, mapping: Record<string, unknown> = {}) =>
      commit({ writer: 'human', kind: 'control.mapping.set', source, destination, mapping }),
    [commit],
  );

  const clearMapping = useCallback(
    (source: string, destination: string) =>
      commit({ writer: 'human', kind: 'control.mapping.clear', source, destination }),
    [commit],
  );

  const setPatch = useCallback(
    (engine: string, params: Record<string, number | string>) =>
      commit({ writer: 'human', kind: 'control.patch.set', engine, params }),
    [commit],
  );

  // Ephemeral learn-arm: the DAW convention. The next physical CC the DO sees
  // resolves the bind; there is no committed intent for the arm itself.
  const armLearn = useCallback(
    (controlId: string) => {
      send({ type: 'learn-arm', controlId });
    },
    [send],
  );

  const disarmLearn = useCallback(
    (controlId: string) => {
      // A real disarm: clears the DO's arm so a later, unrelated CC can't
      // fire a binding the user already moved on from.
      send({ type: 'learn-disarm', controlId });
    },
    [send],
  );

  const sendMove = useCallback(
    (source: string, value: number, cc?: number) => {
      const frame: ControlFrame = { type: 'control', source, value, ...(cc !== undefined ? { cc } : {}) };
      send(frame);
    },
    [send],
  );

  // Test hook: in the E2E build, expose the commit API on window so Playwright
  // can seed a mapping the same way a physical CC would, then assert it
  // survives a reload. No-op in production builds (MODE is 'test' only in
  // vite build --mode test / Playwright).
  useEffect(() => {
    if (import.meta.env.MODE !== 'test') return;
    (window as unknown as { __controlRoom?: Pick<ControlRoomApi, 'setMapping' | 'clearMapping' | 'armLearn' | 'disarmLearn'> }).__controlRoom = {
      setMapping,
      clearMapping,
      armLearn,
      disarmLearn,
    };
    return () => {
      delete (window as unknown as { __controlRoom?: unknown }).__controlRoom;
    };
  }, [setMapping, clearMapping, armLearn, disarmLearn]);

  return {
    connection,
    mappings,
    patches,
    lastError,
    dropCount,
    setMapping,
    clearMapping,
    setPatch,
    armLearn,
    disarmLearn,
    sendMove,
  };
}