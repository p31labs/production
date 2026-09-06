export default function PortalLoader({ portal }) {
  const icons = {
    child: { emoji: '🎈', label: 'Child Portal EDE' },
    teen: { emoji: '⚡', label: 'Teen Portal EDE' },
    admin: { emoji: '🛡️', label: 'Parent Admin EDE' },
  };

  const info = icons[portal] || { emoji: '⚡', label: 'Loading...' };

  return (
    <div className="portal-loader">
      <div className="loader-icon">{info.emoji}</div>
      <div className="loader-label">{info.label}</div>
      <div className="loader-spinner" />
    </div>
  );
}
