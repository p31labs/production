interface StatCardProps {
  value: string | number;
  label: string;
  children?: React.ReactNode;
}

export default function StatCard({ value, label, children }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
      {children}
    </div>
  );
}
