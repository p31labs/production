# P31 Control Server — Build Prompt

**Audience:** a competent agent in Build Mode.
**Prerequisite:** the spatial music maker is live (`apps/music-maker/`, DO `MusicRoom`, D1 `music-maker`, WS at `music-presence.trimtab-signal.workers.dev`).
**Deliverable:** an MVP control server + unified control surface that turns the music maker into a general instrument/light/MIDI hub — with the P31 quantum material UI.

---

## 0 · Mission

Build a **control server** — a Durable Object that routes control messages between surfaces (browser UI, MIDI hardware, OSC peers, WLED lights, MIDI 2.0 bridges) — and a **unified control surface** in the browser that drives every routable destination from one panel. The synth engine, the light bridge, and the MIDI out are all destinations of the same routing graph.

The MVP is: **you move a knob in the browser and any connected destination responds** — the local synth changes pitch, the WLED strip changes color, a MIDI note fires, an OSC message leaves the server — with the mapping saved to the log.

---

## 1 · Constraints (P31 canon — non-negotiable)

1. **Sound opt-in, muted every session, no persistence.** The existing `useInstrumentSound` discipline applies to every new audio path.
2. **Committed vs ephemeral.** Mappings, patches, presets = committed through the gate. Continuous control moves (knob drag, MIDI CC stream, OSC gesture) = ephemeral over WS. Never write a knob's 60Hz output to D1.
3. **Reduced-motion floor.** Every animation and every auto-driving LFO respects `prefers-reduced-motion` and `data-spoons`.
4. **Accessibility.** Every knob/slider/switch is a native `<input type="range">` or `<button>` underneath, with `role="slider"` and full ARIA. Keyboard arrows, Home/End, PageUp/PageDown all work.
5. **Node budget.** The engine already caps at 8–16 zones. The control server caps at 64 destinations — refuse past that with a structured error, don't degrade silently.
6. **Honest state.** If the MIDI bridge is not connected, the UI says so. If WLED is unreachable, the light control shows offline. Never fake a successful bridge.
7. **The log is the source of truth.** A patch or mapping exists only after it commits. Local UI state is a view of the log plus ephemeral deltas.

---

## 2 · Ground truth (reuse, don't rebuild)

| Asset | Path | Use it for |
|---|---|---|
| `SpatialInstrumentEngine` | `apps/music-maker/src/audio/SpatialInstrumentEngine.ts` | The audio graph; add new voice types here, don't fork |
| `MusicRoom` DO | `apps/music-maker/worker/` | The proven WS + hibernation pattern; `ControlRoom` is a NEW sibling DO, not an extension of the music transport |
| Canon gate | `packages/canon/src/loom/gate.ts` | Add the new event kinds here first |
| Knob, Fader | `apps/p31ca/src/components/controller/` | The UI primitives — extract to a shared `@p31ca/controls` package both apps import |
| Scene tokens | `packages/canon/src/css/quantum.css` + `molecular-dome.css` | The visual contract |

If a needed primitive doesn't exist, add it to canon; never fork it locally.

---

## 3 · Architecture

### 3.1 The Durable Object: `ControlRoom`

A NEW DO class, sibling to `MusicRoom` (its own binding; routing tables never risk the proven music-presence transport). A single DO per session family. Responsibilities:

1. **Routing table** — `{ source, destination, mapping }` triples. Sources: `ui:control-<id>`, `midi:in-<channel>`, `osc:<path>`, `wled:sync`. Destinations: `synth:param-<name>`, `midi:out-<channel>`, `osc:out-<path>`, `wled:seg-<n>`.
2. **WebSocket hub** — accept browser clients, hardware bridges, and MIDI 2.0 bridges on separate paths (`/ui`, `/midi`, `/osc`).
3. **Ephemeral fan-out** — a control move arrives from any source, gets routed, and is broadcast to every subscribed destination. 60Hz budget; drop on overload with a structured "backpressure" event.
4. **Commit path** — a mapping change is validated through the gate and written to D1 as `control.mapping.set`.
5. **Learning state** — a short-lived `learning` flag per source that binds the next incoming message.

Use the existing SQLite storage + hibernation pattern from `MusicRoom`.

### 3.2 The browser synth

Extend `SpatialInstrumentEngine` with three new voice classes, all behind the same master compressor:

- **PolySynth** — 16-voice with proper stealing (quietest→oldest in release→oldest in attack). Knobs: attack, decay, sustain, release, filter cutoff, resonance, filter env amount, oscillator mix (sine/saw/square/noise).
- **NoiseMachine** — 8-voice noise engine with pitch-tracking bandpass and a "grain" mode. Knobs: grain size, density, pitch spread, tilt (white→pink→brown).
- **DrumKit** — 8-pad sample player. Pads: kick, snare, hat, clap, tom-lo, tom-hi, rim, crash. Each pad: tune, decay, pan, level.

Every parameter is exposed as a numeric control 0–1 or an enum, mirroring the LED store pattern. The control server doesn't know what a "cutoff" is — it routes messages by name.

### 3.3 Bridges

**In-browser (MVP, ship now):**

