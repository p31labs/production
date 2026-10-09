import React, { useState, useEffect } from 'react';

export function ForgeStatusBar({ spoons, setSpoons, activePanel }: {
  spoons: number; setSpoons: (v: number) => void; activePanel: string | null;
}) {
  const [xp, setXp] = useState(0);
  const [love, setLove] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('https://membrane-coordinator.trimtab-signal.workers.dev/state');
        const data = await res.json();
        setXp(data.xp || 0); setLove(data.love || 0);
        setLevel(data.level || 1); setStreak(data.streak || 0);
      } catch {}
    };
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  const spoonLabels = ['CRISIS', 'LOW', 'LOW', 'MOD', 'HIGH', 'HIGH'];
  const spoonColors = ['#ef4444', '#ef4444', '#f59e0b', '#f59e0b', '#22c55e', '#22c55e'];

  return (
    <div className="flex items-center gap-3 px-3 py-1 border-t text-[10px]" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(10,10,15,0.8)', minHeight: '28px' }}>
      <span>Lv.{level}</span>
      <div className="w-16 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full" style={{ width: `${(xp % 50) / 50 * 100}%`, background: '#00ffcc' }} />
      </div>
      <span className="opacity-40">{xp} XP</span>
      <span className="opacity-20">|</span>
      <span style={{ color: '#ff6b6b' }}>♥ {love}</span>
      <span className="opacity-20">|</span>
      <span className="opacity-40">🔥 {streak}d</span>
      <span className="opacity-20">|</span>
      <span className="opacity-30">{activePanel || 'idle'}</span>
      <div className="flex-1" />
      <button onClick={() => setSpoons((spoons + 1) % 6)} className="flex items-center gap-1 opacity-40 hover:opacity-80">
        <span className="w-2 h-2 rounded-full" style={{ background: spoonColors[spoons] }} />
        <span>{spoonLabels[spoons]}</span>
      </button>
    </div>
  );
}

export default ForgeStatusBar;
