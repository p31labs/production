interface TopbarProps {
  brand?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  onMenuClick?: () => void;
}

export default function Topbar({ brand, center, right, onMenuClick }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {onMenuClick && (
          <button className="topbar-menu-btn" onClick={onMenuClick} aria-label="Menu">
            <span className="hamburger" />
          </button>
        )}
        {brand && <div className="topbar-brand">{brand}</div>}
      </div>
      {center && <div className="topbar-center">{center}</div>}
      {right && <div className="topbar-right">{right}</div>}
    </header>
  );
}
