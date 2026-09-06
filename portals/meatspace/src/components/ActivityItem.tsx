import type { Activity } from '../lib/game';
import { timeAgo } from '../lib/game';

interface ActivityItemProps {
  activity: Activity;
}

export default function ActivityItem({ activity }: ActivityItemProps) {
  return (
    <div className="act-item">
      <span className="act-icon">{activity.icon}</span>
      <span className="act-text">{activity.text}</span>
      <span className="act-time">{timeAgo(activity.ts)}</span>
    </div>
  );
}
