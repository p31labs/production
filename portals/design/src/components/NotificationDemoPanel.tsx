import { useState, useEffect, useRef } from 'react';
import { GlassPanel } from '@p31/design-core/compositions';

interface Notification {
  id: string;
  icon: string;
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high';
  actions: { label: string; primary?: boolean }[];
  color: string;
}

interface NotificationHistory {
  id: string;
  icon: string;
  title: string;
  body: string;
  time: string;
}

const TEMPLATES: Record<string, Omit<Notification, 'id'>> = {
  meds: { icon: '⏰', title: 'Time for your morning meds', body: 'Vitamin D, L-theanine. Take with food.', color: '#F59E0B', priority: 'high', actions: [{ label: 'Mark Taken', primary: true }, { label: 'Snooze 30m' }] },
  movement: { icon: '☕', title: "You've been focused for 90min", body: 'A 10-minute break helps. Walk, stretch.', color: '#10B981', priority: 'low', actions: [{ label: 'Take Break', primary: true }, { label: 'Snooze 30m' }] },
  social: { icon: '👤', title: 'Bash sent you a message', body: 'Read when ready.', color: '#8B5CF6', priority: 'low', actions: [{ label: 'Open Chat', primary: true }, { label: 'Snooze' }] },
  bonding: { icon: '🎮', title: 'Bash is in BONDING', body: 'Want to build something together?', color: '#00F0FF', priority: 'medium', actions: [{ label: 'Join Game', primary: true }, { label: 'Snooze 1h' }] },
  grants: { icon: '📝', title: 'ASAN grant due in 3 days', body: 'Your draft is 90% done. Finalize today?', color: '#F43F5E', priority: 'high', actions: [{ label: 'View Draft', primary: true }, { label: 'Snooze' }] },
};

const OPT_IN_KEYS = ['meds', 'movement', 'social', 'bonding', 'grants'];
const OPT_IN_LABELS: Record<string, string> = { meds: 'Medication', movement: 'Movement breaks', social: 'Social messages', bonding: 'BONDING activity', grants: 'Grant deadlines' };

