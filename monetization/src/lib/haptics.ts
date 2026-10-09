/**
 * haptics — native-feel feedback, zero web cost.
 *
 * Uses the Capacitor runtime global (present only inside the native shell) and
 * a dynamic import so the web/PWA bundle never pays for the plugin. On web the
 * call is a no-op; in the Capacitor app it fires a light tap.
 */
async function fire(style: 'Light' | 'Medium' | 'Heavy'): Promise<void> {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (!cap?.isNativePlatform?.()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const s = style === 'Heavy' ? ImpactStyle.Heavy : style === 'Medium' ? ImpactStyle.Medium : ImpactStyle.Light;
    await Haptics.impact({ style: s });
  } catch {
    /* haptics are best-effort */
  }
}

export function hapticTap(): void {
  void fire('Light');
}

export function hapticConfirm(): void {
  void fire('Medium');
}

export function hapticHeavy(): void {
  void fire('Heavy');
}