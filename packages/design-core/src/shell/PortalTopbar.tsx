import { Topbar as CanonTopbar } from '../compositions/Topbar';
import { SpoonDial, Button } from '../compositions';
import { ThemePicker } from './ThemePicker';
import { SearchBox } from './SearchBox';
import { AccountMenu } from '../compositions/AccountMenu';
import { IdentityChip } from '../compositions/IdentityChip';
import { SignInLink } from '../compositions/SignInLink';
import type { TopbarFace } from './face';
import type { IdentityFill } from './identity';

/**
 * @p31ca/design-core — shell/PortalTopbar.tsx
 *
 * THE canonical shell shape — the design portal's exact arrangement, frozen
 * as the single topbar every P31 face renders through:
 *
 *   [31 crown] [wordmark] [theme ⌄]   [ search ⌘K ]   [SPARK] [action] [●●● spoons] | [identity]
 *
 * A face supplies CONTENT (wordmark, search placeholder, mode, action,
 * identity, theme default). This component supplies the ARRANGEMENT — the
 * shape never changes; the theme is the only "you've moved" signal. A face
 * that tries to move the frame is a contract violation (validateFace).
 *
 * Identity is state-driven: the shell renders whichever fill the face
 * declares (avatar / sign-in / identity chip / account menu), fenced right.
 */

export interface PortalTopbarProps {
  face: TopbarFace;
  /** Spoon level 0–5 — the portal owns its state. */
  spoons?: number;
  onSpoonsChange?: (level: number) => void;
  onCrisis?: () => void;
  /** Called when the user picks a theme — the shell bookkeeps userPicked. */
  onPickTheme?: (theme: import('../theming/theme-store').ThemeId) => void;
  /** Optional leading slot for mobile (e.g. the forge's drawer). */
  mobileLeading?: React.ReactNode;
  /** Optional status-cluster extras (e.g. CalmIndicator). */
  statusCluster?: React.ReactNode;
  className?: string;
}

function IdentityFill({ identity }: { identity: IdentityFill }) {
  if (!identity) return null;
  if (identity.kind === 'sign-in') return <SignInLink to={identity.to} label={identity.label} />;
  if (identity.kind === 'identity-chip') {
    return <IdentityChip emoji={identity.emoji} did={identity.did} verified={identity.verified} onClaim={identity.onClaim} />;
  }
  if (identity.kind === 'account-menu') {
    return <AccountMenu name={identity.spec.trigger.name} emoji={identity.spec.trigger.emoji} primaryLinks={identity.spec.primaryLinks} secondaryLinks={identity.spec.secondaryLinks} onSignOut={identity.spec.onSignOut} />;
  }
  return null;
}

export function PortalTopbar({
  face, spoons = 3, onSpoonsChange, onCrisis, onPickTheme, mobileLeading, statusCluster, className = '',
}: PortalTopbarProps) {
  const modeClass = `badge badge-${face.mode}`;

  return (
    <CanonTopbar
      variant="app"
      className={className}
      brand={
        <>
          <button type="button" className="topbar-brand" aria-label={`${face.wordmark} home`}>
            <div className="p31-crown-logo" aria-hidden="true">31</div>
            <span>{face.wordmark}</span>
          </button>
          <ThemePicker onPick={onPickTheme} />
        </>
      }
      center={
        <SearchBox placeholder={face.searchPlaceholder} onOpen={face.onOpenPalette} />
      }
      mode={
        <span className={modeClass}>{face.mode.toUpperCase()}</span>
      }
      statusCluster={statusCluster}
      trailing={
        <>
          {face.action.kind !== 'none' && (
            <Button
              variant={face.action.kind === 'primary' ? 'primary' : 'ghost'}
              onClick={face.action.onActivate}
              className="session-btn"
            >
              {face.action.label}
            </Button>
          )}
          <SpoonDial level={spoons} onChange={onSpoonsChange} onCrisis={onCrisis} />
        </>
      }
      identity={<IdentityFill identity={face.identity} />}
      mobileLeading={mobileLeading}
    />
  );
}

export default PortalTopbar;