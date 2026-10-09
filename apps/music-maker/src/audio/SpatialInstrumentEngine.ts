/**
 * The music maker — SpatialInstrumentEngine.
 *
 * One engine, N zones. Each zone owns one PannerNode + one GainNode +
 * oscillator(s) sourced from a timbre profile. The graph (per §5.1 of the
 * build prompt):
 *
 *   AudioContext
 *    └─ masterGain (hard ceiling 0.6)
 *        └─ compressor (DynamicsCompressorNode, gentle knee)
 *            └─ per-zone: PannerNode (HRTF|equalpower, inverse distance)
 *                └─ per-zone: GainNode (envelope from timbre profile)
 *                    └─ oscillator(s)
 *
 * Non-negotiable rules (all from the build prompt §3):
 *   • No sound plays without an explicit prior tap on the sound toggle in
 *     this session. `soundEnabled` is the only gate.
 *   • No sound object exceeds the master gain ceiling regardless of how many
 *     zones trigger at once (a child mashing six zones must not spike).
 *   • AudioContext is created/resumed only on a user gesture. Zones can be
 *     loaded from the committed log BEFORE the toggle is tapped — they are
 *     held in a pending buffer and the audio graph is built inside enable(),
 *     never speculatively on mount.
 *   • HRTF fallback to equalpower is automatic and silent — interaction is
 *     identical, only fidelity differs.
 *
 * The TimbreProfile shape reuses phos's spoonProfile()-style fields
 * (oscType/volume/attack/decay) so the sonic vocabulary is inherited, not
 * reinvented (apps/phos/src/lib/sound.ts).
 */

export interface TimbreProfile {
  oscType: OscillatorType;
  volume: number;
  attack: number;
  decay: number;
  /** The zone's base frequency in Hz. */
  frequency: number;
  /** 0..1 brightness; drives the lowpass cutoff on the zone's filter. */
  brightness: number;
}

export interface ZoneVoice {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface SpatialInstrumentOptions {
  /** Hard ceiling on the master gain (linear). §3.2. */
  masterCeiling?: number;
  /** HRTF is the default; equalpower is the silent fallback. §3.5. */
  panningModel?: PannerOptions['panningModel'];
  /** Sphere radius — distance falloff is computed from it (§5.1). */
  radius: number;
  /** Family-scale node budget (§5.2). The engine refuses past this. */
  maxZones?: number;
}

const DEFAULT_CEILING = 0.6;
const DEFAULT_MAX_ZONES = 16;

/** The family-scale node budget (§5.2). Exported so the UI (App) refuses at
 *  the same count the engine enforces — one source of truth, no drift. */
export const FAMILY_ZONE_BUDGET = DEFAULT_MAX_ZONES;

interface PendingZone {
  voice: ZoneVoice;
  profile: TimbreProfile;
}

export class SpatialInstrumentEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Uint8Array<ArrayBuffer> | null = null;
  private voicePanners = new Map<string, PannerNode>();
  private voiceGains = new Map<string, GainNode>();
  private voiceFilters = new Map<string, BiquadFilterNode>();
  private voiceOscs = new Map<string, OscillatorNode[]>();
  private pendingZones = new Map<string, PendingZone>();
  /** The §3.2 voice engines (PolySynth/NoiseMachine/DrumKit), each on its own
   *  bus into the SAME master compressor. Built on the enable() gesture — never
   *  speculatively on mount. `pendingVoiceEngines` holds the builder closures
   *  before the context exists, mirroring pendingZones. */
  private voiceBuses = new Map<string, GainNode>();
  private pendingVoiceEngines = new Map<string, (ctx: AudioContext, bus: GainNode) => void>();
  private readonly opts: Required<SpatialInstrumentOptions>;
  private soundEnabled = false;
  private effectiveModel: PanningModelType | null = null;
  private listenerPosition: [number, number, number] = [0, 0, 0];
  private spoons = 3;
  private ambient: { gain: GainNode; branches: Array<{ filter: BiquadFilterNode; lfo: OscillatorNode; lfoGain: GainNode }>; drones: OscillatorNode[] } | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(opts: SpatialInstrumentOptions) {
    this.opts = {
      masterCeiling: opts.masterCeiling ?? DEFAULT_CEILING,
      panningModel: opts.panningModel ?? 'HRTF',
      radius: opts.radius,
      maxZones: opts.maxZones ?? DEFAULT_MAX_ZONES,
    };
  }

