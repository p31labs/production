import type { ShellConfig } from '@p31ca/design-core/shell';

/**
 * forge.config.ts — the forge as a configuration.
 *
 * Same canon shell as the design portal, different blocks — the "same shell on
 * first load" goal stated correctly: not a port, a config. Wave 2 consumes it
 * via the shell renderer; the full App.tsx → config extraction is tracked.
 */
export const forgeConfig: ShellConfig = {
  shell: {
    header: { topbar: 'canon' },
    // Per-route block placements arrive with the Composer (Wave 3). The frame
    // adoption must not force a block onto every route — main stays empty.
    main: [],
  },
};