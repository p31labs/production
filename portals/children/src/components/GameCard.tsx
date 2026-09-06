interface GameCardProps {
  icon: string;
  title: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
}

export default function GameCard({ icon, title, desc, onClick, disabled }: GameCardProps) {
  return (
    <div
      className="game-card"
      onClick={disabled ? undefined : onClick}
      style={{
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <div className="game-icon">{icon}</div>
      <div className="game-title">{title}</div>
      <div className="game-desc">{desc}</div>
    </div>
  );
}
