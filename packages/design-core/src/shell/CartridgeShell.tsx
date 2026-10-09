import { Component, type ReactNode } from 'react';
import type { CartridgeManifest, CartridgeBlock, CartridgeRoute } from './cartridge';
import { resolveShellTheme } from './cartridge';
import { PortalShell } from './PortalShell';
import { Topbar } from '../compositions/Topbar';
import { SidebarNav } from '../compositions/SidebarNav';
import { IdentityChip } from '../compositions/IdentityChip';
import { SignInLink } from '../compositions/SignInLink';
import { AccountMenu } from '../compositions/AccountMenu';
import { PageHeader } from '../compositions/PageHeader';
import { Button } from '../compositions/Button';
import { MetricRowBlock } from '../compositions/MetricRowBlock';
import { EvidenceBlock } from '../compositions/EvidenceBlock';
import { GovernanceOverviewBlock } from '../compositions/GovernanceOverviewBlock';

/**
 * @p31ca/design-core — shell/CartridgeShell.tsx
 *
 * The cartridge renderer: maps a CartridgeManifest onto the immutable
 * PortalShell frame — the productionization of the p31-shell prototype's
 * proof (one frame, many faces, cartridges as manifests).
 *
 * Ownership line (enforced by validateCartridgeOwnership):
 *   the shell owns geometry, the cartridge owns content. CartridgeShell only
 *   ever fills PortalShell's named slots from manifest fields — it can never
 *   rearrange the frame.
 *
 * Theme-travel: the user's picked theme wins; the manifest themeDefault
 *   applies only on first load if the user never picked.
 *
 * Broken-cartridge containment: a throwing route is caught by CartridgeError
 *   (an error boundary scoped to the main slot), so the frame — topbar,
 *   sidebar, ambient, identity — never unmounts. The prototype's exact
 *   invariant, in canon form.
 */

/** Block renderers the T4 cartridge routes use — canon compositions, canon BEM
 *  classes (single source of truth; no prototype-fork styles). A cartridge may
 *  supply its own renderer map for non-canon blocks. */
export type CartridgeBlockRenderer = Record<string, (b: any) => ReactNode>;

const DEFAULT_BLOCK_RENDERERS: CartridgeBlockRenderer = {
  hero: (b: any) => (
    <PageHeader eyebrow={b.eyebrow ?? 'P31'} title={b.title} lede={b.lede}>
      {b.actions?.map((a: any, i: number) => (
        <Button key={i} variant={a.primary ? 'primary' : 'ghost'}>{a.label}</Button>
      ))}
    </PageHeader>
  ),
  metric: (b: any) => <MetricRowBlock items={b.items ?? []} />,
  evidence: (b: any) => (
    <EvidenceBlock claim={b.claim} value={b.value} source={b.source} verified={b.verified} />
  ),
  gov: (b: any) => <GovernanceOverviewBlock title={b.title} body={b.body ?? []} />,
};

/** Render a route's block list (or a throwing renderer). A throwing route is
 *  caught here — the shell never flinches; only the main slot shows the error.
 *  (Synchronous catch covers SSR, where React error boundaries do not run.) */
export function renderCartridgeRoute(
  route: CartridgeRoute,
  renderers: CartridgeBlockRenderer = DEFAULT_BLOCK_RENDERERS,
): ReactNode {
  try {
    const blocks = typeof route === 'function' ? route() : route;
    const list = Array.isArray(blocks) ? blocks : [blocks];
    return (
      <>
        {list.map((b: CartridgeBlock, i: number) => {
          const fn = renderers[b.t];
          return fn ? <div key={i} className="cartridge-block">{fn(b)}</div> : null;
        })}
      </>
    );
  } catch (e) {
    return (
      <div className="cartridge-error" role="alert">
        <h2>This cartridge failed to load.</h2>
        <p>{(e as Error).message ?? 'The shell is intact — your frame, theme, and identity never left.'}</p>
      </div>
    );
  }
}

/** The identity fill → canon composition mapping. All three fills render
 *  through the shell's identity fence: SignInLink (unauthenticated),
 *  IdentityChip (did:key claim), AccountMenu (signed-in, portal-supplied
 *  spec — navigation + sign-out are the portal's own handlers). */
function renderIdentityFill(manifest: CartridgeManifest): ReactNode {
  const id = manifest.identity;
  if (!id) return null;
  if (id.kind === 'sign-in') return <SignInLink to={id.to} label={id.label} />;
  if (id.kind === 'identity-chip') {
    return <IdentityChip emoji={id.emoji} did={id.did} verified={id.verified} onClaim={id.onClaim} />;
  }
  if (id.kind === 'account-menu') {
    return <AccountMenu name={id.spec.trigger.name} emoji={id.spec.trigger.emoji} primaryLinks={id.spec.primaryLinks} secondaryLinks={id.spec.secondaryLinks} onSignOut={id.spec.onSignOut} />;
  }
  return null;
}

