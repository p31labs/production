import type { ReactNode } from 'react';
import { useShellStore } from '../store/useShellStore';

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  controls?: ReactNode;
  variant?: 'default' | 'hero' | 'sandbox';
  className?: string;
  /** Page key for the pocket card — enables the ⓘ button */
  pageKey?: string;
  /** Explicit popover text (kept for backward compat; prefer pocket card) */
  infoText?: string;
  /** Popover title (kept for backward compat) */
  infoTitle?: string;
}

export default function PageHeader({
  title,
  description,
  icon,
  controls,
  variant = 'default',
  className = '',
  pageKey,
  infoText,
  infoTitle,
}: PageHeaderProps) {
  const openPocketCard = useShellStore((s) => s.openPocketCard);
  const showPocket = !!(pageKey || infoText);

  return (
    <header className={`page-header ${variant}${className ? ` ${className}` : ''}`} role="banner">
      <div className="page-header__left">
        {icon && <div className="page-header__icon">{icon}</div>}
        <div className="page-header__title-group">
          <div className="page-header__title-row">
            <h1 className="page-header__title">{title}</h1>
            {showPocket && (
              <button
                className="page-header__info-btn"
                onClick={() => openPocketCard(pageKey || title, 'info')}
                aria-label="More information"
                aria-haspopup="true"
                type="button"
              >
                <span className="info-icon">ⓘ</span>
              </button>
            )}
          </div>
          {!showPocket && description && (
            <p className="page-header__desc">{description}</p>
          )}
        </div>
      </div>

      {controls && (
        <div className="page-header__controls" role="group" aria-label="Page actions">
          {controls}
        </div>
      )}
    </header>
  );
}