function NotificationDemoPanel() {
  const [spoons, setSpoons] = useState(3);
  const [opts, setOpts] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('p31-design-opts');
    return saved ? JSON.parse(saved) : { meds: true, movement: true, social: true, bonding: true, grants: true };
  });
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [history, setHistory] = useState<NotificationHistory[]>(() => {
    const s = localStorage.getItem('p31-design-notif-history');
    return s ? JSON.parse(s) : [];
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { localStorage.setItem('p31-design-opts', JSON.stringify(opts)); }, [opts]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let w = 300, h = 400, raf = 0, running = true;
    const particles: { x: number; y: number; r: number; vx: number; vy: number; a: number; color: [number,number,number] }[] = [];

    function layout() { const r = canvas.getBoundingClientRect(); w = r.width; h = r.height; canvas.width = w; canvas.height = h; }
    function seed() {
      particles.length = 0;
      const n = spoons <= 1 ? 8 : spoons <= 3 ? 25 : 50;
      for (let i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.2 + 0.4,
          vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
          a: Math.random() * 0.15 + 0.04,
          color: Math.random() < 0.3 ? [200, 100, 70] : [0, 200, 220],
        });
      }
    }

    function draw() {
      const speed = spoons <= 1 ? 0.02 : spoons <= 3 ? 0.5 : 1;
      ctx.fillStyle = 'rgba(10,10,15,0.25)';
      ctx.fillRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx * speed; p.y += p.vy * speed;
        if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; if (p.y > h + 10) p.y = -10;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${p.a})`;
        ctx.fill();
      }
    }

    function frame() { if (!running) return; draw(); raf = requestAnimationFrame(frame); }
    layout(); seed(); raf = requestAnimationFrame(frame);
    window.addEventListener('resize', () => { layout(); seed(); });
    return () => { running = false; cancelAnimationFrame(raf); };
  }, [spoons]);

  const trigger = (type: string) => {
    if (!opts[type] || spoons === 0) return;
    const t = TEMPLATES[type];
    if (!t) return;
    const id = `${type}-${Date.now()}`;
    const n: Notification = { ...t, id };
    setNotifs(prev => [...prev, n]);
    setHistory(prev => {
      const nh = [...prev, { id: n.id, icon: n.icon, title: n.title, body: n.body, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
      const trimmed = nh.slice(-20);
      localStorage.setItem('p31-design-notif-history', JSON.stringify(trimmed));
      return trimmed;
    });
    if (n.priority !== 'high') {
      const base = n.priority === 'low' ? 6000 : 10000;
      setTimeout(() => close(id), base * Math.max(1, 6 - spoons));
    }
  };

  const close = (id: string) => { setNotifs(prev => prev.filter(n => n.id !== id)); };

  return (
    <div className="flex flex-col gap-6">
      <GlassPanel>
        <canvas ref={canvasRef} className="w-full h-48 rounded-xl block" />
        <div className="text-center text-[11px] text-text-tertiary font-mono mt-2">
          Jitterbug Starfield · {spoons <= 1 ? 8 : spoons <= 3 ? 25 : 50} particles · speed {spoons <= 1 ? '0.02' : spoons <= 3 ? '0.5' : '1.0'}×
        </div>
      </GlassPanel>

      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            onClick={() => setSpoons(s)}
            className="px-4 py-2 rounded-lg border-none cursor-pointer font-medium text-xs transition-all"
            style={{
              background: spoons === s ? 'var(--p31-accent)' : 'rgba(255,255,255,0.06)',
              color: spoons === s ? '#0a0e14' : 'var(--p31-text)',
              fontWeight: spoons === s ? 600 : 400,
            }}
          >
            {s === 0 ? '🧘 Sensory Rest' : `🥄 ${s}`}
          </button>
        ))}
      </div>

      {spoons === 0 && (
        <div className="p-4 rounded-xl border border-accent-red/20 text-xs" style={{ background: 'rgba(251,113,133,0.1)', color: 'var(--p31-accent-red)' }}>
          🧘 Sensory rest active. Notifications muted. Background subdued.
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        {OPT_IN_KEYS.map(k => (
          <label key={k} className="flex items-center gap-2 text-xs cursor-pointer text-text-secondary">
            <input
              type="checkbox"
              checked={opts[k]}
              onChange={e => setOpts(prev => ({ ...prev, [k]: e.target.checked }))}
              style={{ accentColor: 'var(--p31-accent)' }}
            />
            <span>{OPT_IN_LABELS[k]}</span>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {Object.entries(TEMPLATES).map(([key, t]) => (
          <button
            key={key}
            onClick={() => trigger(key)}
            className="p-3 rounded-lg border-none cursor-pointer text-left text-xs transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--p31-text)',
              borderLeft: `3px solid ${t.color}`,
            }}
          >
            {t.icon} {t.title}
          </button>
        ))}
      </div>

      {notifs.length > 0 && (
        <div className="flex flex-col gap-2">
          {notifs.map(n => (
            <div
              key={n.id}
              className="p-3 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderLeft: `4px solid ${n.color}`,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex gap-2 items-start">
                <span className="text-lg">{n.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{n.title}</div>
                  <div className="text-[11px] text-text-secondary mt-1">{n.body}</div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {n.actions.map((a, i) => (
                      <button
                        key={i}
                        onClick={() => close(n.id)}
                        className="px-2 py-1 rounded-md border-none cursor-pointer text-[11px] font-semibold"
                        style={{
                          background: a.primary ? n.color : 'rgba(255,255,255,0.06)',
                          color: a.primary ? '#0A0A0F' : 'var(--p31-text)',
                        }}
                      >
                        {a.label}
                      </button>
                    ))}
                    <button
                      onClick={() => close(n.id)}
                      className="px-2 py-1 rounded-md border border-glass-border cursor-pointer bg-transparent text-text-tertiary text-[11px]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-text-secondary mb-2">📋 Notification History ({history.length})</summary>
          <div className="flex flex-col gap-1">
            {history.slice(-10).reverse().map(h => (
              <div key={h.id} className="flex gap-2 items-center text-xs p-2 rounded-md" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span>{h.icon}</span>
                <span className="text-text">{h.title}</span>
                <span className="text-text-tertiary ml-auto font-mono">{h.time}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="p-3 rounded-xl text-xs text-text-tertiary leading-relaxed" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="font-semibold text-text mb-1">Notification Rules</div>
        <ul className="list-disc list-inside space-y-1">
          <li>No badges or sound by default</li>
          <li>Tone is warm, factual, never demanding</li>
          <li>Respects current Spoon level — mutes at 🧘 (0)</li>
          <li>Offer choices ("when you're ready")</li>
          <li>One-tap dismissal, no guilt trips</li>
          <li>High priority persists until dismissed; low auto-dismisses</li>
          <li>History persisted locally (last 20 events)</li>
        </ul>
      </div>
    </div>
  );
}

export default NotificationDemoPanel;
