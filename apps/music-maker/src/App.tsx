/**
 * The music maker — App.
 *
 * Wires the three systems together:
 *   • the composition log (useMusicSession) — the score
 *   • the spatial scene (SpatialScene) — the planetarium
 *   • the audio engine (SpatialInstrumentEngine) — the sound
 *
 * The log/presence split is respected end to end: placements/clears/names are
 * committed events; a zone trigger is ephemeral and never committed.
 *
 * Re-render discipline: App owns NO per-frame state. The scene runs its own
 * animation loop internally (SpatialScene), so a requestAnimationFrame here
 * would re-render the whole tree at 60fps for nothing — the historical `time`
 * prop was dead state and was removed.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SpatialInstrumentEngine, FAMILY_ZONE_BUDGET, type TimbreProfile } from './audio/SpatialInstrumentEngine';
import { SpatialScene } from './scene/SpatialScene';
import { ControlSurface } from './surfaces/ControlSurface';
import { SoundToggle } from './components/SoundToggle';
import { ZoneListbox } from './components/ZoneListbox';
import { Starfield } from './components/Starfield';
import { useInstrumentSound } from './hooks/useInstrumentSound';
import { useMusicSession, unseenRemoteTriggers } from './hooks/useMusicSession';
import { posnerSitePosition, type Timbre } from './scene/musicZone';
import { useIframeBridge } from './lib/iframeBridge';
import { GuidedTour } from './components/GuidedTour';
import { NoticeStack } from './components/NoticeStack';
import { Ornament } from './components/Ornament';
import { ZoneDrawer } from './components/ZoneDrawer';
import { ZoneMenu } from './components/ZoneMenu';
import { useNotices } from './hooks/useNotices';
import { useTourState } from './hooks/useTourState';
import { FREQ } from './audio/frequencies';
import { d20Select, type Variant } from './lib/d20';
import { resolveTokenRgb } from './lib/tokens';

// The elemental timbres are the REAL NMR gyromagnetic ratios to ³¹P (see
// audio/frequencies.ts): hydrogen 2132 Hz, carbon 536, oxygen 289, phosphor
// 863. The frequencies are real NMR numbers; the Posner story that inspired
// the instrument is a contested hypothesis, not a claim.
const TIMBRE_PROFILES: Record<Timbre, TimbreProfile> = {
  hydrogen: { oscType: 'sine', volume: 0.5, attack: 0.02, decay: 1.2, frequency: FREQ.hydrogen, brightness: 0.2 },
  carbon: { oscType: 'triangle', volume: 0.5, attack: 0.02, decay: 0.9, frequency: FREQ.carbon, brightness: 0.4 },
  oxygen: { oscType: 'sine', volume: 0.5, attack: 0.01, decay: 0.7, frequency: FREQ.oxygen, brightness: 0.6 },
  phosphor: { oscType: 'triangle', volume: 0.55, attack: 0.01, decay: 0.5, frequency: FREQ.phosphor, brightness: 0.8 },
};

// The elemental-chord richness — d20-selected per trigger so the sound is
// spoon-adaptively varied (low spoons → higher temperature → thinner, softer
// voices). `partials` = harmonic count (1/n amplitudes), `detune` = the warmth
// twin in cents.
interface ChordVariant extends Variant {
  mix: { partials: number; detune: number };
}
const CHORD_VARIANTS: ChordVariant[] = [
  { id: 'full', weight: 3, mix: { partials: 8, detune: 3 } },
  { id: 'warm', weight: 2, mix: { partials: 6, detune: 6 } },
  { id: 'bare', weight: 1, mix: { partials: 3, detune: 0 } },
];

const RADIUS = 2.2;
/** The family-scale node budget (§5.2) — single source: the engine's. */
const MAX_ZONES = FAMILY_ZONE_BUDGET;

