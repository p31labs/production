/**
 * surface — the enterprise surface template. Every surface renders through
 * these primitives so spacing, centering, alignment and balance are authored
 * ONCE, not per-page. Matches M3/Coinbase/Carbon rhythm:
 *   max-width 1200px · gutter 32px · section gap 64px · card gap 20px.
 */
import { type ElementType, type ReactNode, type CSSProperties } from 'react';
import { motion } from 'motion/react';

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

/** SurfaceGrid — consistent card gap (20px), N columns. The parent declares
 *  the shared 4 row tracks (head/body/meta/foot); SurfaceCards span them via
 *  subgrid for equal-height, aligned cards per row. */
export function SurfaceGrid({ columns = 2, className = '', children }: { columns?: number; className?: string; children: ReactNode }) {
  return (
    <div
      className={`surface-grid${className ? ` ${className}` : ''}`}
      style={{ '--surface-grid-cols': columns } as CSSProperties}
    >
      {children}
    </div>
  );
}

interface SurfaceCardProps {
  /** Row 1 — icon, badge, title. Required. */
  head: ReactNode;
  /** Row 2 — description / preview. Optional. */
  body?: ReactNode;
  /** Row 3 — tags, import path, metadata. Optional. */
  meta?: ReactNode;
  /** Row 4 — actions. Aligns to the bottom. Optional. */
  foot?: ReactNode;
  /** Escape hatch for a full-bleed card (skips the 4-slot subgrid). */
  bare?: boolean;
  className?: string;
  /** Motion props spread onto the root (motion.div) — lets a SurfaceCard be
   *  both a grid item AND the animated element (variants/initial/animate). */
  motionProps?: React.ComponentProps<typeof motion.div>;
}

/** SurfaceCard — the four-slot card contract. Every card in a grid renders
 *  through this primitive so slots align across each row (CSS subgrid) and
 *  overflow is a contract, not an afterthought. The prop API is the contract:
 *  exactly four slots; a fifth child is a type error. */
export function SurfaceCard({ head, body, meta, foot, bare = false, className = '', motionProps }: SurfaceCardProps) {
  const cls = `surface-card${bare ? ' surface-card--bare' : ''}${className ? ` ${className}` : ''}`;
  const Tag: ElementType = motionProps ? motion.div : 'div';
  const tagProps = { className: cls, ...(motionProps ?? {}) } as Record<string, unknown>;
  if (bare) {
    return (
      <Tag {...tagProps}>
        {head}
        {body}
        {meta}
        {foot}
      </Tag>
    );
  }
  return (
    <Tag {...tagProps}>
      <div className="surface-card__head">{head}</div>
      {body != null && <div className="surface-card__content">{body}</div>}
      {meta != null && <div className="surface-card__meta">{meta}</div>}
      {foot != null && <div className="surface-card__foot">{foot}</div>}
    </Tag>
  );
}