  get enabled(): boolean {
    return this.soundEnabled;
  }

  /** The number of zones in the composition (pending + built). */
  get zoneCount(): number {
    return this.pendingZones.size + this.voicePanners.size;
  }

  get maxZones(): number {
    return this.opts.maxZones;
  }

  /** The user gesture: the sound toggle tap. No other call creates the context.
   *  Building the graph here — not on mount — is the §3.4 gesture boundary. */
  enable(): void {
    this.soundEnabled = true;
    const ac = this.ensureContext();
    if (!ac) return;
    this.buildPendingZones();
    this.buildPendingVoiceEngines();
    this.pushListener();
    // Confirm the context actually STARTED before the confirmation blip — a
    // tone scheduled while the context is still suspended is silently dropped
    // (the classic "I tapped sound on and heard nothing"). resume() resolves
    // once the context is running; the blip lands after.
    if (ac.state === 'suspended') {
      void ac.resume().then(() => {
        this.bootChord();
        this.setAmbient(true);
      }).catch(() => {});
    } else {
      this.bootChord();
      this.setAmbient(true);
    }
  }

  disable(): void {
    this.soundEnabled = false;
    this.setAmbient(false);
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  /** The family member's current spoon level (0–5). Scales how gently the
   *  instrument sounds (§ spoonProfile): low spoons → softer, calmer voices.
   *  The parent shell sends it over the bridge; defaults to a normal 3. */
  setSpoons(spoons: number): void {
    this.spoons = Math.max(0, Math.min(5, Math.round(spoons) || 3));
  }

  /** The machine hum — a very quiet LARMOR-divisor drone. Lives ONLY while
   *  sound is on; gain ~0.03 so it never distracts, only makes the atom feel
   *  alive instead of silent-but-on. Organic, never-repeating (detuned partial
   *  pairs + slow LFO on the filter cutoff — the Eno/Massive-Bloom pattern). */
  setAmbient(on: boolean): void {
    const ac = this.ctx;
    if (!ac || !this.master) return;
    if (on && !this.ambient) {
      const gain = ac.createGain();
      gain.gain.value = 0;
      gain.connect(this.master);

      // Four unsynchronized LFOs (prime-ish rates, 0.03–0.19 Hz) on four
      // filter branches — the Massive Bloom pattern: "the non-synced rates
      // create organic, non-repeating evolution — the sound never loops back
      // to the same state."
      const rates = [0.031, 0.047, 0.073, 0.109];
      const branches = rates.map((rate) => {
        const filter = ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 220;
        filter.connect(gain);
        const lfo = ac.createOscillator();
        lfo.frequency.value = rate;
        const lfoGain = ac.createGain();
        lfoGain.gain.value = 90;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        return { filter, lfo, lfoGain };
      });

      const drones: OscillatorNode[] = [];
      const root = 863 / 8; // ≈ 108 Hz — the first Larmor divisor
      const tune = (freq: number, type: OscillatorType, g: number, branch: number): OscillatorNode => {
        const o = ac.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        const og = ac.createGain();
        og.gain.value = g;
        o.connect(og);
        og.connect(branches[branch].filter);
        o.start();
        drones.push(o);
        return o;
      };
      // Two detuned pairs + a sub, split across the first three branches — the
      // beat between the pairs is what makes it breathe.
      tune(root, 'sine', 0.014, 0);
      tune(root * 1.006, 'sine', 0.014, 0);
      tune(root * 2, 'triangle', 0.008, 1);
      tune(root * 2 * 1.004, 'triangle', 0.008, 1);
      tune(root / 2, 'sine', 0.01, 2);

      // Fade in so the hum appears, never pops.
      const t = ac.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.03, t + 0.8);

      this.ambient = { gain, branches, drones };
      this.updateAmbientProprioception();
    } else if (!on && this.ambient) {
      const a = this.ambient;
      this.ambient = null;
      const t = ac.currentTime;
      a.gain.gain.cancelScheduledValues(t);
      a.gain.gain.setValueAtTime(a.gain.gain.value, t);
      a.gain.gain.linearRampToValueAtTime(0, t + 0.4);
      const stop = (n: OscillatorNode) => {
        try { n.stop(t + 0.45); } catch { /* already stopped */ }
        setTimeout(() => {
          try { n.disconnect(); } catch { /* already gone */ }
        }, 600);
      };
      for (const n of [...a.drones, ...a.branches.map((b) => b.lfo)]) stop(n);
      for (const b of a.branches) {
        try { b.lfoGain.disconnect(); } catch { /* already gone */ }
        try { b.filter.disconnect(); } catch { /* already gone */ }
      }
      a.gain.disconnect();
    }
  }

