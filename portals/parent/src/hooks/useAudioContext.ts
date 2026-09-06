import { useEffect, useState } from 'react';
import { initAudio } from '@p31/gamification/sound';

let audioInitialized = false;

export function useAudioContext(): { ready: boolean } {
  const [ready, setReady] = useState(audioInitialized);

  useEffect(() => {
    if (audioInitialized) {
      setReady(true);
      return;
    }

    const init = () => {
      if (audioInitialized) return;
      try {
        initAudio();
        audioInitialized = true;
        setReady(true);
      } catch {
        // ignore — sound stays disabled
      }
      cleanup();
    };

    const cleanup = () => {
      document.removeEventListener('pointerdown', init);
      document.removeEventListener('keydown', init);
      document.removeEventListener('touchstart', init);
    };

    document.addEventListener('pointerdown', init);
    document.addEventListener('keydown', init);
    document.addEventListener('touchstart', init);
    return cleanup;
  }, []);

  return { ready };
}
