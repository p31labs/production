import type { ReactNode, CSSProperties } from 'react';
import { TopbarSection } from './TopbarSection';

export type TopbarVariant = 'app' | 'marketing' | 'game';

export interface TopbarProps {
  /** Left cluster: app mark + wordmark. */
  brand?: ReactNode;
  /** Legacy alias for `brand`. */
  left?: ReactNode;
  /** Center region: command trigger, nav, or context. Optional. */
  center?: ReactNode;
  /** Legacy right cluster — rendered into the trailing region. */
  right?: ReactNode;
  /** Read-only status segments (ModePill, SpoonCluster, CalmIndicator…). */
  statusCluster?: ReactNode;
  /** Primary mode control (SPARK / MAKER / WORKSHOP). */
  mode?: ReactNode;
  /** Pinned trailing actions + identity. */
  trailing?: ReactNode;
  /** Identity region — sign-in link, DID-claim chip, or account menu. Fenced
   *  from the trailing utility cluster by a divider (identity ≠ utility).
   *  The shell is auth-agnostic: the portal supplies the fill. */
  identity?: ReactNode;
  /** Mobile-only leading override (e.g. hamburger). */
  mobileLeading?: ReactNode;
  /** Mobile-only trailing override. */
  mobileTrailing?: ReactNode;
  /** Visual variant — controls height/background/responsive behavior. */
  variant?: TopbarVariant;
  /** Sticky at top. Default true. */
  sticky?: boolean;
  /** Apply glassmorphic background (app variant, default true). */
  glass?: boolean;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

/**
 * Topbar — the unified app-chrome shell.
 *
 * Layout contract (three regions):
 *   [ brand ] [ center (optional) ] [ statusCluster | mode | trailing ]
 *
 * The status cluster scrolls horizontally when it outgrows the bar; the
 * trailing cluster is pinned and never scrolls. Below `md`, center collapses
 * and the bar exposes `mobileLeading` / `mobileTrailing`.
 *
 * Backward-compatible superset: `brand`/`left`/`center`/`right`/`glass`/`style`
 * map onto the slot model, so existing consumers (e.g. the design portal
 * catalog) keep working unchanged.
 */
export function Topbar({
  brand,
  left,
  center,
  right,
  statusCluster,
  mode,
  trailing,
  identity,
  mobileLeading,
  mobileTrailing,
  variant = 'app',
  sticky = true,
  glass = true,
  className = '',
  style,
  'aria-label': ariaLabel = 'Application top bar',
}: TopbarProps) {
  const cls = [
    'topbar',
    `topbar--${variant}`,
    sticky ? 'topbar--sticky' : '',
    glass ? 'glass-navbar' : 'topbar--flat',
    className,
  ].filter(Boolean).join(' ');

  const brandNode = brand ?? left;
  const trailingNode = trailing ?? right;

  return (
    <header className={cls} style={style} role="banner" aria-label={ariaLabel}>
      <TopbarSection slot="leading" className="topbar__mobile-leading">
        {mobileLeading}
      </TopbarSection>

      <TopbarSection slot="brand" className="topbar__brand">
        {brandNode}
      </TopbarSection>

      {/* True centering: spacer before AND after center so the center slot
          sits mid-bar, not pinned against the brand cluster. When center is
          absent, the two spacers collapse into the flex-1 rule and the
          status/trailing clusters push to the right. */}
      {center ? (
        <>
          <div className="topbar__spacer" aria-hidden="true" />
          <TopbarSection slot="center" className="topbar__center">
            {center}
          </TopbarSection>
          <div className="topbar__spacer" aria-hidden="true" />
        </>
      ) : (
        <div className="topbar__spacer" aria-hidden="true" />
      )}

      {statusCluster && (
        <TopbarSection slot="status" className="topbar__status">
          {statusCluster}
        </TopbarSection>
      )}

      {mode && (
        <TopbarSection slot="mode" className="topbar__mode">
          {mode}
        </TopbarSection>
      )}

      <TopbarSection slot="trailing" className="topbar__trailing">
        {trailingNode}
      </TopbarSection>

      {identity && (
        <TopbarSection slot="identity" className="topbar__identity">
          {identity}
        </TopbarSection>
      )}

      <TopbarSection slot="mobile-trailing" className="topbar__mobile-trailing">
        {mobileTrailing}
      </TopbarSection>
    </header>
  );
}

export default Topbar;