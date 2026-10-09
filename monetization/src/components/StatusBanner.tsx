interface StatusBannerProps {
  kind?: 'warn' | 'error';
  children: React.ReactNode;
}

/** StatusBanner — degradation / offline notices (graceful-degradation matrix). */
export function StatusBanner({ kind, children }: StatusBannerProps) {
  return (
    <div className="status-banner" data-kind={kind === 'error' ? 'error' : undefined} role="status">
      {children}
    </div>
  );
}

export default StatusBanner;