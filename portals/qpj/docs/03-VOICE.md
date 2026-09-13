# 03 — Voice

Voice is a first-class toggleable surface, not an enhancement. It drives the street
("open the workshop", "send a treat") and composes into the Talk composer.

## Health model

`VoiceHealth = 'unsupported' | 'idle' | 'listening' | 'reconnecting' | 'permission_denied'`

- `voiceSupport.ts` — capability detection (`speechRecognitionSupported`,
  `getSpeechRecognition`), `CHROME_SILENCE_TIMEOUT_MS = 15000`,
  `MAX_RECONNECTS = 3`, `REBUILD_DELAY_MS = 300`.
- `useVoice.ts` — the lifecycle hook. **Contract for contributors:**

  1. **Health is owned by events, never by call sites.** Do NOT `setHealth('listening')`
     after `rec.start()`. A synchronous engine fires `onerror('no-speech')` → `onend`
     before `start()` returns (rebuild decision already made); a trailing set would win
     and the UI would show listening while the mic is being torn down. `onstart` owns
     `listening`; `onend`/`onerror`/`permission.dismissed` own everything else.
  2. **Silence rebuild**: "no-speech" → teardown, wait `REBUILD_DELAY_MS`, construct a
     **fresh** `SpeechRecognition` instance (Chrome leaks/timeouts on reused ones),
     re-attach, restart. Budget = `MAX_RECONNECTS`; over budget → `idle` + `reconnectCount`
     signal (amber cue on `VoiceButton`).
  3. `cleanup()` must `abort()`/`stop()`, drop handlers, and flip `stoppedRef` so late
     timers no-op (same hook unmounted mid-rebuild).

## UI

`VoiceButton.tsx` — mic glyph, listening pulse, amber "reconnecting", muted
"unsupported"/no-permission states. Touch target ≥ 48px. Never rendered as the sole
action (keyboard fallback on every surface that uses it).

## Testing

`src/__tests__/voice-health.test.tsx` fakes `window.SpeechRecognition` with a class
that fires `onstart → onerror → onend` synchronously, plus watches:
`start()` must stay async-safe; assert **stable** states only (`reconnecting`, `idle`)
— transient `listening` blips are unobservable with sync fakes and make the suite
flakey.