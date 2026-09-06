import { useState, useEffect, useRef, useCallback } from 'react';
import { playNote } from '../lib/audio';

export default function TeenPortal({ spoons, setSpoons }) {
  const canvasRef = useRef(null);
  const [bpm, setBpm] = useState(120);
  const [synthPreset, setSynthPreset] = useState('synthwave');
  const [isPlayingSynth, setIsPlayingSynth] = useState(false);
  const [activeTab, setActiveTab] = useState('script');
  const [code, setCode] = useState(`// Willow Teen EDE Script
const particles = [];

function setup() {
  for(let i=0; i < 40; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 4 + 2
    });
  }
}

function update() {
  // Render particle physics canvas loop
}`);

  const setupCanvas = useCallback((canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    let pts = Array.from({ length: 35 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      radius: Math.random() * 3 + 2,
      hue: Math.random() * 60 + 170,
    }));

    const render = () => {
      ctx.fillStyle = 'rgba(10, 14, 23, 0.2)';
      ctx.fillRect(0, 0, width, height);

      pts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${p.hue}, 100%, 65%)`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsl(${p.hue}, 100%, 65%)`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cleanup = setupCanvas(canvas);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
      }
    });

    const parent = canvas.parentElement;
    if (parent) {
      resizeObserver.observe(parent);
    }

    return () => {
      cleanup?.();
      resizeObserver.disconnect();
    };
  }, [setupCanvas]);

  const playSynthChord = () => {
    setIsPlayingSynth(true);
    playNote(261.63, 'sawtooth', 0.6); // C4
    playNote(329.63, 'sawtooth', 0.6); // E4
    playNote(392.00, 'sawtooth', 0.6); // G4
    playNote(493.88, 'sawtooth', 0.6); // B4
    setTimeout(() => setIsPlayingSynth(false), 600);
  };

  return (
    <div className="teen-container">
      <div className="teen-header">
        <div className="teen-header-left">
          <span className="teen-logo">⚡ WILLOW//TEEN_EDE v2.4</span>
          <span className="teen-badge">PARTICLE & SYNTH WORKSPACE</span>
        </div>

        <div className="spoon-control-teen">
          <span className="spoon-teen-label">ENERGY SPOONS: {spoons}/5</span>
          <div className="spoon-teen-pills">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                onClick={() => setSpoons(s)}
                className={`spoon-teen-pill ${s <= spoons ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="teen-grid">
        <div className="teen-panel">
          <div className="teen-panel-header">
            <span>💻 SCRIPT EDITOR</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setActiveTab('script')}
                className={`tab-toggle ${activeTab === 'script' ? 'active' : ''}`}
              >
                JS
              </button>
              <button
                onClick={() => setActiveTab('synth')}
                className={`tab-toggle ${activeTab === 'synth' ? 'active' : ''}`}
              >
                AUDIO
              </button>
            </div>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="code-editor"
            spellCheck="false"
          />
        </div>

        <div className="teen-panel canvas-wrapper">
          <div className="teen-panel-header">
            <span>🎮 LIVE CANVAS RUNNER</span>
            <span className="status-fps">● 60 FPS</span>
          </div>

          <div className="canvas-container">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <div className="teen-panel">
          <div className="teen-panel-header">
            <span>🎹 WEB AUDIO SYNTH & FOCUS</span>
          </div>

          <div className="synth-controls">
            <div className="synth-group">
              <label className="synth-label">AUDIO SYNTH PRESET</label>
              <select
                value={synthPreset}
                onChange={(e) => setSynthPreset(e.target.value)}
                className="synth-select"
              >
                <option value="synthwave">Synthwave Cmaj7 Chord</option>
                <option value="ambient">Ambient Sine Drone</option>
                <option value="lofi">Lo-Fi Triangle Lead</option>
              </select>
            </div>

            <div className="synth-group">
              <div className="synth-label-row">
                <span className="synth-label">BPM TEMPO</span>
                <span className="synth-value">{bpm} BPM</span>
              </div>
              <input
                type="range"
                min="60"
                max="180"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="synth-slider"
              />
            </div>

            <button
              onClick={playSynthChord}
              className={`synth-trigger ${isPlayingSynth ? 'playing' : ''}`}
            >
              {isPlayingSynth ? '♪ PLAYING SYNTH...' : '▶ TRIGGER SYNTH CHORD'}
            </button>

            <div className="synth-tip">
              <span className="tip-label">🤖 PEER AI DEV TIP:</span>
              <p className="tip-text">
                Try combining Web Audio oscillators with canvas particle movement to build an interactive audio visualizer!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
