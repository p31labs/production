import { TOPICS } from '../lib/constants';

interface LearnPageProps {
  active: boolean;
  onStartTopic: () => void;
}

export default function LearnPage({ active, onStartTopic }: LearnPageProps) {
  return (
    <section className={`page${active ? ' active' : ''}`} id="page-learn" role="tabpanel">
      <h2>📚 Learn</h2>
      <p className="subtitle">Discover something new today</p>

      {TOPICS.map((topic) => (
        <div key={topic.key} className="companion-card" style={{ marginBottom: 'var(--p31-space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-md)' }}>
            <span style={{ fontSize: 'var(--p31-scale-3xl)' }}>{topic.icon}</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: 'var(--p31-font-display)', fontSize: 'var(--p31-type-h3)' }}>{topic.title}</h3>
              <p style={{ fontSize: 'var(--p31-type-body)', color: 'var(--p31-text-secondary)' }}>{topic.desc}</p>
            </div>
            <button
              className="button secondary"
              style={{ fontSize: 'var(--p31-type-caption)', padding: 'var(--p31-space-xs) var(--p31-space-md)', minHeight: '40px' }}
              onClick={onStartTopic}
            >
              Start
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
