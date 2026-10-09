import { useEffect, type ReactNode } from 'react';
import { useCartridgeConsole } from './store';
import { CartridgeShell } from './CartridgeShell';
import { CartridgeSwitcher } from './CartridgeSwitcher';
import { ThemePicker } from './ThemePicker';
import { ShellAmbient, LedChip } from './ambient';
import { useThemeStore } from '../theming/theme-store';
import type { CartridgeBlockRenderer } from './CartridgeShell';

/**
 * @p31ca/design-core — shell/CartridgeConsole.tsx
 *
 * The console host — the "perfect shell": one immutable frame, many faces
 * (cartridges), theme as the context signal. Composes the frame (via
 * CartridgeShell) with the switcher + theme picker chrome, all driven by the
 * persisted console store.
 *
 * The console is the convergence of every earlier layer:
 *   - contract (cartridge.ts) validates + resolves themes
 *   - CartridgeShell renders the active manifest through the immutable frame
 *   - the store persists registry + active + userPickedTheme
 *   - switcher/theme chrome stay store-agnostic components
 *
 * Anything portal-owned (ambient dome, mobile nav, overlays) is a slot.
 */

export interface CartridgeConsoleProps {
  /** Portal-owned ambient (DomeBackground + LED), rendered once. */
  ambient?: ReactNode;
  /** Portal-owned mobile bottom nav. */
  mobileNav?: ReactNode;
  /** Portal-owned overlay extras (CommandPalette + CalmOverlay). */
  extras?: ReactNode;
  /** Block renderer overrides/additions (canon registry is the default). */
  blockRenderers?: CartridgeBlockRenderer;
  /** Optional slot for the Composer trigger/panel (rendered once). */
  composerSlot?: ReactNode;
  /** Route path (default '/') — the console renders one active route. */
  path?: string;
  className?: string;
}

export function CartridgeConsole({
  ambient, mobileNav, extras, blockRenderers, composerSlot, path = '/', className = '',
}: CartridgeConsoleProps) {
  const registry = useCartridgeConsole((s) => s.registry);
  const active = useCartridgeConsole((s) => s.active);
  const userPickedTheme = useCartridgeConsole((s) => s.userPickedTheme);
  const userTheme = useCartridgeConsole((s) => s.userTheme);
  const activate = useCartridgeConsole((s) => s.activate);
  const pickTheme = useCartridgeConsole((s) => s.pickTheme);
  const activeManifest = useCartridgeConsole((s) => s.activeManifest());
  const activeTheme = useCartridgeConsole((s) => s.activeTheme());

  // Keep the canon theme-store in sync with the console's resolved theme.
  const setTheme = useThemeStore((s) => s.setTheme);
  useEffect(() => { if (activeTheme) setTheme(activeTheme); }, [activeTheme, setTheme]);

  const manifest = activeManifest;

  if (!manifest) {
    return <div className={`cartridge-console ${className}`.trim()} role="status">No cartridges registered.</div>;
  }

  const switcher = (
    <CartridgeSwitcher
      items={registry.order.map((id) => {
        const m = registry.byId[id];
        return { id, name: m?.name ?? id, tier: m?.tier ?? 'T4' };
      })}
      active={active}
      onSelect={activate}
    />
  );

  const themePicker = <ThemePicker onPick={pickTheme} />;

  return (
    <div className={`cartridge-console ${className}`.trim()}>
      {composerSlot}
      <CartridgeShell
        manifest={manifest}
        userTheme={userTheme}
        userPicked={userPickedTheme}
        path={path}
        ambient={ambient ?? <ShellAmbient />}
        mobileNav={mobileNav}
        extras={extras}
        blockRenderers={blockRenderers}
        headerSlots={{ switcher, themePicker }}
      />
      {!ambient && <LedChip />}
    </div>
  );
}

export default CartridgeConsole;