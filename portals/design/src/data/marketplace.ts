/**
 * Marketplace data — derived from the design-core genui component catalog
 * (70 entries) plus the canonical compositions. Spoon cost and LOVE price are
 * deterministic functions of category/status, so the shop is stable across
 * renders and agent-assertable.
 */
import { COMPONENT_CATALOG } from '@p31ca/design-core/genui/catalog';

interface GenuiEntry {
  name: string
  description: string
  category?: string
  status?: 'stable' | 'beta' | 'deprecated'
  importPath?: string
  source?: 'canonical' | 'generated'
  tokens?: string[]
  variants?: string[]
  slots?: string[]
  accessibility?: string[]
  cssClass?: string
}

export interface ShopItem {
  name: string;
  description: string;
  category: string;
  status: 'stable' | 'beta' | 'deprecated';
  importPath: string;
  source: 'canonical' | 'generated';
  spoonCost: number;
  lovePrice: number;
  tokens: string[];
  variants: string[];
  slots: string[];
  states: string[];
  a11y: string[];
  cssClass: string;
}

const CATEGORY_SPOONS: Record<string, number> = {
  action: 1,
  feedback: 1,
  navigation: 2,
  surface: 2,
  accessibility: 1,
  ambient: 3,
}

const CATEGORY_WEIGHT: Record<string, number> = {
  action: 2,
  feedback: 2,
  navigation: 3,
  surface: 3,
  accessibility: 1,
  ambient: 4,
}

/** Deterministic LOVE price — complexity × tier × category, clamped 1–50. */
export function lovePrice(name: string, spoonCost: number, category: string): number {
  const seed = [...name].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0)
  const tier = 1 + (Math.abs(seed) % 3)
  const weight = CATEGORY_WEIGHT[category] ?? 2
  const base = Math.round(spoonCost * tier * weight)
  return Math.max(1, Math.min(50, base))
}

export function spoonCostFor(category: string): number {
  return CATEGORY_SPOONS[category] ?? 2
}

function entryToItem(e: GenuiEntry): ShopItem {
  const category = e.category ?? 'surface'
  const spoon = spoonCostFor(category)
  return {
    name: e.name,
    description: e.description,
    category,
    status: e.status ?? 'stable',
    importPath: e.importPath ?? '@p31ca/design-core/generated',
    source: e.source ?? 'canonical',
    spoonCost: spoon,
    lovePrice: lovePrice(e.name, spoon, category),
    tokens: e.tokens ?? [],
    variants: e.variants ?? [],
    slots: e.slots ?? [],
    states: (e.variants ?? []).length ? [...(e.variants ?? [])] : ['default'],
    a11y: e.accessibility ?? [],
    cssClass: e.cssClass ?? '',
  }
}

/** Every component in the genui catalog, as a shop item. */
export const SHOP_ITEMS: ShopItem[] = (COMPONENT_CATALOG as unknown as GenuiEntry[]).map(entryToItem)

export const SHOP_CATEGORIES = ['all', 'surface', 'navigation', 'action', 'feedback', 'accessibility', 'ambient']

export function shopCounts(): Record<string, number> {
  const c: Record<string, number> = { all: SHOP_ITEMS.length }
  for (const it of SHOP_ITEMS) c[it.category] = (c[it.category] ?? 0) + 1
  return c
}