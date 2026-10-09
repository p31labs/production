/**
 * @p31ca/design-core — shell/store.ts
 *
 * The console store: the persisted heart of the P31 shell. Holds the cartridge
 * registry, the active cartridge, and the user-picked-theme flag, and wires
 * them to the canon theme-store (also persisted, key `p31-portal-theme`) so
 * theme-travel survives reloads.
 *
 * Theme-travel rule (the invariant, encoded in resolveShellTheme):
 *   the user's picked theme wins across cartridges; a cartridge's themeDefault
 *   applies only on first load if the user never picked.
 *
 * The store is framework-agnostic zustand (same as theme-store) so the console
 * can be composed anywhere — a portal, the prototype host, or a test.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useThemeStore, type ThemeId } from '../theming/theme-store';
import { resolveShellTheme, validateCartridgeOwnership } from './cartridge';
import type { CartridgeManifest } from './cartridge';

export interface CartridgeRegistry {
  /** Ordered cartridge ids — the switcher order. */
  order: string[];
  /** id → manifest. The active cartridge's id is `active`. */
  byId: Record<string, CartridgeManifest>;
}

export interface CartridgeConsoleState {
  registry: CartridgeRegistry;
  active: string;
  /** True once the user picks a theme — the user's pick then travels. */
  userPickedTheme: boolean;
  /** The theme the user last picked (persisted, drives travel). */
  userTheme: ThemeId | null;

  register: (m: CartridgeManifest) => void;
  activate: (id: string) => void;
  pickTheme: (theme: ThemeId) => void;

  /** The resolved theme for the active cartridge (travel rule applied). */
  activeTheme: () => ThemeId;
  /** The active cartridge manifest. */
  activeManifest: () => CartridgeManifest | null;
  /** Validate + register a composer-produced manifest (the gate, one rule). */
  compose: (m: CartridgeManifest) => string[];
}

const EMPTY: CartridgeRegistry = { order: [], byId: {} };

/** Register a cartridge (idempotent on id). Returns violations (empty = ok). */
function validateAndRegister(
  registry: CartridgeRegistry,
  m: CartridgeManifest,
): { registry: CartridgeRegistry; violations: string[] } {
  // Validate ownership — the gate + the composer share this one rule.
  const violations = validateCartridgeOwnership(m);
  if (violations.length > 0) return { registry, violations };

  const byId = { ...registry.byId, [m.id]: m };
  const order = registry.order.includes(m.id) ? registry.order : [...registry.order, m.id];
  return { registry: { order, byId }, violations: [] };
}

export const useCartridgeConsole = create<CartridgeConsoleState>()(
  persist(
    (set, get) => ({
      registry: EMPTY,
      active: '',
      userPickedTheme: false,
      userTheme: null,

      register: (m) => {
        const { registry, violations } = validateAndRegister(get().registry, m);
        if (violations.length > 0) return;
        // First registered cartridge becomes the active one (console boot).
        set({ registry, active: get().active || m.id });
      },

      activate: (id) => {
        if (!get().registry.byId[id]) return;
        set({ active: id });
      },

      pickTheme: (theme) => {
        set({ userTheme: theme, userPickedTheme: true });
        // Write the canon theme-store — the persisted single source (it owns
        // the CSS-var application via applyTheme).
        useThemeStore.getState().setTheme(theme);
      },

      activeTheme: () => {
        const { registry, active, userTheme, userPickedTheme } = get();
        const m = registry.byId[active];
        return resolveShellTheme({
          userTheme,
          userPicked: userPickedTheme,
          cartridgeThemeDefault: m?.themeDefault,
        });
      },

      activeManifest: () => get().registry.byId[get().active] ?? null,

      compose: (m) => {
        const { registry, violations } = validateAndRegister(get().registry, m);
        if (violations.length === 0) {
          set({ registry, active: m.id });
        }
        return violations;
      },
    }),
    {
      name: 'p31-shell-console',
      partialize: (s) => ({
        registry: s.registry,
        active: s.active,
        userPickedTheme: s.userPickedTheme,
        userTheme: s.userTheme,
      }),
    },
  ),
);