  /** Proprioception (AudioMiXR — "hearing where you are is what makes spatial
   *  design novice-friendly"): the hum's filter base center tracks the
   *  listener's distance to the phosphate core — brighter near the middle,
   *  deeper at the edge. The LFOs still swing around it. */
  private updateAmbientProprioception(): void {
    const a = this.ambient;
    const ac = this.ctx;
    if (!a || !ac) return;
    const [x, y, z] = this.listenerPosition;
    const d = Math.hypot(x, y, z);
    const t = 1 - Math.min(1, d / this.opts.radius); // 0 at the edge, 1 at the core
    const center = 140 + t * 220; // 140 → 360 Hz
    for (const b of a.branches) {
      b.filter.frequency.setTargetAtTime(center, ac.currentTime, 0.2);
    }
  }

  /**
   * Queue a zone's voice. Idempotent per zone id. Returns false when the
   * composition is already at the node budget (§5.2) — the caller should
   * surface that refusal, not let the graph grow unbounded.
   *
   * A zone added AFTER the context is live (sound already enabled) is built
   * immediately; a zone added before the toggle is held in the pending buffer
   * and built inside enable().
   */
  addZone(voice: ZoneVoice, profile: TimbreProfile): boolean {
    if (this.voicePanners.has(voice.id) || this.pendingZones.has(voice.id)) return true;
    if (this.zoneCount >= this.opts.maxZones) return false;
    if (this.ctx && this.master) {
      // The graph is already live (sound on): build this voice now.
      this.buildVoice(voice, profile);
      return true;
    }
    // Store only the data. The AudioContext and its nodes are built inside
    // enable(), on the user gesture — never here, never speculatively.
    this.pendingZones.set(voice.id, { voice, profile });
    return true;
  }

  removeZone(id: string): void {
    const ac = this.ctx;
    for (const osc of this.voiceOscs.get(id) ?? []) {
      try { osc.stop(); } catch { /* already stopped */ }
      osc.disconnect();
    }
    this.voicePanners.get(id)?.disconnect();
    this.voiceGains.get(id)?.disconnect();
    this.voiceFilters.get(id)?.disconnect();
    this.voicePanners.delete(id);
    this.voiceGains.delete(id);
    this.voiceFilters.delete(id);
    this.voiceOscs.delete(id);
    this.pendingZones.delete(id);
  }

  /** The ids of all zones in the composition (pending + built). */
  zoneIds(): string[] {
    return [...new Set([...this.voicePanners.keys(), ...this.pendingZones.keys()])];
  }

