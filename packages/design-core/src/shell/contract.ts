/**
 * @p31ca/design-core — shell/contract.ts
 *
 * The shell contract: the named-slot application frame that blocks target.
 * This is the load-bearing contract for composition — a "place a block" action
 * is meaningless until the shell declares where blocks can go, what categories
 * each slot accepts, and how placements order.
 *
 *   shell
 *     ├─ header   : Topbar (canon, slot-based: brand/center/statusCluster/mode/trailing)
 *     ├─ main     : BlockList — ordered, category-typed page blocks
 *     ├─ aside    : (optional) BlockList — secondary rail
 *     └─ ambient  : AmbientLayer (dome/starfield/heart — the living background)
 *
 * The Loom event body for a composition placement carries a BlockPlacement
 * (see @p31ca/canon loom/gate propose body). The propose/approve pair commits
 * it; the reducer derives placed-block state from approved proposals.
 */

/** Named slots at the application-frame level. */
export type ShellSlot = 'header' | 'main' | 'aside' | 'ambient';

/** Block categories — what a slot accepts. A block is a composition of canon
 *  components wired to real state (Vuesax), NOT a single component. */
export type BlockCategory = 'page' | 'ambient';

/** What each slot accepts, per category. One category per slot for now —
 *  additive if a slot needs to accept more later. */
export const SHELL_SLOT_CATEGORY: Record<ShellSlot, BlockCategory | null> = {
  header: null,    // Topbar is the canon slot-based header, not a block list
  main: 'page',
  aside: 'page',
  ambient: 'ambient',
};

/** A block placement — the unit a propose event's body carries, and what the
 *  reducer derives into the shell's placed-block list. `props` is the block's
 *  configured fields (the page-builder pattern: each placement records the
 *  block type, its slot, its order, and the fields it declares). */
export interface BlockPlacement {
  blockId: string;
  slot: ShellSlot;
  /** 0-based position within the slot's block list. */
  order: number;
  /** The block's configured fields, passed to the block component. */
  props?: Record<string, unknown>;
}

/** A block definition — the registry entry an agent (LUMI) and a human both
 *  discover. `category` must match its target slot (SHELL_SLOT_CATEGORY). */
export interface BlockDefinition {
  /** Canonical id, e.g. 'evidence-block'. Referenced by BlockPlacement.blockId. */
  id: string;
  /** The canon composition name, e.g. 'EvidenceBlock'. */
  name: string;
  type: 'registry:block';
  category: BlockCategory;
  description: string;
  status: 'stable' | 'beta' | 'deprecated';
  /** Props schema — the contract a proposal must satisfy to be valid. */
  props: Record<string, string>;
  importPath: string;
  /** The human↔agent boundary: supervised means a human approves the placement. */
  confidence: 'autonomous' | 'supervised' | 'blocked';
}

/** Validate that a placement targets a slot which accepts the block's
 *  category. The gate + the composer both consult this — one rule. */
export function placementValid(block: BlockDefinition, placement: BlockPlacement): boolean {
  const category = SHELL_SLOT_CATEGORY[placement.slot];
  if (category === null) return false;
  return category === block.category;
}

/** A shell configuration — the render target. The forge/design portal become
 *  instances of this (design.config.ts / forge.config.ts). */
export interface ShellConfig {
  shell: {
    header: { topbar: 'canon' };
    main: BlockPlacement[];
    aside?: BlockPlacement[];
    ambient?: BlockPlacement[];
  };
}