// The traveling-signal palette — the sender's token color, derived
// deterministically from the pickle name so a family member keeps their hue.
const PULSE_COLORS: Array<[number, number, number]> = [
  resolveTokenRgb('--p31-accent'),
  resolveTokenRgb('--p31-accent-gold'),
  resolveTokenRgb('--p31-accent-green'),
  resolveTokenRgb('--p31-accent-red'),
];
function actorColor(author: string | undefined): [number, number, number] {
  if (!author) return PULSE_COLORS[0];
  let h = 0;
  for (let i = 0; i < author.length; i++) h = (h * 31 + author.charCodeAt(i)) >>> 0;
  return PULSE_COLORS[h % PULSE_COLORS.length];
}

// The gentle session off-ramp (Lumi: "respect daily limits… encourage outdoor
// play" — a soft line, never a hard block, never a nag).
const OFF_RAMP_MS = 30 * 60_000;

export default function App() {
  const sound = useInstrumentSound();
  const session = useMusicSession();
  // The bridge to the parent shell (identity/theme/roster down, activity up).
  // Each device reports its own actions; remote moves already land in the
  // shared log, so they are not re-reported here.
  const bridge = useIframeBridge();
  // Minimal hash routing: `#/control` mounts the control server surface,
  // every other hash keeps the spatial instrument. The control surface is a
  // utility, not a motion surface — it renders at spoons=0 like the instrument.
  // The route branch lives at the END of the component (below all hooks) so
  // the rules of hooks hold: every hook runs unconditionally either way.
  const [route, setRoute] = useState<'instrument' | 'control'>(() =>
    window.location.hash.startsWith('#/control') ? 'control' : 'instrument',
  );
  useEffect(() => {
    const onHash = () => {
      setRoute(window.location.hash.startsWith('#/control') ? 'control' : 'instrument');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  // The three-step guided tour (look / place / play) — advances on the matching
  // first interaction, so the instrument teaches itself.
  const tour = useTourState();
  // The in-instrument pop-ups — named presence + action confirmations.
  const notices = useNotices();
  // The traveling signals (Vibe Together: "travelling signals make musical
  // cause and effect visible") — one per remote trigger, carrying the sender's
  // token color so the family sees WHO sent the pulse. Newest last.
  const [remotePulses, setRemotePulses] = useState<Array<{ zoneId: string; at: number; colorRgb: [number, number, number] }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  // Immersive mode — the ornament slides away; Escape exits it (after the
  // drawer, which closes first when a zone is selected).
  const [immersive, setImmersive] = useState(false);
  // The corner label fades after 5s of no pointer movement; any pointer move
  // brings it back for another 5s (the simplest "pointer-proximity" reading).
  const [labelHidden, setLabelHidden] = useState(false);
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showLabel = useCallback(() => {
    setLabelHidden(false);
    if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    labelTimerRef.current = setTimeout(() => setLabelHidden(true), 5000);
  }, []);
  const [listener, setListener] = useState<[number, number, number]>([0, 0, 1.8]);
  const [mapping, setMapping] = useState<'pitch' | 'brightness'>('pitch');
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [renderMode, setRenderMode] = useState<'constellation' | 'terrain' | 'bursts'>('constellation');

  // The audio engine — created once, fed by the session's zone list.
  const engineRef = useRef<SpatialInstrumentEngine | null>(null);
  useEffect(() => {
    const e = new SpatialInstrumentEngine({ radius: RADIUS, masterCeiling: 0.6, panningModel: 'HRTF', maxZones: MAX_ZONES });
    engineRef.current = e;
    return () => {
      e.dispose();
      engineRef.current = null;
    };
  }, []);

  // The shell's spoon level arrives over the bridge identity — the instrument
  // sounds gentler for a low-spoon player (the ethical floor, never a lever).
  const identitySpoons = bridge.identity?.spoons;
  useEffect(() => {
    engineRef.current?.setSpoons(identitySpoons ?? 3);
  }, [identitySpoons]);

  // Sound toggle: the user gesture. The ENGINE owns the single AudioContext —
  // turning ON calls engine.enable(), which creates/resumes it inside this
  // gesture handler. The hook tracks only the preference (no context of its
  // own, so a session never has two). Sound-on time feeds the gentle off-ramp.
  const soundOnStartRef = useRef(0);
  const soundOnTotalRef = useRef(0);
  const offRampShownRef = useRef(false);
  const handleToggle = useCallback(() => {
    sound.toggle();
    if (sound.enabled) {
      // Turning OFF.
      engineRef.current?.disable();
      soundOnTotalRef.current += Date.now() - soundOnStartRef.current;
    } else {
      // Turning ON — this call IS the user gesture; the engine builds its
      // single graph here.
      soundOnStartRef.current = Date.now();
      engineRef.current?.enable();
      if (soundOnTotalRef.current >= OFF_RAMP_MS && !offRampShownRef.current) {
        offRampShownRef.current = true;
        notices.add('you’ve made a lot of music today — the sky will still be here tomorrow');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound.toggle, sound.enabled, notices]);

  // Keep zones and their voices in sync with the committed log.
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    const known = new Set<string>();
    for (const z of session.zones) {
      known.add(z.id);
      const p = TIMBRE_PROFILES[z.timbre] ?? TIMBRE_PROFILES.hydrogen;
      e.addZone({ id: z.id, x: z.position[0], y: z.position[1], z: z.position[2] }, p);
    }
    // Zones that left the composition are pruned from the audio graph.
    for (const id of e.zoneIds()) {
      if (!known.has(id)) e.removeZone(id);
    }
  }, [session.zones]);

  // Listener → audio. The engine remembers the position even before the
  // context exists (a silent no-op then) and pushes it on enable().
  useEffect(() => {
    engineRef.current?.setListener(listener[0], listener[1], listener[2]);
  }, [listener]);

  // Reduced motion: the scene draws a static frame; the composition stays
  // fully interactive. No per-frame state lives here.
  const reducedMotion = useMemo(
    () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // Announce a zone trigger for screen-reader users — the "every sound has a
  // visual echo" rule's non-visual twin. Debounced: a child mashing zones, or
  // a remote peer triggering rapidly, must not flood a live region. Only local
  // triggers announce; remote echoes announce at a 1-per-2s floor.
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = useCallback((text: string) => {
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnouncement(text), 200);
  }, []);
  // C3: the last remote-echo announcement time — remote echoes floor at 2s.
  const remoteAnnounceAt = useRef(0);
  useEffect(() => () => { if (announceTimer.current) clearTimeout(announceTimer.current); }, []);

  const handleZoneTrigger = useCallback(
    (id: string) => {
      setSelectedId(id);
      const z = session.zones.find((x) => x.id === id);
      const name = session.zoneName(id);
      const p = z ? TIMBRE_PROFILES[z.timbre] ?? TIMBRE_PROFILES.hydrogen : TIMBRE_PROFILES.hydrogen;
      // The glow ALWAYS fires (visual echo); the sound fires only when the
      // engine is enabled. triggerZone ALSO broadcasts the ephemeral trigger
      // to the other devices over the live transport — without it, a local tap
      // would glow and sound here but never reach the family ("hear the family
      // play along" needs the reverse direction too). Played/gazed: ephemeral,
      // never committed.
      session.triggerZone(id, bridge.identity?.pickledName);
      // The elemental chord is d20-varied per trigger — spoon-adaptive mix
      // (low spoons → higher temperature → softer voices), seeded so the same
      // zone doesn't always sound identical.
      const roll = d20Select(CHORD_VARIANTS, { spoons: bridge.identity?.spoons ?? 3 }, Date.now() + id.length);
      engineRef.current?.trigger(id, p, roll.variant.mix);
      // Report the trigger UP with the zone's placer — the shell rewards
      // playing a zone someone ELSE placed (collaboration, not solo grinding).
      bridge.sendActivity('trigger', name, session.zones.length, bridge.identity?.pickledName, z?.author);
      announce(`${name} played`);
      tour.markDone('play');
    },
    [session, announce, bridge, tour.markDone, setSelectedId],
  );

  const handleRemoteZoneTrigger = useCallback(
    (id: string, author?: string) => {
      const z = session.zones.find((x) => x.id === id);
      const p = z ? TIMBRE_PROFILES[z.timbre] ?? TIMBRE_PROFILES.hydrogen : TIMBRE_PROFILES.hydrogen;
      engineRef.current?.trigger(id, p);
      // C3: remote echoes are floored at one announcement per 2s so a peer
      // mashing zones doesn't flood the live region. Local triggers announce
      // immediately (handleZoneTrigger).
      const now = Date.now();
      if (now - remoteAnnounceAt.current >= 2000) {
        remoteAnnounceAt.current = now;
        const who = author ?? 'someone';
        announce(`${who} played ${session.zoneName(id)}`);
        notices.add(`${who} played ${session.zoneName(id)}`);
      }
      // The live line in the parent shell reflects family play, now NAMED —
      // the DO carries the author through the ephemeral boundary.
      bridge.sendActivity('trigger', session.zoneName(id), session.zones.length, author, z?.author);
      // The traveling signal — a colored pulse from the zone toward the
      // listener, carrying the sender's hue (visual cause-and-effect).
      setRemotePulses((p) => [...p.slice(-7), { zoneId: id, at: Date.now(), colorRgb: actorColor(author) }]);
    },
    [session, announce, bridge, notices],
  );

  // A3: process EVERY new remote trigger since the last run, not just the
  // head. Tracked by monotonic SEQ — the presence list is capped at 8 for
  // display, so tracking by array length would silently stall once the cap
  // drops old entries. unseenRemoteTriggers returns the unseen ones in arrival
  // order; the play order then matches arrival.
  const lastRemoteSeqRef = useRef(0);
  useEffect(() => {
    const unseen = unseenRemoteTriggers(session.remoteTriggers, lastRemoteSeqRef.current);
    for (const t of unseen) {
      lastRemoteSeqRef.current = t.seq;
      handleRemoteZoneTrigger(t.zone, t.author);
    }
  }, [session.remoteTriggers, handleRemoteZoneTrigger]);

  // The scene reads the engine's live three-band energy every frame — a stable
  // callback over the ref so the memoized scene doesn't re-render on energy
  // changes (the RAF loop reads it directly). Zeros before sound is on.
  const getEnergy = useCallback(() => {
    return engineRef.current?.getEnergy() ?? { bass: 0, mid: 0, treble: 0, master: 0 };
  }, []);

  // The guided tour's "look" step — the scene fires this once on the first
  // camera drag. Stable so the memoized scene doesn't re-render for it.
  const handleFirstLook = useCallback(() => {
    tour.markDone('look');
  }, [tour.markDone]);

  // The zone nearest the listener — the readout shows it so moving yourself
  // has feedback ("you're near the sun now").
  const nearestZone = useMemo(() => {
    if (session.zones.length === 0 || !listener) return null;
    let best: (typeof session.zones)[number] | null = null;
    let bestD = Infinity;
    for (const z of session.zones) {
      const d = Math.hypot(
        z.position[0] - listener[0],
        z.position[1] - listener[1],
        z.position[2] - listener[2],
      );
      if (d < bestD) { bestD = d; best = z; }
    }
    return best;
  }, [session.zones, listener]);

  // Place a zone at the next Posner site (the six phosphorus ring at 863 Hz),
// then the field beyond. Refuses past the node budget.
  const handlePlace = useCallback(() => {
    if (session.zones.length >= MAX_ZONES) {
      announce(`the instrument is full at ${MAX_ZONES} zones. clear one first.`);
      return;
    }
    const pos = posnerSitePosition(session.zones.length, RADIUS);
    // Immediate acknowledgment — the commit has a network round-trip, so the
    // tap gets a click now and the landing gets the positional chime on ack.
    engineRef.current?.tapTick();
    void session.placeZone(pos, 'phosphor').then((r) => {
      if (r.ok) {
        bridge.sendActivity('place', '', session.zones.length + 1);
        // The placement-confirm voice: the element's own pitch, heard at
        // exactly where it landed (a temporary panner, so it works instantly).
        engineRef.current?.zoneChimeAt(pos[0], pos[1], pos[2], FREQ.phosphor);
        notices.add('you placed a sound on the molecule');
        tour.markDone('place');
      } else {
        // A dropped transport, a stalled commit, and a service outage are
        // different failures with different fixes.
        announce(
          r.reason === 'gate'
            ? `the placement was not accepted.`
            : r.reason === 'timeout'
              ? `the connection stalled — the zone may not have landed.`
              : r.reason === 'infra'
                ? `the service is having trouble — try again in a moment.`
                : `the connection dropped — the zone may not have landed.`,
        );
      }
    });
  }, [session, announce, bridge, tour.markDone]);

  const handleClear = useCallback(() => {
    if (!selectedId) return;
    const name = session.zoneName(selectedId);
    void session.clearZone(selectedId).then((r) => {
      if (r.ok) {
        bridge.sendActivity('clear', name, Math.max(0, session.zones.length - 1));
        notices.add('you cleared a sound');
      } else {
        announce(
          r.reason === 'gate'
            ? `the clear was not accepted.`
            : r.reason === 'timeout'
              ? `the connection stalled — the zone may still be here.`
              : r.reason === 'infra'
                ? `the service is having trouble — try again in a moment.`
                : `the connection dropped — the zone may still be here.`,
        );
      }
    });
  }, [selectedId, session, announce, bridge, notices]);

  // Escape precedence: the drawer closes first (a zone is selected), then
  // immersive mode exits, otherwise no-op.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedIdRef.current) setSelectedId(null);
      else setImmersive(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The corner label: visible on first paint, fades after 5s idle, reappears
  // on any pointer movement.
  useEffect(() => {
    showLabel();
    window.addEventListener('pointermove', showLabel);
    return () => {
      window.removeEventListener('pointermove', showLabel);
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    };
  }, [showLabel]);

  // Drag-move a zone → commit a provenance-tracked instrument.zone.move. The
  // append-only log IS the undo history (revert = move back to the previous
  // committed position).
  const handleMove = useCallback(
    (id: string, position: [number, number, number]) => {
      const name = session.zoneName(id);
      void session.moveZone(id, position).then((r) => {
        if (r.ok) {
          notices.add(`you moved ${name}`);
          announce(`${name} moved`);
        } else {
          announce(
            r.reason === 'gate'
              ? 'the move was not accepted.'
              : 'the connection dropped — the move may not have landed.',
          );
        }
      });
    },
    [session, announce, notices],
  );

  // ── Named accessibility gaps (tracked, not silently deferred) ─────────────
  // 1. Vertical encoding has no NON-AUDIO fallback. The height→pitch /
  //    height→timbre channel carries the axis stereo pan cannot — but a user
  //    who cannot hear pan (deaf, or mono-only) cannot localize height at all.
  //    Research frontier is vibrotactile (NIME 2026 bHaptics TactSuit study);
  //    hardware-gated, so it is a named gap, not v1 scope.
  // 2. Web MIDI is feature-detected (the control surface at #/control owns
  //    the MIDI in/out path — see hooks/useMidiIn.ts, which handles the
  //    Chrome 124+ permission prompt and the honest unsupported/denied
  //    states). Touch/pointer is primary; MIDI only AUGMENTS it and must
  //    never gate the core loop. Safari (desktop + iOS) lacks Web MIDI; the
  //    surface drives the local synth and WLED regardless.
  //    (verified against caniuse / Chrome for Developers as of 2026-09).

  // The control server surface is a utility, not a motion surface — it
  // renders at spoons=0 exactly like the instrument. Route branch sits below
  // every hook so the rules of hooks hold.
  if (route === 'control') {
    return <ControlSurface />;
  }

  return (
    <div className="mm-shell" data-motion={reducedMotion ? 'reduced' : 'full'} data-immersive={immersive || undefined}>
      {/* The canon starfield — a fixed layer behind everything. */}
      <Starfield />
      {/* The corner label — fades after 5s idle, reappears on pointer movement. */}
      <h1 className={`mm-corner-label${labelHidden ? ' mm-corner-label--hidden' : ''}`}>
        the spatial instrument
      </h1>

      <main className="mm-stage">
        <SpatialScene
          zones={session.zones}
          triggers={session.triggers}
          listener={listener}
          onListenerChange={setListener}
          onZoneTrigger={handleZoneTrigger}
          selectedId={selectedId}
          reducedMotion={reducedMotion}
          getEnergy={getEnergy}
          renderMode={renderMode}
          pulses={remotePulses}
          onFirstLook={handleFirstLook}
          onDeselect={() => setSelectedId(null)}
          onZoneMoved={handleMove}
        />
        {/* The keyboard twin of the canvas tap — a screen-reader user (or anyone
            without a pointer) reaches the zones via Tab, moves selection with
            the arrow keys, and triggers with Enter/Space. Same onZoneTrigger as
            the canvas raycast; selection + trigger announce via the live region. */}
        <ZoneListbox zones={session.zones} onZoneTrigger={handleZoneTrigger} announce={announce} />
        {/* The selected zone's inspector — right-edge drawer, bottom sheet on
            mobile. Same committed surface as before (timbre, name, position,
            family play history) plus close + clear. */}
        <ZoneDrawer
          zone={session.zones.find((z) => z.id === selectedId) ?? null}
          onRename={(id, name) => void session.nameZone(id, name)}
          onClear={handleClear}
          onClose={() => setSelectedId(null)}
          announce={announce}
          playCount={(session.triggers[selectedId ?? ''] ?? []).length}
          recentPlays={
            selectedId
              ? session.remoteTriggers
                  .filter((t) => t.zone === selectedId)
                  .map((t) => ({ author: t.author ?? 'someone', at: t.at }))
              : []
          }
        />
      </main>

      {/* The floating bottom ornament — the whole control surface now lives
          here (sound, place, zones, render, overflow, immersive). */}
      <Ornament
        zones={session.zones}
        selectedId={selectedId}
        onSelectZone={setSelectedId}
        nearestName={nearestZone ? nearestZone.name || nearestZone.id : null}
        soundEnabled={sound.enabled}
        onToggleSound={handleToggle}
        renderMode={renderMode}
        onCycleRender={() =>
          setRenderMode((m) => (m === 'constellation' ? 'terrain' : m === 'terrain' ? 'bursts' : 'constellation'))
        }
        mapping={mapping}
        onToggleMapping={() => setMapping(mapping === 'pitch' ? 'brightness' : 'pitch')}
        onPlace={handlePlace}
        immersive={immersive}
        onToggleImmersive={() => setImmersive((v) => !v)}
      />

      {/* The trigger announcements — the screen-reader twin of the visual echo.
          role="status" + aria-live="polite": announced without interrupting.
          Debounced in the handler so a mash of zones produces one line, not a
          flood. */}
      <div className="mm-live" role="status" aria-live="polite">
        {announcement ?? ''}
      </div>

      {/* The guided tour — suppressed while immersive (its state is untouched,
          so exiting immersive resumes it at the same step). */}
      {!immersive && tour.currentStep && (
        <GuidedTour
          step={tour.currentStep}
          onBegin={tour.currentStep === 'welcome' ? () => tour.markDone('welcome') : undefined}
          onSkip={tour.dismiss}
        />
      )}

      {/* The named presence pop-ups — "Cornichon played the sun", action
          confirmations. Distinct from the tour card. */}
      {!immersive && <NoticeStack notices={notices.notices} />}
    </div>
  );
}