  /** Attach a §3.2 voice engine (PolySynth/NoiseMachine/DrumKit) to the master
   *  compressor on its own bus. Built only on the enable() gesture — before the
   *  toggle, the builder is held in the pending buffer and the AudioContext is
   *  never created here (the §3.4 gesture boundary, same as zones).
   *
   *  `builder` receives the live context + the engine's bus and returns
   *  nothing; the engine's own constructor wires its pool into the bus. The bus
   *  is created lazily so the engine can't exist before the context does. */
  attachVoiceEngine(id: string, builder: (ctx: AudioContext, bus: GainNode) => void): void {
    if (this.ctx && this.master) {
      const bus = this.ctx.createGain();
      bus.connect(this.master);
      this.voiceBuses.set(id, bus);
      builder(this.ctx, bus);
      return;
    }
    // Stored as data; the graph is built inside enable() on the user gesture.
    this.pendingVoiceEngines.set(id, builder);
  }

  /**
   * Trigger a zone. Returns whether sound actually fired; callers must render
   * the visual echo regardless (the "every cue has a visual equivalent" rule).
   * Envelope from the timbre profile, envelope per-zone so a repeated trigger
   * re-attacks cleanly.
   *
   * The voice is an ADDITIVE ELEMENTAL CHORD — the harmonic series of the
   * element's frequency with 1/n amplitudes (Synth_Additive / Overtonium: "the
   * timbre of any periodic sound can be described by the relative amplitudes of
   * its harmonics… falling as 1/n"), plus a detuned twin on the fundamental
   * (warmth) and a sub-octave sine (body) — Massive Bloom's "3 detuned saws +
   * sub sine" warmth recipe. All through the zone's filter → gain → panner.
   * Created fresh per trigger and disposed on end (the Web Audio no-pool
   * lesson: "create a new oscillator every time… no significant hit").
   * `mix` (from the App's d20 roll) picks the richness spoon-adaptively.
   */
  trigger(id: string, profile: TimbreProfile, mix?: { partials: number; detune: number }): boolean {
    const ac = this.ctx;
    if (!ac || !this.soundEnabled || !this.voicePanners.has(id)) return false;

    const t = ac.currentTime;
    const voiceGain = this.voiceGains.get(id)!;
    const filter = this.voiceFilters.get(id)!;
    const base = profile.oscType;
    const partialCount = Math.max(1, Math.min(8, Math.round(mix?.partials ?? 6)));
    const detune = mix?.detune ?? 4;

    voiceGain.gain.setValueAtTime(0, t);
    voiceGain.gain.linearRampToValueAtTime(profile.volume, t + profile.attack);
    voiceGain.gain.exponentialRampToValueAtTime(0.001, t + profile.decay);

    const oscs: OscillatorNode[] = [];
    const voice = (type: OscillatorType, freq: number, gain: number, cents = 0): void => {
      const osc = ac.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (cents !== 0) osc.detune.setValueAtTime(cents, t);
      const og = ac.createGain();
      og.gain.value = gain;
      osc.connect(og);
      og.connect(filter);
      osc.start(t);
      osc.stop(t + profile.decay + 0.1);
      osc.addEventListener('ended', () => {
        osc.disconnect();
        og.disconnect();
      }, { once: true });
      oscs.push(osc);
    };

    // The harmonic series, 1/n amplitudes (n=1 is the fundamental).
    for (let n = 1; n <= partialCount; n++) {
      voice(n === 1 ? base : 'triangle', profile.frequency * n, 1 / n);
    }
    // A detuned twin on the fundamental — the beat is the warmth.
    if (detune > 0) voice(base, profile.frequency, 0.35, detune);
    // A sub-octave sine — body.
    voice('sine', profile.frequency / 2, 0.2);

    const existing = this.voiceOscs.get(id);
    if (existing) existing.push(...oscs);

    return true;
  }

