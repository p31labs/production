/**
 * ControlSurface — the three-column control server UI.
 *
 *   Sources │ Rack │ Matrix
 *
 * Composes from @p31ca/controls primitives and the canon suite.css vocabulary.
 * Every control has an ARIA slider role and a full keyboard contract; every
 * learn affordance uses the amber→green transition; every commit shows its
 * structured refusal instead of failing silently.
 *
 * The Matrix is INTERACTIVE: clicking a destination row arms its learn (the
 * amber ring); the next physical CC the DO sees binds it (green). This is
 * the DAW convention — arm a control, move the knob.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Knob, Fader, Switch, type LearnState } from '@p31ca/controls';
import { useControlRoom } from '../hooks/useControlRoom';
import { useMidiIn } from '../hooks/useMidiIn';
import { useMidiOut } from '../hooks/useMidiOut';
import { PolySynth } from '../audio/voices/PolySynth';
import { NoiseMachine } from '../audio/voices/NoiseMachine';
import { DrumKit } from '../audio/voices/DrumKit';
import {
  POLYSYNTH_DESTINATIONS,
  NOISEMACHINE_DESTINATIONS,
  DRUMKIT_DESTINATIONS,
  MIDI_OUT_DESTINATIONS,
  WLED_DESTINATIONS,
  destinationLabel,
} from '../lib/controlRegistry';
import './control.css';

type RackTab = 'synth' | 'lights' | 'midi';

/** The parameter a destination addresses — the `controlId` the learn keys. */
function controlIdFor(destination: string): string {
  return destination.replace(/^synth:param-/, '').replace(/^wled:seg-/, 'wled-').replace(/^midi:out-/, 'midi-');
}

