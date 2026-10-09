import type { ComponentType, ReactNode } from 'react';
import type { BlockPlacement, ShellConfig, ShellSlot } from './contract';

/** A block registry: blockId → the canon component that renders it. The portal
 *  supplies this (importing the canon blocks it composes). */
export type BlockRegistry = Record<string, ComponentType<any>>;

/** Resolve a placement's block component from the registry. */
export function blockForPlacement(registry: BlockRegistry, placement: BlockPlacement): ComponentType<any> | null {
  return registry[placement.blockId] ?? null;
}

/** Render a slot's placements in order. Unknown blockIds render as a visible
 *  no-op (the gate rejects invalid placements, so this is a render-time guard).
 *  Each placement passes its configured `props` to the block component. */
export function BlockList({ slot, registry }: { slot: BlockPlacement[]; registry: BlockRegistry }) {
  if (!slot || slot.length === 0) return null;
  return (
    <>
      {slot.map((p, i) => {
        const Block = blockForPlacement(registry, p);
        if (!Block) {
          return <div key={`${p.blockId}-${i}`} data-missing-block={p.blockId} />;
        }
        return <Block key={`${p.blockId}-${i}`} {...(p.props ?? {})} />;
      })}
    </>
  );
}

/** The app frame with named slots — header, main, aside, ambient. The portal
 *  fills `header`/`ambient` with its own chrome (canon Topbar wrapper, the
 *  ambient dome); `main`/`aside` are block lists resolved from the registry. */
export interface ShellFrameProps {
  header?: ReactNode;
  main: BlockPlacement[];
  aside?: BlockPlacement[];
  ambient?: ReactNode;
  registry: BlockRegistry;
  /** Content routed to the main slot (routes/pages) when the config names no
   *  blocks — the portal renders routes inside the shell. */
  children?: ReactNode;
}

/** The shell renderer — the Slice(d) pattern: a declarative manifest
 *  (ShellConfig) expanded into a rendered App tree. */
export function ShellFrame({ header, main, aside, ambient, registry, children }: ShellFrameProps) {
  return (
    <div className="p31-shell">
      {header}
      {ambient}
      <div className="p31-shell__body">
        {aside && aside.length > 0 && (
          <aside className="p31-shell__aside">
            <BlockList slot={aside} registry={registry} />
          </aside>
        )}
        <main className="p31-shell__main">
          <BlockList slot={main} registry={registry} />
          {children}
        </main>
      </div>
    </div>
  );
}

/** Render a ShellConfig with a block registry. The convergence function —
 *  config + registry → App tree. The portal's routes render as children. */
export function renderShellConfig(config: ShellConfig, registry: BlockRegistry, children?: ReactNode): ReactNode {
  const c = config.shell;
  return (
    <ShellFrame
      main={c.main}
      aside={c.aside}
      registry={registry}
      children={children}
    />
  );
}

/** The shell's named-slot CSS. */
export const SHELL_SLOTS: ShellSlot[] = ['header', 'main', 'aside', 'ambient'];