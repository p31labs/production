/**
 * @p31ca/canon-astro — public surface.
 * The Astro wrapper world: server-only .astro components, same names and
 * semantic props as the canon-v2 seed (design-core src/compositions/canon-v2)
 * and as @p31ca/canon-react. Content props are named slots; text props are
 * plain props. Import CSS separately:
 *   import '@p31ca/canon/tokens.css';
 *   import '@p31ca/canon/css/layers.css';
 *   import '@p31ca/canon-parts/recipes.css';
 */

export { default as Shell } from './components/Shell.astro';
export { default as Page } from './components/Page.astro';
export { default as PagePanel } from './components/PagePanel.astro';
export { default as PageHeader } from './components/PageHeader.astro';
export { default as PageHeaderV2 } from './components/PageHeaderV2.astro';
export { default as Stack } from './components/Stack.astro';
export { default as Grid } from './components/Grid.astro';
export { default as Split } from './components/Split.astro';
export { default as Field } from './components/Field.astro';
export { default as Input } from './components/Input.astro';
export { default as Textarea } from './components/Textarea.astro';
export { default as Select } from './components/Select.astro';
export { default as Tabs } from './components/Tabs.astro';
export { default as Menu } from './components/Menu.astro';
export { default as Dialog } from './components/Dialog.astro';
export { default as Sheet } from './components/Sheet.astro';
export { default as EmptyState } from './components/EmptyState.astro';
export { default as ErrorState } from './components/ErrorState.astro';
export { default as Skeleton } from './components/Skeleton.astro';
export { default as SkeletonBar } from './components/SkeletonBar.astro';
export { default as ListingShell } from './components/ListingShell.astro';
export { default as DetailShell } from './components/DetailShell.astro';
export { default as Wizard } from './components/Wizard.astro';