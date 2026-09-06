import { MOODS, MOOD_MESSAGES } from '../lib/constants';

interface MoodGridProps {
  selectedMood: string | null;
  onSelectMood: (mood: string) => void;
}

export default function MoodGrid({ selectedMood, onSelectMood }: MoodGridProps) {
  return (
    <div className="mood-grid" id="moodGrid">
      {MOODS.map((mood) => (
        <button
          key={mood.key}
          className={`mood-btn${selectedMood === mood.key ? ' selected' : ''}`}
          onClick={() => onSelectMood(mood.key)}
          aria-label={mood.label}
        >
          {mood.emoji}
          <span className="label">{mood.label}</span>
        </button>
      ))}
    </div>
  );
}