  /** Move the listener. Remembered even before the context exists, so the
   *  first enable() hears the position the user already moved to. Throttled to
   *  animation-frame rate by the caller. */
  setListener(x: number, y: number, z: number): void {
    this.listenerPosition = [x, y, z];
    this.pushListener();
  }

  /** Four distinct UI voices (UI-sound design: clicks/taps are filtered noise,
   *  confirmations are tonal). No two actions share a tone:
   *
   *   tap-click        → tapTick()      — 50ms filtered noise (button pressed)
   *   toggle sound on  → bootChord()    — warm LARMOR-divisor chord (machine wakes)
   *   placement lands  → zoneChimeAt()  — the element's pitch, POSITIONAL
   *   zone trigger     → the chord voice (above), through its own panner
   *
   * The §3 rule holds for all of them: nothing fires unless soundEnabled. */

  /** A short filtered-noise click (~50ms) — the "the tap landed" sound. */
  tapTick(): void {
    const ac = this.ctx;
    if (!ac || !this.soundEnabled || !this.master) return;
    const t = ac.currentTime;
    const buf = this.noise(0.08);
    if (!buf) return;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const hp = ac.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 1800;
    hp.Q.value = 1.2;
    const g = ac.createGain();
    const v = 0.12 * this.energyScale();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + 0.09);
    src.addEventListener('ended', () => {
      src.disconnect();
      hp.disconnect();
      g.disconnect();
    }, { once: true });
  }

  /** The toggle-on chord: the first three LARMOR divisors rise in — the atom
   *  waking. Distinct from every other voice. */
  bootChord(): void {
    const v = 0.09 * this.energyScale();
    this.tone(863 / 8, 0, 0.6, v);
    this.tone(863 / 6, 0.18, 0.6, v);
    this.tone(863 / 4, 0.36, 0.8, v * 0.9);
  }

  /** A soft positional chime at a point in space — the placement-confirm voice.
   *  The panner is TEMPORARY (not tied to a zone voice), so it works the moment
   *  a zone lands, at exactly where it landed. The element's own pitch. */
  zoneChimeAt(x: number, y: number, z: number, freq: number): void {
    const ac = this.ctx;
    if (!ac || !this.soundEnabled || !this.master) return;
    const t = ac.currentTime;
    const panner = ac.createPanner();
    panner.panningModel = 'equalpower';
    panner.distanceModel = 'inverse';
    panner.refDistance = this.opts.radius * 0.5;
    panner.maxDistance = this.opts.radius * 3;
    panner.setPosition(x, y, z);
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1600;
    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    const g = ac.createGain();
    const v = 0.11 * this.energyScale();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(filter);
    filter.connect(g);
    g.connect(panner);
    panner.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.35);
    osc.addEventListener('ended', () => {
      osc.disconnect();
      filter.disconnect();
      g.disconnect();
      panner.disconnect();
    }, { once: true });
  }

  /** The spoon-adaptive volume scale (§ spoonProfile): low spoons → gentler.
   *  Not a lever for gameplay — the ethical floor. */
  private energyScale(): number {
    return this.spoons <= 2 ? 0.5 : 1;
  }

  /** One sine tone through the master with a fast attack/decay envelope. Only
   *  fires when soundEnabled AND the context is live — never a pre-gesture
   *  sound. UI/system confirmations bypass the panner (they are not spatial). */
  private tone(freq: number, offset: number, duration: number, volume: number): void {
    const ac = this.ctx;
    if (!ac || !this.soundEnabled || !this.master) return;
    const t = ac.currentTime + offset;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
    osc.addEventListener('ended', () => {
      osc.disconnect();
      gain.disconnect();
    }, { once: true });
  }

  /** A shared short noise buffer (lazily built once per context). */
  private noise(duration: number): AudioBuffer | null {
    const ac = this.ctx;
    if (!ac) return null;
    if (this.noiseBuffer && this.noiseBuffer.duration >= duration) return this.noiseBuffer;
    const len = Math.max(64, Math.floor(ac.sampleRate * duration));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    this.noiseBuffer = buf;
    return buf;
  }

  /** Release the graph. */
  dispose(): void {
    const ac = this.ctx;
    if (ac) {
      for (const id of [...this.voicePanners.keys()]) this.removeZone(id);
      this.master?.disconnect();
      for (const bus of this.voiceBuses.values()) bus.disconnect();
      void ac.close().catch(() => {});
    }
    this.pendingZones.clear();
    this.pendingVoiceEngines.clear();
    this.voiceBuses.clear();
    this.ambient = null;
    this.noiseBuffer = null;
    this.ctx = null;
    this.master = null;
    this.analyser = null;
    this.analyserData = null;
    this.effectiveModel = null;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private pushListener(): void {
    const ac = this.ctx;
    if (!ac) return;
    const [x, y, z] = this.listenerPosition;
    ac.listener.setPosition(x, y, z);
    ac.listener.setOrientation(-x, -y, -z, 0, 1, 0);
    // The hum's cutoff base tracks distance to the core — you hear where you are.
    this.updateAmbientProprioception();
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.opts.masterCeiling; // the hard ceiling

    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -24;
    comp.knee.value = 20;
    comp.ratio.value = 6;
    comp.attack.value = 0.004;
    comp.release.value = 0.24;
    this.master.connect(comp).connect(this.ctx.destination);

    // Analyser after the compressor — drives the audio-reactive scene. Reads
    // the post-ceiling mix so the visuals track what the family actually
    // hears (bass/mid/treble bands + a smoothed master energy).
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.65;
    this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
    comp.connect(this.analyser);

    return this.ctx;
  }

  /** Three-band energy + master level, 0..1 each, for the audio-reactive scene.
   *  Returns a stable object so the RAF loop can read it every frame without
   *  allocation. Falls back to zeros before the context exists (the scene
   *  still renders; it just doesn't breathe until sound is on). */
  getEnergy(): { bass: number; mid: number; treble: number; master: number } {
    if (!this.ctx || !this.analyser || !this.analyserData) {
      return { bass: 0, mid: 0, treble: 0, master: 0 };
    }
    this.analyser.getByteFrequencyData(this.analyserData);
    const d = this.analyserData;
    const n = d.length; // 64 bins for fftSize 128
    // Bass ~ 40–250Hz → bins 0..5; mid ~ 250–4k → bins 6..30; treble above.
    let bass = 0; let mid = 0; let treble = 0; let sum = 0;
    const bin = (i: number) => d[Math.min(n - 1, i)] / 255;
    for (let i = 0; i < 6; i++) bass += bin(i);
    for (let i = 6; i < 31; i++) mid += bin(i);
    for (let i = 31; i < n; i++) treble += bin(i);
    for (let i = 0; i < n; i++) sum += bin(i);
    const avg = (v: number, c: number) => Math.min(1, v / Math.max(1, c) * 1.6);
    return {
      bass: avg(bass, 6),
      mid: avg(mid, 25),
      treble: avg(treble, n - 31),
      master: Math.min(1, sum / n),
    };
  }

  /** Choose the panning model BEFORE the real graph is built. Device signals are
   *  the whole decision. There is deliberately NO runtime probe: creating a
   *  panner node does not load the HRTF database — that happens on the first
   *  AUDIO sample it processes, which is too late to switch models. A "probe"
   *  that measures panner creation returns ~0ms on every device and caches a
   *  fake result; it was removed for that reason. We step down to equalpower
   *  when the signals predict trouble, and accept HRTF elsewhere.
   *
   *  Order of decisions:
   *   1. Opt-in or forced equalpower → equalpower.
   *   2. Mobile Safari → equalpower (research: "Mobile Safari has limited
   *      support for HRTF and ConvolverNode; fall back to StereoPannerNode +
   *      simple gain control"). Safari is also the browser that lacks Web MIDI.
   *   3. Low-end device signal (hardwareConcurrency ≤ 4 or outputLatency >
   *      50ms) → equalpower.
   *   4. sessionStorage cache → reuse a previous decision (the HRTF DB load is
   *      a one-time cost per context, not per enable).
   *   5. Otherwise → HRTF (the IEEE 2025 WebXR study: HRTF measurably beats
   *      equalpower for localization; accept it unless signals say otherwise).
   *      Thresholds are provisional and device-calibrated. */
  private choosePanningModel(): PanningModelType {
    if (this.opts.panningModel !== 'HRTF') return this.opts.panningModel;
    if (!this.ctx || !this.master) return this.opts.panningModel;

    // 1. Mobile Safari → equalpower. /^((?!chrome|android).)*safari/i misses
    //    Chrome-on-iOS, so also check the vendor. One family-browser gate
    //    covers both HRTF limits and Web MIDI absence.
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isSafari =
      /^((?!chrome|android).)*safari/i.test(ua) ||
      (/iPad|iPhone|iPod/.test(ua) && !/CriOS/.test(ua));
    if (isSafari) return 'equalpower';

    // 2. Low-end device signal.
    const hw = (navigator.hardwareConcurrency ?? 8);
    const latency = this.ctx.outputLatency ?? 0;
    if (hw <= 4 || latency > 0.05) return 'equalpower';

    // 3. sessionStorage cache — the decision is stable within a session.
    try {
      const cached = sessionStorage.getItem('music-maker:panning-model');
      if (cached === 'HRTF' || cached === 'equalpower') return cached;
    } catch {
      // sessionStorage unavailable — fall through to the default.
    }

    // 4. Default: HRTF. Persist the decision for the rest of the session.
    try {
      sessionStorage.setItem('music-maker:panning-model', 'HRTF');
    } catch { /* non-fatal */ }
    return 'HRTF';
  }

  private buildPendingZones(): void {
    const ac = this.ctx;
    if (!ac || !this.master) return;

    for (const { voice, profile } of this.pendingZones.values()) {
      this.buildVoice(voice, profile);
    }
    this.pendingZones.clear();
  }

  /** Build any attached voice engines that were held before the toggle. */
  private buildPendingVoiceEngines(): void {
    const ac = this.ctx;
    if (!ac || !this.master) return;
    for (const [id, builder] of this.pendingVoiceEngines) {
      const bus = ac.createGain();
      bus.connect(this.master);
      this.voiceBuses.set(id, bus);
      builder(ac, bus);
    }
    this.pendingVoiceEngines.clear();
  }

  /** Build one zone's PannerNode → filter → gain chain into the live graph. */
  private buildVoice(voice: ZoneVoice, profile: TimbreProfile): void {
    const ac = this.ctx;
    if (!ac || !this.master) return;
    // TS cannot narrow `this.effectiveModel` through the null-check (it's a
    // mutable class field), so pick a local once.
    const model = this.effectiveModel ?? this.choosePanningModel();
    this.effectiveModel = model;

    const panner = ac.createPanner();
    panner.panningModel = model;
    panner.distanceModel = 'inverse';
    // refDistance/maxDistance from the sphere radius so falloff feels
    // proportionate regardless of how many zones are on it (§5.1).
    panner.refDistance = this.opts.radius * 0.5;
    panner.maxDistance = this.opts.radius * 3;
    panner.setPosition(voice.x, voice.y, voice.z);

    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400 + profile.brightness * 6000;
    filter.Q.value = 0.8;

    const gain = ac.createGain();
    gain.gain.value = 0;

    panner.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    this.voicePanners.set(voice.id, panner);
    this.voiceGains.set(voice.id, gain);
    this.voiceFilters.set(voice.id, filter);
    this.voiceOscs.set(voice.id, []);
  }
}