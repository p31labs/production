import type { CSSProperties, ReactNode } from 'react';
import { pageHeaderTree} from '@p31ca/canon-parts/markup';
import { nodeToReact, pass } from '../reactTree.js';

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Pinned action cluster (canon Buttons compose here). */
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** PageHeader — the canon v2 page header (React world). */
export function PageHeader({ title, subtitle, actions, className = '', style }: PageHeaderProps) {
  const tree = pageHeaderTree({
    title: pass(title),
    subtitle: subtitle != null ? pass(subtitle) : null,
    actions: actions != null ? pass(actions) : null,
    className,
    style,
  });
  return nodeToReact(tree);
}

export { PageHeader as PageHeaderV2 };
export type { PageHeaderProps as PageHeaderV2Props };

export default PageHeader;