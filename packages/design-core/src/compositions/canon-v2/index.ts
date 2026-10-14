/**
 * @file canon-v2 — the attribute-scoped canon v2 composition family.
 *
 * These are the vessel-contract components (docs/plans/canon-v2-contract.md):
 * layout primitives (Shell/Page/Stack/Grid/Split), the page header, controls
 * (Field/Input/Textarea/Select/Tabs/Menu/Dialog/Sheet), states
 * (EmptyState/ErrorState/Skeleton), and the three patterns
 * (ListingShell/DetailShell/Wizard).
 *
 * Every component is a thin [data-p31=…] wrapper with zero CSS of its own —
 * the styles live in `@p31ca/design-core/css/canon-v2.css`, layered in
 * @layer canon.layout / canon.components. Consumers import tokens + that
 * stylesheet once; faces ship NO CSS.
 */

export { Shell, type ShellProps } from './Shell';
export { Page, PagePanel, type PageProps, type PagePanelProps, type PageMode } from './Page';
export { PageHeader, PageHeaderV2, type PageHeaderProps, type PageHeaderV2Props } from './PageHeader';
export { Stack, type StackProps, type StackDir, type StackGap, type StackAlign, type StackJustify } from './Stack';
export { Grid, type GridProps, type GridMin } from './Grid';
export { Split, type SplitProps } from './Split';
export { Field, type FieldProps } from './Field';
export { Input, type InputProps } from './Input';
export { Textarea, type TextareaProps } from './Textarea';
export { Select, type SelectProps, type SelectOption } from './Select';
export { Tabs, type TabsProps, type TabItem } from './Tabs';
export { Menu, type MenuProps, type MenuItem } from './Menu';
export { Dialog, type DialogProps } from './Dialog';
export { Sheet, type SheetProps, type SheetSide } from './Sheet';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { ErrorState, type ErrorStateProps } from './ErrorState';
export { Skeleton, SkeletonBar, type SkeletonProps, type SkeletonBarProps } from './Skeleton';
export { ListingShell, type ListingShellProps } from './ListingShell';
export { DetailShell, type DetailShellProps } from './DetailShell';
export { Wizard, type WizardProps, type WizardStep } from './Wizard';