- **Web MIDI in** — `navigator.requestMIDIAccess()`, feature-detect with `"requestMIDIAccess" in navigator`, gracefully hide the MIDI panel if unsupported. Permission prompt happens on first enable, not on load.
- **Web MIDI out** — send note-on/note-off/CC/pitch-bend from the UI to a selected output.

**Server-side (MVP, feature-flagged):**

- **WLED bridge** — a Worker/DO task that POSTs to `http://<wled-ip>/json/state`. Ship it feature-flagged (`WLED_ENABLED=1`) and with a user-entered IP in the UI. No hardcoded IPs.
- **OSC out** — cannot run in a Worker (no raw UDP). Provide a **Node sidecar** (`apps/music-maker/bridge/osc.mjs`) that subscribes to the DO's WS and re-emits OSC. Document it as an optional companion.

**Deferred, documented seams:**

- **MIDI 2.0** — provide `bridge/midi2.mjs` as a stub with the UMP packet shapes commented in. Do not ship it working; the Web MIDI API doesn't expose MIDI 2.0 yet as of the knowledge cutoff.
- **E1.31/Art-Net** — same Node-sidecar pattern as OSC, same stub treatment.

---

## 4 · Protocol matrix (what's in scope)

| Protocol | MVP | Notes |
|---|---|---|
| Web MIDI in/out | ✅ | Feature-detect; hide if unavailable |
| WebSocket control | ✅ | Extends MusicRoom |
| WLED HTTP | ✅ | Feature-flag + user IP |
| OSC out | ⚠️ | Node sidecar; documented |
| MIDI 2.0 | 🚫 | Stub only; not exposed by Web MIDI |
| E1.31 / Art-Net | 🚫 | Node sidecar; not MVP |
| MQTT | 🚫 | Out of scope for v1 |

---

## 5 · The control surface

### 5.1 Route + placement

`apps/music-maker/src/surfaces/ControlSurface.tsx`, reachable at `/#/control`. Sidebar entry under the existing nav. Uses the same shell (`MarketingShell` + `CanonTopbar` + Starfield + MolecularHeart) — the dome is the backdrop here too, per the recent enterprise work.

### 5.2 Layout

Three columns on desktop, stacked on mobile:

**Left — Sources.** Card list of every connected input: Web MIDI devices (by name), the on-screen controls, the OSC bridge if connected, the WLED bridge. Each card shows connection status and a "Learning" toggle.

**Center — The Rack.** The destinations, as instrument panels:
- **Synth** tab: PolySynth / NoiseMachine / DrumKit selector, then the knobs for the selected engine, laid out in 3–4 rows of 3–6.
- **Lights** tab: WLED segment editor (per-segment color picker, effect select, speed/intensity, reverse/mirror toggles). The chip preview shows live segment colors.
- **MIDI Out** tab: note grid + velocity for the active MIDI output; a piano-roll-lite for drawing a short phrase.

**Right — The Matrix.** A source × destination grid. Each cell is a small chip that shows the mapping, or empty. Click a cell to enter learn mode; the next message from any source binds.

### 5.3 The control primitives (reuse the token-driven ones)

Every knob, slider, and switch must be the same visual language as the LED controller:

- `<Knob>` — the existing 270° sweep, drag ns, wheel, ⌥-click reset. Extended to accept an optional `bindable` prop for MIDI learn.
- `<Fader>` — the existing vertical drag; add a value tooltip that follows.
- `<Switch>` — new. A two-state rocker with a satisfying haptic-in-browser feel (CSS transition 120ms, no motion at reduced-motion).
- `<Segmented>` — reuse the mode-selector pattern from the LED tab.

### 5.4 Visual contract (P31 quantum material)

Reuse the panel tokens from the enterprise work:

- **Backgrounds** — `--p31-panel-deep` → `--p31-panel-surface` → `--p31-panel-raised` (three-tier DAW convention).
- **Borders** — 1px hairline (`rgba(255,255,255,0.08)`) carries depth; no drop shadows on flat controls.
- **Glass** — panels use the `::before` blur + masked gradient rim pattern already shipped in `molecular-dome.css`.
- **Signal colors** — green (active), amber (learning), red (error). Never decorative.
- **Mono numerals** — every numeric readout uses `font-variant-numeric: tabular-nums` so columns align.
- **Motion budget** — transitions ≤ 200ms ease-out; knob drag interpolates; LEDs pulse at 2s.

---

## 6 · Token contract (add to canon, mirror in the portal)

Add to `packages/canon/src/css/quantum.css` and mirror in `apps/p31ca/src/styles/molecular-dome.css`:

```css
/* ─── Control Surface ─────────────────────────────────────────────────────── */
--p31-control-knob-size: 44px;
--p31-control-fader-height: 88px;
--p31-control-panel-gap: 12px;
--p31-control-signal-learning: oklch(0.82 0.16 85);   /* amber */
--p31-control-signal-bound:    oklch(0.78 0.18 150);  /* green */
--p31-control-signal-error:    oklch(0.68 0.20 25);   /* red   */
```

Add canon events to `packages/canon/src/loom/events.ts` + `gate.ts`:

