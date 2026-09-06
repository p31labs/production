import TetrahedronVisualizer from './TetrahedronVisualizer';
import { useMeshTetraNodes } from '../hooks/useMeshTetraNodes';

interface HomePageProps {
  active: boolean;
  mood: string | null;
  questProgress: number;
  userName: string;
  onMoodSelect: (mood: string) => void;
  onNavigate: (tab: 'home' | 'play' | 'talk' | 'learn' | 'profile') => void;
}

const moodOptions = [
  { key: 'amazing', emoji: '😄', label: 'Amazing' },
  { key: 'good', emoji: '🙂', label: 'Good' },
  { key: 'okay', emoji: '😐', label: 'Okay' },
  { key: 'meh', emoji: '😕', label: 'Meh' },
  { key: 'tough', emoji: '😢', label: 'Tough' },
];

const moodMessages: Record<string, string> = {
  amazing: "That is wonderful! Let's make it a great day! 🌟",
  good: "Glad to hear it! 😊",
  okay: "That's okay. I'm here for you. 💚",
  meh: "Sometimes meh days happen. Want to talk? 🫂",
  tough: "I'm sorry. Would you like a hug? 🫂 or maybe a game? 🎮",
};

export default function HomePage({ active, mood, questProgress, userName, onMoodSelect, onNavigate }: HomePageProps) {
  const { nodes: tetraNodes } = useMeshTetraNodes();

  return (
    <section className={`page${active ? ' active' : ''}`} id="page-home" role="tabpanel">
      {/* Tetrahedron family mesh */}
      <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '20px', padding: '12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '2px solid var(--p31-glass-border)' }}>
        <TetrahedronVisualizer nodes={tetraNodes.length ? tetraNodes : []} edges={[]} phase={0.8} size={160} />
        <div style={{ fontSize: '11px', color: 'var(--p31-text-secondary)', fontFamily: 'var(--p31-font-mono)', marginTop: '4px' }}>
          {tetraNodes.filter(n => n.role !== 'ghost').length} in your family mesh
        </div>
      </div>

      <h2>🌿 Welcome!</h2>
      <p className="subtitle">How are you feeling today?</p>

      <div className="companion-card" style={{ marginBottom: 'var(--p31-space-lg)' }}>
        <div className="mood-grid">
          {moodOptions.map((m) => (
            <button
              key={m.key}
              className={`mood-btn${mood === m.key ? ' selected' : ''}`}
              onClick={() => onMoodSelect(m.key)}
              aria-label={m.label}
            >
              {m.emoji}
              <span className="label">{m.label}</span>
            </button>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 'var(--p31-space-md)', fontSize: 'var(--p31-type-body)', color: 'var(--p31-text-secondary)' }}>
          {mood ? moodMessages[mood] || 'Thanks for sharing how you feel.' : "Tap how you're feeling. I'm here for you."}
        </div>
      </div>

      <div className="grid-2">
        {['play', 'talk', 'learn', 'profile'].map((target) => (
          <div
            key={target}
            className="companion-card"
            style={{ cursor: 'pointer', textAlign: 'center' }}
            onClick={() => onNavigate(target as any)}
          >
            <div className="card-icon">
              {target === 'play' && '🎮'}
              {target === 'talk' && '💬'}
              {target === 'learn' && '📚'}
              {target === 'profile' && '👤'}
            </div>
            <h3>{target.charAt(0).toUpperCase() + target.slice(1)}</h3>
            <p>
              {target === 'play' && 'Games & activities'}
              {target === 'talk' && 'Chat with me'}
              {target === 'learn' && 'Explore & discover'}
              {target === 'profile' && 'Your space'}
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'var(--p31-space-lg)' }}>
        <div className="companion-card" style={{ background: 'rgba(200,120,60,0.08)', borderColor: 'var(--p31-accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-md)' }}>
            <span style={{ fontSize: 'var(--p31-scale-3xl)' }}>🌟</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--p31-type-h3)' }}>Daily Quest</div>
              <div style={{ fontSize: 'var(--p31-type-body)', color: 'var(--p31-text-secondary)' }}>
                Complete 3 activities today to earn a star!
              </div>
              <div style={{ marginTop: 'var(--p31-space-sm)', display: 'flex', gap: 'var(--p31-space-sm)' }}>
                <span style={{ background: 'var(--p31-accent-gold)', color: 'white', padding: '2px 12px', borderRadius: 'var(--p31-radius-full)', fontSize: 'var(--p31-type-caption)' }}>
                  ⭐ {questProgress}/3
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
