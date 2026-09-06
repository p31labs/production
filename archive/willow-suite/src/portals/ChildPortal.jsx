import { useState, useTransition } from 'react';
import { playNote } from '../lib/audio';

const BLOCKS = [
  { id: 1, type: 'move', label: '🚀 Jump Character', color: 'pink', freq: 523.25 },
  { id: 2, type: 'sound', label: '🎵 Play Magic Chime', color: '', freq: 659.25 },
  { id: 3, type: 'color', label: '🌈 Change Star Color', color: 'purple', freq: 783.99 },
];

export default function ChildPortal({ spoons, setSpoons }) {
  const [workspace, setWorkspace] = useState([
    { id: 101, label: '🚀 Jump Character', type: 'move', freq: 523.25 },
    { id: 102, label: '🎵 Play Magic Chime', type: 'sound', freq: 659.25 },
  ]);
  const [characterY, setCharacterY] = useState(0);
  const [starColor, setStarColor] = useState('#FF6B8B');
  const [isRunning, setIsRunning] = useState(false);
  const [chatMessage, setChatMessage] = useState("Hi! I'm Willow Bot 🤖 Drag blocks to make me move and sing!");
  const [isPending, startTransition] = useTransition();

  const addBlockToWorkspace = (block) => {
    setWorkspace((prev) => [...prev, { ...block, id: Date.now() }]);
    playNote(block.freq, 'triangle', 0.2);
  };

  const runChildProgram = () => {
    if (workspace.length === 0) return;
    setIsRunning(true);
    setChatMessage("Running your code blocks! Watch the magic! ✨");

    startTransition(() => {
      workspace.forEach((blk, idx) => {
        setTimeout(() => {
          playNote(blk.freq || 440, 'sine', 0.4);
          if (blk.type === 'move') {
            setCharacterY(-30);
            setTimeout(() => setCharacterY(0), 300);
          } else if (blk.type === 'color') {
            const colors = ['#FF6B8B', '#4ECDC4', '#FFE66D', '#96CEB4', '#A855F7'];
            setStarColor(colors[Math.floor(Math.random() * colors.length)]);
          }
          if (idx === workspace.length - 1) {
            setTimeout(() => {
              setIsRunning(false);
              setChatMessage("Great job! That was an awesome creation! 🎉");
            }, 500);
          }
        }, idx * 600);
      });
    });
  };

  const loadMagicRecipe = () => {
    startTransition(() => {
      setWorkspace([
        { id: 201, label: '🚀 Jump Character', type: 'move', freq: 523.25 },
        { id: 202, label: '🌈 Change Star Color', type: 'color', color: 'purple', freq: 783.99 },
        { id: 203, label: '🎵 Play Magic Chime', type: 'sound', freq: 659.25 },
      ]);
      setChatMessage("I loaded a magic dance recipe for you! Click Run!");
    });
  };

  return (
    <div className="child-container">
      <div className="child-header">
        <div className="child-header-left">
          <span className="child-header-icon">🎈</span>
          <div>
            <h1 className="child-header-title">Willow Junior Block EDE</h1>
            <p className="child-header-sub">Playful Block Coding Sandbox</p>
          </div>
        </div>

        <div className="spoon-bar-child">
          <span className="spoon-bar-label">🥄 Energy Spoons:</span>
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`spoon-icon ${s <= spoons ? 'active' : ''}`}
              onClick={() => setSpoons(s)}
              title={`Set spoons to ${s}`}
            >
              ⚡
            </div>
          ))}
        </div>
      </div>

      <div className="child-grid">
        <div className="child-card">
          <h3 className="card-title">🧩 Code Blocks</h3>
          <p className="card-sub">Click a block to add it to your program!</p>

          <div className="block-list">
            {BLOCKS.map((b) => (
              <div
                key={b.id}
                className={`code-block ${b.color}`}
                onClick={() => addBlockToWorkspace(b)}
              >
                <span>{b.label}</span>
                <span className="block-plus">+</span>
              </div>
            ))}
          </div>

          <div className="child-tip">
            <span className="tip-label">💡 Tip for Young Creators:</span>
            <p className="tip-text">
              Blocks execute in order from top to bottom. Click &apos;Run Code&apos; to test!
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '12px' }}>
          <div className="child-card canvas-panel">
            <div className="canvas-toolbar">
              <h3 className="card-title">📜 Your Block Program</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setWorkspace([])}
                  className="btn-secondary"
                >
                  Clear All
                </button>
                <button
                  onClick={runChildProgram}
                  disabled={isRunning || isPending}
                  className={`btn-primary ${(isRunning || isPending) ? 'btn-disabled' : ''}`}
                >
                  {isRunning || isPending ? 'Running...' : '▶ Run Code!'}
                </button>
              </div>
            </div>

            <div className="workspace-area">
              {workspace.map((item, idx) => (
                <div
                  key={item.id}
                  className={`code-block workspace-block ${item.color || ''}`}
                >
                  <span>{idx + 1}. {item.label}</span>
                </div>
              ))}
              {workspace.length === 0 && (
                <div className="workspace-empty">
                  Click blocks on the left to start building your story!
                </div>
              )}
            </div>
          </div>

          <div className="child-card stage-panel">
            <div
              className="stage-character"
              style={{ transform: `translateY(${characterY}px)` }}
            >
              <div
                className="stage-star"
                style={{
                  background: starColor,
                  boxShadow: `0 8px 24px ${starColor}88`,
                }}
              >
                ⭐
              </div>
              <span className="stage-label">Willow Bot</span>
            </div>
          </div>
        </div>

        <div className="child-card">
          <div className="helper-header">
            <span className="helper-icon">🤖</span>
            <h3 className="card-title">Willow Helper</h3>
          </div>

          <div className="helper-chat">
            {chatMessage}
          </div>

          <div className="helper-actions">
            <button onClick={loadMagicRecipe} className="btn-magic">
              ✨ Load Magic Recipe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