export function ControlSurface() {
  const room = useControlRoom();
  const midiIn = useMidiIn();
  const midiOut = useMidiOut();

  const [tab, setTab] = useState<RackTab>('synth');
  const [armed, setArmed] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, number>>(() => {
    const seed: Record<string, number> = {};
    for (const d of [...POLYSYNTH_DESTINATIONS, ...NOISEMACHINE_DESTINATIONS]) seed[d] = 0.5;
    for (const d of WLED_DESTINATIONS) seed[d] = 0.5;
    return seed;
  });
  // Sound opt-in — the §1.1 floor. The voices (PolySynth/NoiseMachine/DrumKit)
  // are created only inside the toggle's user-gesture handler, never on mount,
  // and routed through a master ceiling gain (the same discipline the spatial
  // engine uses). Muted every session by default.
  const [soundOn, setSoundOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const voicesRef = useRef<{ poly: PolySynth | null; noise: NoiseMachine | null; drum: DrumKit | null }>({ poly: null, noise: null, drum: null });

  const toggleSound = useCallback(() => {
    if (soundOn) {
      // Turning OFF: suspend the context; the voices stay wired but silent.
      void ctxRef.current?.suspend();
      setSoundOn(false);
      return;
    }
    // Turning ON — this call IS the user gesture; create the graph here.
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!ctxRef.current) {
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = 0.6; // the hard ceiling
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.knee.value = 20;
      comp.ratio.value = 6;
      master.connect(comp).connect(ctx.destination);
      const voices = {
        poly: new PolySynth(ctx, master),
        noise: new NoiseMachine(ctx, master),
        drum: new DrumKit(ctx, master),
      };
      ctxRef.current = ctx;
      masterRef.current = master;
      voicesRef.current = voices;
    }
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume();
    setSoundOn(true);
  }, [soundOn]);

  // Incoming MIDI CC: forward EVERY CC as a control frame. The DO owns the
  // learn resolution (an armed control binds on the first CC) and the routing
  // (a bound source drives its destination) — the UI does not resolve learns
  // locally. Clearing `armed` on any CC ends the arm display whether or not
  // the DO bound it (the gesture is done; the DO's arm already fired).
  useEffect(() => {
    const off = midiIn.onMessage((msg) => {
      if (msg.kind !== 'cc') return;
      const source = `midi:in-${msg.channel}`;
      const value = msg.data2 / 127;
      room.sendMove(source, value, msg.data1);
      if (armed) setArmed(null);
    });
    return off;
  }, [midiIn, armed, room]);

  const armLearn = useCallback(
    (destination: string) => {
      const controlId = controlIdFor(destination);
      setArmed(controlId);
      room.armLearn(controlId);
    },
    [room],
  );

  const learnStateFor = useCallback(
    (destination: string): LearnState => {
      const controlId = controlIdFor(destination);
      if (armed === controlId) return 'learning';
      const bound = room.mappings.find((m) => m.destination === destination);
      return bound ? 'bound' : 'idle';
    },
    [armed, room.mappings],
  );

  const onParamChange = useCallback(
    (destination: string, value: number) => {
      setParams((prev) => ({ ...prev, [destination]: value }));
      // Drive the LOCAL audio graph — the control surface's voices. The
      // destination names the voice: `synth:param-<name>` → the poly/noise
      // engine's setParam; `synth:param-<pad>.<param>` → the drum kit's
      // per-pad setParam. Unknown destinations are ignored by setParam (the
      // voices reject unknown names, mirroring the router).
      if (soundOn) {
        const { poly, noise, drum } = voicesRef.current;
        const name = destination.replace(/^synth:param-/, '');
        if (name.includes('.')) {
          drum?.setParam(name, value);
        } else if (POLYSYNTH_DESTINATIONS.includes(destination as (typeof POLYSYNTH_DESTINATIONS)[number])) {
          poly?.setParam(name, value);
        } else if (NOISEMACHINE_DESTINATIONS.includes(destination as (typeof NOISEMACHINE_DESTINATIONS)[number])) {
          noise?.setParam(name, value);
        }
      }
      // Broadcast to the shared fold for remote clients.
      const bound = room.mappings.find((m) => m.destination === destination);
      if (bound) room.sendMove(bound.source, value);
    },
    [room, soundOn],
  );

  const synthDestinations = useMemo(() => {
    if (tab === 'synth') return [...POLYSYNTH_DESTINATIONS, ...NOISEMACHINE_DESTINATIONS];
    return [];
  }, [tab]);

  const matrixDestinations = useMemo(
    () => [...POLYSYNTH_DESTINATIONS.slice(0, 6), ...MIDI_OUT_DESTINATIONS.slice(0, 4), ...WLED_DESTINATIONS.slice(0, 4)],
    [],
  );

  return (
    <div className="control-surface">
      <header className="control-surface__header">
        <h1 className="control-surface__title">Control</h1>
        <div className="control-surface__status">
          <button
            className={`btn ${soundOn ? 'btn-primary' : 'btn-glass'} btn-sm`}
            onClick={toggleSound}
            aria-pressed={soundOn}
          >
            {soundOn ? 'sound on' : 'sound off'}
          </button>
          <span className={`control-surface__dot control-surface__dot--${room.connection}`} />
          <span className="control-surface__status-text">{room.connection}</span>
          {room.dropCount > 0 && (
            <span className="badge badge-workshop">{room.dropCount} dropped</span>
          )}
        </div>
      </header>

      {room.lastError && (
        <div className="control-surface__error" role="alert">
          <strong>{room.lastError.code}</strong> {room.lastError.message}
        </div>
      )}

      <div className="control-surface__columns">
        {/* ── Sources ─────────────────────────────────────────────── */}
        <section className="glass-panel control-surface__panel" aria-label="Sources">
          <h2 className="control-surface__panel-title">Sources</h2>

          <div className="control-surface__source">
            <div className="control-surface__source-head">
              <span>Web MIDI</span>
              <span className={`badge ${midiIn.state === 'granted' ? 'badge-spark' : 'badge-maker'}`}>
                {midiIn.state}
              </span>
            </div>
            {midiIn.state === 'idle' && (
              <button className="btn btn-glass btn-sm" onClick={() => void midiIn.enable()}>
                Enable MIDI
              </button>
            )}
            {midiIn.state === 'denied' && (
              <p className="control-surface__hint">MIDI access was refused. The on-screen controls still work.</p>
            )}
            {midiIn.state === 'unsupported' && (
              <p className="control-surface__hint">
                This browser does not expose Web MIDI. The control surface still drives
                the local synth and WLED.
              </p>
            )}
            {midiIn.devices.map((d) => (
              <div key={d.id} className="control-surface__device">
                <span className="control-surface__device-name">{d.name}</span>
                <span className="control-surface__device-mfr">{d.manufacturer}</span>
              </div>
            ))}
          </div>

          <div className="control-surface__source">
            <div className="control-surface__source-head">
              <span>On-screen</span>
              <span className="badge badge-spark">active</span>
            </div>
            <p className="control-surface__hint">
              Every knob is a source. Click a destination in the Matrix, then move a
              physical MIDI knob — the arriving CC binds it.
            </p>
          </div>
        </section>

        {/* ── Rack ────────────────────────────────────────────────── */}
        <section className="glass-panel control-surface__panel" aria-label="Rack">
          <div className="control-surface__tabs" role="tablist">
            {(['synth', 'lights', 'midi'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                className={`chip ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'synth' && (
            <div className="control-surface__knobs">
              {synthDestinations.map((dest) => (
                <Knob
                  key={dest}
                  label={destinationLabel(dest)}
                  value={params[dest] ?? 0.5}
                  min={0}
                  max={1}
                  learnState={learnStateFor(dest)}
                  onGestureStart={() => armLearn(dest)}
                  onGestureEnd={() => setArmed(null)}
                  onChange={(v) => onParamChange(dest, v)}
                  onCommit={(v) => onParamChange(dest, v)}
                />
              ))}
            </div>
          )}

          {tab === 'lights' && (
            <div className="control-surface__lights">
              <p className="control-surface__hint">
                WLED bridge is feature-flagged with a user-entered address. An
                unreachable device reports the honest offline state.
              </p>
              {WLED_DESTINATIONS.slice(0, 4).map((dest) => (
                <div key={dest} className="control-surface__light-row">
                  <span>{destinationLabel(dest)}</span>
                  <Fader
                    label="brightness"
                    value={params[dest] ?? 0.5}
                    onChange={(v) => onParamChange(dest, v)}
                    learnState={learnStateFor(dest)}
                    onGestureStart={() => armLearn(dest)}
                    onGestureEnd={() => setArmed(null)}
                  />
                </div>
              ))}
            </div>
          )}

          {tab === 'midi' && (
            <div className="control-surface__midi">
              {!midiOut.supported && (
                <p className="control-surface__hint">Web MIDI output is not available in this browser.</p>
              )}
              {midiOut.supported && midiOut.outputs.length === 0 && (
                <p className="control-surface__hint">No MIDI outputs detected. Enable MIDI to list devices.</p>
              )}
              {midiOut.outputs.map((o) => (
                <div key={o.id} className="control-surface__device">
                  <span>{o.name}</span>
                  <Switch
                    label="route"
                    checked={midiOut.selectedId === o.id}
                    onChange={() => midiOut.select(o.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Matrix (interactive) ────────────────────────────────── */}
        <section className="glass-panel control-surface__panel" aria-label="Matrix">
          <h2 className="control-surface__panel-title">Matrix</h2>
          <p className="control-surface__hint">
            Click a row to arm its learn (amber). Move a physical MIDI knob — the
            arriving CC binds it (green). Click a bound row again to unbind.
          </p>
          <table className="control-surface__matrix">
            <thead>
              <tr>
                <th scope="col">destination</th>
                <th scope="col">source</th>
                <th scope="col">state</th>
                <th scope="col" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {matrixDestinations.map((dest) => {
                const bound = room.mappings.find((m) => m.destination === dest);
                const state = learnStateFor(dest);
                const active = armed === controlIdFor(dest) || bound !== undefined;
                return (
                  <tr
                    key={dest}
                    className={active ? 'control-surface__row--active' : ''}
                    onClick={() => (bound ? void room.clearMapping(bound.source, dest) : armLearn(dest))}
                  >
                    <td>{destinationLabel(dest)}</td>
                    <td>{bound ? bound.source : '—'}</td>
                    <td>
                      <span className={`badge ${state === 'bound' ? 'badge-spark' : state === 'learning' ? 'badge-workshop' : 'badge-maker'}`}>
                        {state}
                      </span>
                    </td>
                    <td aria-hidden="true">
                      <span className={`control-surface__cell-hint ${bound ? '' : 'is-learning'}`}>
                        {bound ? 'unbind' : 'learn'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}