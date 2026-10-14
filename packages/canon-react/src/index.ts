/**
 * @p31ca/canon-react — public surface.
 * The React 19 wrapper world. Same names, prop shapes, and data-p31 markup
 * as the canon-v2 seed (design-core src/compositions/canon-v2) and as
 * @p31ca/canon-astro. Import CSS separately:
 *   import '@p31ca/canon/tokens.css';
 *   import '@p31ca/canon/css/layers.css';
 *   import '@p31ca/canon-parts/recipes.css';
 */

export { Shell, type ShellProps } from './components/Shell.js';
export { Page, PagePanel, type PageProps, type PagePanelProps, type PageMode } from './components/Page.js';
export { PageHeader, PageHeaderV2, type PageHeaderProps, type PageHeaderV2Props } from './components/PageHeader.js';
export { Stack, type StackProps, type StackDir, type StackGap, type StackAlign, type StackJustify } from './components/Stack.js';
export { Grid, type GridProps, type GridMin } from './components/Grid.js';
export { Split, type SplitProps } from './components/Split.js';
export { Field, type FieldProps } from './components/Field.js';
export { Input, type InputProps } from './components/Input.js';
export { Textarea, type TextareaProps } from './components/Textarea.js';
export { Select, type SelectProps, type SelectOption } from './components/Select.js';
export { Tabs, type TabsProps, type TabItem } from './components/Tabs.js';
export { Menu, type MenuProps, type MenuItem } from './components/Menu.js';
export { Dialog, type DialogProps } from './components/Dialog.js';
export { Sheet, type SheetProps, type SheetSide } from './components/Sheet.js';
export { EmptyState, type EmptyStateProps } from './components/EmptyState.js';
export { ErrorState, type ErrorStateProps } from './components/ErrorState.js';
export { Skeleton, SkeletonBar, type SkeletonProps, type SkeletonBarProps } from './components/Skeleton.js';
export { ListingShell, type ListingShellProps } from './components/ListingShell.js';
export { DetailShell, type DetailShellProps } from './components/DetailShell.js';
export { Wizard, type WizardProps, type WizardStep } from './components/Wizard.js';