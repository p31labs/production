import { createRoot, type Root } from 'react-dom/client';
import A2UI, { type A2UIAction } from '../components/ui/A2UI';
import type { A2UIElement } from '../components/ui/catalog';

let hostRoot: Root | null = null;

export function renderA2UIHost(
  elements: A2UIElement[],
  container: HTMLElement,
  onAction?: A2UIAction,
  onToast?: (message: string, variant?: string) => void,
): number {
  if (!hostRoot) hostRoot = createRoot(container);
  hostRoot.render(<A2UI ui={elements} onAction={onAction} onToast={onToast} />);
  return elements.length;
}

export function clearA2UIHost(container: HTMLElement): void {
  hostRoot?.unmount();
  hostRoot = null;
  container.replaceChildren();
}
