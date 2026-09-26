/**
 * surface — the enterprise surface template. Every surface renders through
 * these primitives so spacing, centering, alignment and balance are authored
 * ONCE, not per-page. Matches M3/Coinbase/Carbon rhythm:
 *   max-width 1200px · gutter 32px · section gap 64px · card gap 20px.
 */
import { type ReactNode, type CSSProperties } from 'react';

export function SurfaceLayout({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`surface-layout${className ? ` ${className}` : ''}`}>{children}</div>;
}

interface SurfaceHeroProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  actions?: ReactNode;
}

/** SurfaceHero — the header card every surface gets (the Home/launcher look). */
export function SurfaceHero({ eyebrow, title, lede, actions }: SurfaceHeroProps) {
  return (
    <div className="glass-tile surface-hero" data-mcp-tool="surfaceHero" data-mcp-state="ready">
      <div className="surface-hero__main">
        {eyebrow && <span className="surface-hero__eyebrow">{eyebrow}</span>}
        <h1 className="greeting-h1">{title}</h1>
        {lede && <p className="surface-hero__lede">{lede}</p>}
      </div>
      {actions && <div className="surface-hero__actions">{actions}</div>}
    </div>
  );
}

/** SurfaceSection — vertical rhythm between blocks (gap 64px). */
export function SurfaceSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="surface-section">
      {title && <h3 className="surface-section__title">{title}</h3>}
      {children}
    </section>
  );
}

/** SurfaceGrid — consistent card gap (20px), N columns. */
export function SurfaceGrid({ columns = 2, children }: { columns?: number; children: ReactNode }) {
  return (
    <div
      className="surface-grid"
      style={{ '--surface-grid-cols': columns } as CSSProperties}
    >
      {children}
    </div>
  );
}