/** Error boundary scoped to the main slot — the shell never flinches. */
interface CartridgeErrorState { error: Error | null; }
export class CartridgeError extends Component<{ children: ReactNode; onRecover?: () => void }, CartridgeErrorState> {
  state: CartridgeErrorState = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="cartridge-error" role="alert">
          <h2>This cartridge failed to load.</h2>
          <p>{this.state.error.message}</p>
          {this.props.onRecover && <button type="button" className="btn" onClick={this.props.onRecover}>Return</button>}
        </div>
      );
    }
    return this.props.children;
  }
}

/** Map an identity fill's kind onto the Topbar's identity slot. */
export interface CartridgeShellProps {
  manifest: CartridgeManifest;
  /** Theme state — user pick travels across cartridges (see resolveShellTheme). */
  userTheme: string | null;
  userPicked: boolean;
  /** Route path to render (defaults to '/'). */
  path?: string;
  /** Optional ambient slot (DomeBackground + LED, portal-owned). */
  ambient?: ReactNode;
  /** Optional mobile bottom nav (portal-owned). */
  mobileNav?: ReactNode;
  /** Optional overlay extras (CommandPalette + CalmOverlay, portal-owned). */
  extras?: ReactNode;
  /** Block renderer overrides / additions. */
  blockRenderers?: CartridgeBlockRenderer;
  /** Theme callback — the shell notifies the host of the resolved theme. */
  onResolveTheme?: (theme: string) => void;
  /** Console chrome rendered into the header center region — switcher +
   *  theme picker (the console supplies these; a plain portal omits). */
  headerSlots?: { switcher?: ReactNode; themePicker?: ReactNode };
}

/**
 * Render a cartridge through the immutable PortalShell frame. Slots filled
 * from manifest fields; geometry untouched. The main slot is wrapped in
 * CartridgeError so a throwing route can never unmount the frame.
 */
export function CartridgeShell({
  manifest, userTheme, userPicked, path = '/',
  ambient, mobileNav, extras, blockRenderers, onResolveTheme, headerSlots,
}: CartridgeShellProps) {
  const theme = resolveShellTheme({
    userTheme: (userTheme as any) ?? null,
    userPicked,
    cartridgeThemeDefault: manifest.themeDefault,
  });
  onResolveTheme?.(theme);

  const brand = (
    <span className="wordmark" dangerouslySetInnerHTML={{ __html: manifest.wordmark }} />
  );

  // Console chrome (switcher + theme picker) fills the header center when the
  // console provides it; otherwise the cartridge's search occupies the slot.
  const center = headerSlots?.switcher || headerSlots?.themePicker ? (
    <div className="tb-console-chrome">
      {headerSlots?.switcher}
      {headerSlots?.themePicker}
    </div>
  ) : manifest.search ? (
    <div className="tb-search" tabIndex={0} aria-label="Search">
      <span>{manifest.search}</span>
    </div>
  ) : null;

  const action = manifest.action && manifest.actionKind !== 'none' ? (
    <button type="button" className={`tb-action ${manifest.actionKind === 'primary' ? 'primary' : ''}`}>
      {manifest.action}
    </button>
  ) : null;

  const trailing = action ? <div className="tb-actions">{action}</div> : undefined;
  const identity = renderIdentityFill(manifest);
  const route = manifest.routes[path] ?? manifest.routes['/'] ?? [];

  return (
    <PortalShell
      config={{ shell: { header: { topbar: 'canon' }, main: [] } }}
      registry={{}}
      header={(
        <Topbar
          brand={brand}
          center={center}
          trailing={trailing}
          identity={identity}
          aria-label={`${manifest.name} topbar`}
        />
      )}
      ambient={ambient}
      sidebar={(
        <SidebarNav
          items={manifest.nav.map((n) => ({ label: n.label, path: n.path, emoji: n.emoji }))}
          activePath={path}
          ariaLabel={`${manifest.name} navigation`}
        />
      )}
      mobileNav={mobileNav}
      extras={extras}
    >
      <CartridgeError
        key={`${manifest.id}:${path}`}
        onRecover={undefined}
      >
        {renderCartridgeRoute(route, blockRenderers)}
      </CartridgeError>
    </PortalShell>
  );
}

export default CartridgeShell;