- `control.mapping.set` — `{ source, destination, mapping }` (committed)
- `control.mapping.clear` — `{ source, destination }` (committed)
- `control.patch.set` — `{ engine, params }` (committed)
- `control.midi.learn` — `{ source, controlId, cc }` (committed)

And `data-agent-action` values: `control.midi.bind`, `control.wled.segment`, `control.synth.param`, `control.preset.load`. The canonical home for `data-agent-action` values is `apps/loom/public/.well-known/agent-manifest.json` (which already registers the `instrument.*` actions) — extend that registry; do not create a parallel file.

---

## 7 · Test plan

**Unit (vitest):**
- Voice allocation — 17th note steals the right voice (parametrized over quietest/oldest).
- Envelope math — ADSR ramps produce the expected values at t=0, t=attack, t=attack+decay, t=release-end.
- Router — a source message fans out to every matching destination; no dest receives twice.
- Mapping persistence — set → reload → same mapping.
- WLED state serializer — a segment object round-trips.

**Integration:**
- Web MIDI loopback (browser, one virtual output → input).
- A control move at 60Hz over WS holds for 30s without drift.
- Learning mode binds the next CC and disarms.

**E2E (Playwright, live site):**
- Enable sound → drag a knob → the value updates.
- MIDI learn: arm a control, send a CC, the control moves.
- Set a mapping → reload → the mapping is still there.
- WLED panel with a fake IP shows the honest offline state.

**Gates:**
- `pnpm gate` clean (typecheck, lint, tests, build, v:gate).
- Canon `pnpm build` (events + tokens + parity).
- Deploy the DO + the app; verify all four endpoints.

---

## 8 · Non-goals (explicitly out)

- **No MIDI 2.0 browser support.** Stub only.
- **No Art-Net/E1.31 in the MVP.** Node sidecar seam only.
- **No audio recording.** The synth plays; it doesn't record to D1/R2.
- **No plugin hosting (VST3/CLAP/LV2).** Defer to a future Zynthian-style hub.
- **No cloud-to-LAN routing.** The Node sidecar is user-run; the DO doesn't reach into local networks.
- **No user accounts / multi-tenant auth.** Single-family scope matches the music maker.

---

## 9 · Deliverables checklist

- [ ] `ControlRoom` DO (sibling of `MusicRoom`; routing tables + `/ui` `/midi` `/osc` paths)
- [ ] `worker/schema.sql` migrations for `mappings`, `patches`
- [ ] `apps/music-maker/src/audio/voices/` — `PolySynth.ts`, `NoiseMachine.ts`, `DrumKit.ts`
- [ ] `apps/music-maker/src/surfaces/ControlSurface.tsx` — three-column layout, mounted via minimal hash routing (`#/control`)
- [ ] `apps/music-maker/src/components/controls/` — `Switch.tsx`, extension of `Knob.tsx`/`Fader.tsx` (extracted to `@p31ca/controls`)
- [ ] `apps/music-maker/src/hooks/useMidiIn.ts`, `useMidiOut.ts`, `useControlRoom.ts`
- [ ] `apps/music-maker/src/lib/router.ts` — pure routing logic, unit-tested
- [ ] `apps/music-maker/bridge/osc.mjs` — Node OSC out sidecar
- [ ] `apps/music-maker/bridge/midi2.mjs` — UMP stub
- [ ] Canon: four new events + gate validation + four `data-agent-action` values
- [ ] Canon + portal: the six `--p31-control-*` tokens
- [ ] Route `/#/control` in `useRoutes`; sidebar entry
- [ ] Tests: 8+ unit, 3 integration, 4 E2E
- [ ] `docs/CONTROL_SERVER_RUNBOOK.md` — the deploy/operate companion

---

## 10 · Verification gates (each must pass before handoff)

1. `pnpm gate` in `apps/music-maker` — clean.
2. Canon `pnpm build` — events + tokens + parity green.
3. Deploy worker → DO created → D1 tables present → `/health` 200.
4. Deploy app → `/#/control` 200 → dome renders → control panel renders.
5. Playwright E2E: enable → knob move → MIDI learn → mapping persists → reload → mapping survives.
6. A control move at 60Hz holds for 30s. Backpressure fires at 120Hz with the structured drop event.
7. Reduced-motion on: no animation in the control panel; sound toggle still works.
8. Reduced-transparency on: control panels go solid; still legible.
9. `data-spoons="0"` → the control panel still renders (it's a utility, not a motion surface).
10. The WLED panel with an invalid IP shows the honest offline state — never a fake green dot.

---

## 11 · Handoff notes

The MVP is: **one knob, one mapping, one destination, saved and reloadable.** Everything beyond that — multi-destination fan-out, MIDI 2.0, Art-Net, plugin hosting — is an extension on the same skeleton. Ship the skeleton; make it honest about the seams; don't fake the deferred protocols.

If anything in the constraint list (Section 1) collides with a build decision, the constraint wins. If a technical claim in this prompt (Sections 1–4) conflicts with what you find in the code or a live doc, trust the code/doc and note the discrepancy in the commit body.