/**
 * @p31ca/canon-parts — markup.mjs type declarations.
 * Hand-written mirror of the markup tree core (no TS build in this package).
 */

export interface MarkupNode {
  tag: string;
  attrs?: [string, unknown][];
  children: MarkupChild[];
}
export type MarkupChild =
  | MarkupNode
  | { raw: string }
  | { passthrough: unknown }
  | string
  | number
  | null
  | undefined;

export function escapeText(s: unknown): string;
export function renderHtml(node: MarkupNode | MarkupChild | null | undefined): string;

export interface ShellMarkup { topbar?: MarkupChild; sidebar?: MarkupChild; children?: MarkupChild; mainId?: string; skipLabel?: string; className?: string; style?: object; }
export function shellTree(p: ShellMarkup): MarkupNode;
export function pageTree(p: { mode?: 'flow' | 'fill' | 'panel-scroll' | 'fit'; children?: MarkupChild; className?: string; style?: object }): MarkupNode;
export function pagePanelTree(p: { children?: MarkupChild; className?: string; style?: object }): MarkupNode;
export function pageHeaderTree(p: { title?: MarkupChild; subtitle?: MarkupChild; actions?: MarkupChild; className?: string; style?: object }): MarkupNode;
export function stackTree(p: { dir?: 'row' | 'column'; gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; align?: 'start' | 'center' | 'end' | 'stretch'; justify?: 'start' | 'center' | 'end' | 'between'; children?: MarkupChild; className?: string; style?: object }): MarkupNode;
export function gridTree(p: { min?: 'sm' | 'md' | 'lg'; children?: MarkupChild; className?: string; style?: object }): MarkupNode;
export function splitTree(p: { a?: MarkupChild; b?: MarkupChild; ratio?: number; collapsed?: boolean; collapsible?: boolean; dragging?: boolean; ariaLabelA?: string; ariaLabelB?: string; className?: string; style?: object }): MarkupNode;
export function fieldTree(p: { label?: MarkupChild; hideLabel?: boolean; hint?: string; error?: string; width?: 'form' | 'full'; controlId?: string; control?: MarkupChild; className?: string; style?: object }): MarkupNode;
export function inputTree(p: { label?: MarkupChild; hideLabel?: boolean; hint?: string; error?: string; width?: 'form' | 'full'; id?: string; className?: string; rest?: Record<string, unknown> }): MarkupNode;
export function textareaTree(p: { label?: MarkupChild; hideLabel?: boolean; hint?: string; error?: string; width?: 'form' | 'full'; id?: string; className?: string; rows?: number; rest?: Record<string, unknown> }): MarkupNode;
export function selectTree(p: { label?: MarkupChild; hideLabel?: boolean; hint?: string; error?: string; width?: 'form' | 'full'; id?: string; className?: string; options?: { value: string; label: string }[]; rest?: Record<string, unknown> }): MarkupNode;
export function tabsTree(p: { items?: { id: string; label: string }[]; activeId?: string; ariaLabel?: string; className?: string; style?: object }): MarkupNode;
export function menuTree(p: { items?: { id: string; label: MarkupChild; icon?: MarkupChild }[]; ariaLabel?: string; className?: string; style?: object }): MarkupNode;
export function dialogTree(p: { open?: boolean; title?: MarkupChild; children?: MarkupChild; labelledBy?: string; className?: string; style?: object }): MarkupNode | null;
export function sheetTree(p: { open?: boolean; title?: MarkupChild; children?: MarkupChild; side?: 'start' | 'end'; labelledBy?: string; className?: string; style?: object }): MarkupNode | null;
export function emptyStateTree(p: { title?: MarkupChild; description?: MarkupChild; action?: MarkupChild; className?: string; style?: object }): MarkupNode;
export function errorStateTree(p: { title?: MarkupChild; description?: MarkupChild; action?: MarkupChild; className?: string; style?: object }): MarkupNode;
export function skeletonBarTree(p: { shape?: 'bar' | 'block'; className?: string; style?: object }): MarkupNode;
export function skeletonTree(p: { lines?: number; block?: boolean; className?: string; style?: object }): MarkupNode;
export function listingShellTree(p: { controls?: MarkupChild; children?: MarkupChild | MarkupChild[] | null; empty?: MarkupChild; emptyTitle?: MarkupChild; emptyDescription?: MarkupChild; className?: string; style?: object }): MarkupNode;
export function detailShellTree(p: { summary?: MarkupChild; focus?: MarkupChild; actions?: MarkupChild; className?: string; style?: object }): MarkupNode;
export function wizardTree(p: { steps?: { id: string; title: string }[]; activeIndex?: number; children?: MarkupChild; backLabel?: string; nextLabel?: string; finishLabel?: string; className?: string; style?: object }): MarkupNode;