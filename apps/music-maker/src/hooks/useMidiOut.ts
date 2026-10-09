/**
 * useMidiOut — Web MIDI output.
 *
 * Shares the permission grant with useMidiIn when both are active: Web MIDI's
 * permission is per-origin, so the second requestMIDIAccess() resolves
 * without a second prompt. This hook requests independently so it works when
 * only output is needed.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface MidiOutApi {
  supported: boolean;
  outputs: { id: string; name: string }[];
  selectedId: string | null;
  select: (id: string | null) => void;
  /** Send a raw MIDI message. */
  send: (bytes: number[]) => void;
  noteOn: (channel: number, note: number, velocity: number) => void;
  noteOff: (channel: number, note: number) => void;
  cc: (channel: number, controller: number, value: number) => void;
}

export function useMidiOut(): MidiOutApi {
  const supported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  const [outputs, setOutputs] = useState<{ id: string; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const accessRef = useRef<MIDIAccess | null>(null);

  const ensureAccess = useCallback(async (): Promise<MIDIAccess | null> => {
    if (!supported) return null;
    if (accessRef.current) return accessRef.current;
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      accessRef.current = access;
      const list: { id: string; name: string }[] = [];
      access.outputs.forEach((o) => list.push({ id: o.id, name: o.name ?? 'Unknown' }));
      setOutputs(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
      return access;
    } catch {
      return null;
    }
  }, [supported, selectedId]);

  // Kick the access request lazily so the output list is ready when the panel
  // opens (permission still requires a user gesture on first enable).
  useEffect(() => {
    if (supported) void ensureAccess();
  }, [supported, ensureAccess]);

  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id);
    },
    [],
  );

  const send = useCallback(
    (bytes: number[]) => {
      const access = accessRef.current;
      if (!access || !selectedId) return;
      const out = access.outputs.get(selectedId);
      out?.send(bytes);
    },
    [selectedId],
  );

  const noteOn = useCallback(
    (channel: number, note: number, velocity: number) => {
      send([0x90 | (channel & 0x0f), note & 0x7f, velocity & 0x7f]);
    },
    [send],
  );

  const noteOff = useCallback(
    (channel: number, note: number) => {
      send([0x80 | (channel & 0x0f), note & 0x7f, 0]);
    },
    [send],
  );

  const cc = useCallback(
    (channel: number, controller: number, value: number) => {
      send([0xb0 | (channel & 0x0f), controller & 0x7f, value & 0x7f]);
    },
    [send],
  );

  return { supported, outputs, selectedId, select, send, noteOn, noteOff, cc };
}