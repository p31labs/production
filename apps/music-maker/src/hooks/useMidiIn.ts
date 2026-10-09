/**
 * useMidiIn — Web MIDI input with the current permission flow.
 *
 * Research (2026-09): Chrome now requires a user permission prompt for
 * standard MIDI interaction (not just SysEx). The prompt fires on the first
 * requestMIDIAccess() call; a refusal rejects with SecurityError. The Web
 * MIDI API exposes MIDI 1.0 messages only — MIDI 2.0 UMP is NOT exposed to
 * JavaScript (Chrome 152's change was a macOS backend refactor). This hook
 * feature-detects, requests on first enable (never on mount), and surfaces
 * the honest state — including "unsupported" and "denied" — so the UI never
 * shows a fake green dot.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type MidiState = 'unsupported' | 'idle' | 'requesting' | 'granted' | 'denied';

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
}

export interface MidiMessage {
  /** Raw status byte. */
  status: number;
  /** MIDI channel 0..15. */
  channel: number;
  /** The message type (0x9 = note on, 0x8 = note off, 0xb = CC). */
  kind: 'noteOn' | 'noteOff' | 'cc' | 'pitchBend' | 'other';
  data1: number;
  data2: number;
}

export interface MidiInApi {
  state: MidiState;
  devices: MidiDevice[];
  /** Enable MIDI — triggers the permission prompt. Call from a user gesture. */
  enable: () => Promise<void>;
  /** Every incoming message, dispatched to this handler. */
  onMessage: (handler: (msg: MidiMessage) => void) => () => void;
}

function decode(data: Uint8Array): MidiMessage | null {
  if (data.length < 2) return null;
  const status = data[0];
  const type = status & 0xf0;
  const channel = status & 0x0f;
  const data1 = data[1] ?? 0;
  const data2 = data[2] ?? 0;
  let kind: MidiMessage['kind'] = 'other';
  if (type === 0x90 && data2 > 0) kind = 'noteOn';
  else if (type === 0x80 || (type === 0x90 && data2 === 0)) kind = 'noteOff';
  else if (type === 0xb0) kind = 'cc';
  else if (type === 0xe0) kind = 'pitchBend';
  return { status, channel, kind, data1, data2 };
}

export function useMidiIn(): MidiInApi {
  const supported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  const [state, setState] = useState<MidiState>(supported ? 'idle' : 'unsupported');
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const accessRef = useRef<MIDIAccess | null>(null);
  const handlersRef = useRef(new Set<(msg: MidiMessage) => void>());

  const bindInputs = useCallback((access: MIDIAccess) => {
    const list: MidiDevice[] = [];
    access.inputs.forEach((input) => {
      list.push({ id: input.id, name: input.name ?? 'Unknown device', manufacturer: input.manufacturer ?? '' });
      input.onmidimessage = (ev: MIDIMessageEvent) => {
        if (!ev.data) return;
        const msg = decode(ev.data);
        if (msg) for (const h of handlersRef.current) h(msg);
      };
    });
    setDevices(list);
  }, []);

  const enable = useCallback(async () => {
    if (!supported || state === 'requesting' || state === 'granted') return;
    setState('requesting');
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      accessRef.current = access;
      bindInputs(access);
      access.onstatechange = () => bindInputs(access);
      setState('granted');
    } catch {
      // SecurityError = the user (or policy) refused. Surface it honestly.
      setState('denied');
    }
  }, [supported, state, bindInputs]);

  useEffect(() => {
    return () => {
      accessRef.current?.inputs.forEach((input) => {
        input.onmidimessage = null;
      });
    };
  }, []);

  const onMessage = useCallback((handler: (msg: MidiMessage) => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return { state, devices, enable, onMessage };
}