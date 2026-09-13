import { useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { modeGateMachine } from '../machines/modeGate';
import { canAccess, MODE_LABELS, type PortalMode } from '../lib/passports';
import { navigateTo } from '../lib/routes';
import { useQpjStore } from '../store/useQpjStore';
import { useNotifStore } from '../store/useNotifStore';
import { PinDialog } from './PinDialog';

export interface ModeGuardProps {
  required: PortalMode;
  auth?: 'pin' | 'did';
  title?: string;
  description?: string;
  children: React.ReactNode;
  onElevated?: () => void;
  onRedirected?: () => void;
}

/**
 * Deep-link mode lock. `spark` sessions reaching a `maker`+ route are held at
 * the caregiver PIN (`auth: 'pin'`, default). `workshop` routes may instead be
 * `auth: 'did'` — access is granted by verified on-device identity, and anyone
 * without one is walked back to /you (no PIN prompt).
 *
 * Successes elevate the *session* mode (never the passport's default),
 * redirects walk everyone back to the street.
 */
export function ModeGuard({
  required,
  auth = 'pin',
  title = 'This door needs a caregiver',
  description = 'Crafting and the workshop are open to grown-ups in this mode. Enter the 4-digit caregiver PIN to peek inside.',
  children,
  onElevated,
  onRedirected,
}: ModeGuardProps) {
  const mode = useQpjStore((s) => s.mode);
  const setMode = useQpjStore((s) => s.setMode);
  const caregiverPin = useQpjStore((s) => s.caregiverPin);
  const showToast = useQpjStore((s) => s.showToast);
  const identityStatus = useQpjStore((s) => s.identity.status);

  const [snapshot, send] = useMachine(modeGateMachine);

  useEffect(() => {
    if (canAccess(mode, required)) return;
    send({ type: 'REQUEST', required, active: mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, required]);

  if (canAccess(mode, required)) {
    return <>{children}</>;
  }

  if (snapshot.value === 'ok') {
    return <>{children}</>;
  }

  if (snapshot.value === 'redirecting') {
    navigateTo('street');
    onRedirected?.();
    return null;
  }

  // DID-gated surfaces: identity grants workshop access regardless of mode rank.
  if (auth === 'did') {
    if (identityStatus === 'ready' && useQpjStore.getState().identity.identity) {
      setMode(required);
      onElevated?.();
      return <>{children}</>;
    }
    if (identityStatus === 'loading') return null;
    // No identity → onboarding, no PIN prompt.
    navigateTo('you');
    onRedirected?.();
    return null;
  }

  const handlePin = (pin: string) => {
    if (pin === caregiverPin) {
      setMode(required);
      send({ type: 'PIN_OK' });
      onElevated?.();
      useNotifStore.getState().notify({
        kind: 'success',
        title: `${MODE_LABELS[required]} mode unlocked`,
        body: 'A grown-up door opened for this session.',
      });
    } else {
      showToast('Wrong PIN — keep it gentle', 'error');
    }
  };

  return (
    <PinDialog
      title={title}
      description={description}
      onSuccess={handlePin}
      onCancel={() => {
        send({ type: 'PIN_CANCEL' });
        onRedirected?.();
        navigateTo('street');
      }}
    />
  );
}
