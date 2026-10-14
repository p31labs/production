import type { CSSProperties, ReactNode } from 'react';

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Pinned action cluster (canon Buttons compose here). */
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * PageHeader — the canon v2 attribute-scoped page header. Title / subtitle /
 * actions. Successor to the legacy `.page-header-route` composition; that
 * one stays until the portal port, this one is the new contract.
 */
export function PageHeader({ title, subtitle, actions, className = '', style }: PageHeaderProps) {
  return (
    <header data-p31="page-header" className={className} style={style}>
      <div data-p31="page-header-text">
        <h1 data-p31="page-header-title">{title}</h1>
        {subtitle && <p data-p31="page-header-subtitle">{subtitle}</p>}
      </div>
      {actions && <div data-p31="page-header-actions">{actions}</div>}
    </header>
  );
}

export { PageHeader as PageHeaderV2 };
export type { PageHeaderProps as PageHeaderV2Props };

export default PageHeader;