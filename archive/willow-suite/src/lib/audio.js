let audioContext = null;

export function getAudioContext() {
  if (!audioContext) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
        console.log('[Audio] Reusable AudioContext created');
      }
    } catch (e) {
      console.warn('[Audio] AudioContext not available:', e);
    }
  }
  return audioContext;
}

export function playNote(freq = 440, type = 'sine', duration = 0.3, volume = 0.15) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('[Audio] Playback blocked:', e);
  }
}

export function closeAudioContext() {
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
    audioContext = null;
    console.log('[Audio] AudioContext closed');
  }
}
