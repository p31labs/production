import { useState, useTransition } from 'react';
import { playNote } from '../lib/audio';

type CreateMode = 'blocks' | 'vibe';

const VIBE_TEMPLATES = [
  { prompt: 'Make a game about a friendly robot who collects stars', label: '🤖 Robot Game', emoji: '🎮' },
  { prompt: 'Tell a story about a magical forest with talking animals', label: '🌳 Magic Forest', emoji: '📖' },
  { prompt: 'Create a colorful painting of outer space with planets', label: '🚀 Outer Space', emoji: '🎨' },
];

interface Block {
  id: number;
  type: 'move' | 'sound' | 'color';
  label: string;
  color: string;
  freq: number;
}

const BLOCKS: Block[] = [
  { id: 1, type: 'move', label: '🚀 Jump Character', color: 'teal', freq: 523.25 },
  { id: 2, type: 'sound', label: '🎵 Play Magic Chime', color: 'gold', freq: 659.25 },
  { id: 3, type: 'color', label: '🌈 Change Star Color', color: 'purple', freq: 783.99 },
];

const COLORS = ['#FF6B8B', '#4ECDC4', '#FFE66D', '#96CEB4', '#A855F7'];

const MAGIC_RECIPE = [
  { id: 201, type: 'move' as const, label: '🚀 Jump Character', color: 'teal', freq: 523.25 },
  { id: 202, type: 'color' as const, label: '🌈 Change Star Color', color: 'purple', freq: 783.99 },
  { id: 203, type: 'sound' as const, label: '🎵 Play Magic Chime', color: 'gold', freq: 659.25 },
];

interface CreatePageProps {
  active: boolean;
}

export default function CreatePage({ active }: CreatePageProps) {
  const [workspace, setWorkspace] = useState<Block[]>([
    { id: 101, type: 'move', label: '🚀 Jump Character', color: 'teal', freq: 523.25 },
    { id: 102, type: 'sound', label: '🎵 Play Magic Chime', color: 'gold', freq: 659.25 },
  ]);
  const [characterY, setCharacterY] = useState(0);
  const [starColor, setStarColor] = useState('#FF6B8B');
  const [isRunning, setIsRunning] = useState(false);
  const [chatMessage, setChatMessage] = useState(
    "Hi! I'm Willow Bot 🤖 Drag blocks to make me move and sing!"
  );
  const [isPending, startTransition] = useTransition();

  // Vibe mode
  const [createMode, setCreateMode] = useState<CreateMode>('blocks');
  const [vibePrompt, setVibePrompt] = useState('');
  const [vibeLoading, setVibeLoading] = useState(false);
  const [vibeResult, setVibeResult] = useState<{ html: string } | null>(null);

  const handleVibeGenerate = async (templatePrompt?: string) => {
    const prompt = templatePrompt || vibePrompt;
    if (!prompt.trim()) return;
    setVibeLoading(true);
    try {
      const res = await fetch('https://vibe-generate.trimtab-signal.workers.dev/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, formFactor: 'playful', spoons: 2 }),
      });
      const data = await res.json();
      setVibeResult({ html: data.html || '<p>Generated!</p>' });
    } catch (e) {
      setVibeResult({ html: '<p style="color:#F43F5E">Could not generate. Try again!</p>' });
    } finally {
      setVibeLoading(false);
    }
  };

  const addBlockToWorkspace = (block: Block) => {
    setWorkspace((prev) => [...prev, { ...block, id: Date.now() }]);
    playNote(block.freq, 'triangle', 0.2);
  };

  const runProgram = () => {
    if (workspace.length === 0) return;
    setIsRunning(true);
    setChatMessage('Running your code blocks! Watch the magic! ✨');

    startTransition(() => {
      workspace.forEach((blk, idx) => {
        setTimeout(() => {
          playNote(blk.freq || 440, 'sine', 0.4);
          if (blk.type === 'move') {
            setCharacterY(-30);
            setTimeout(() => setCharacterY(0), 300);
          } else if (blk.type === 'color') {
            setStarColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
          }
          if (idx === workspace.length - 1) {
            setTimeout(() => {
              setIsRunning(false);
              setChatMessage('Great job! That was an awesome creation! 🎉');
            }, 500);
          }
        }, idx * 600);
      });
    });
  };

  const loadMagicRecipe = () => {
    startTransition(() => {
      setWorkspace(MAGIC_RECIPE.map((b) => ({ ...b, id: Date.now() + b.id })));
      setChatMessage('I loaded a magic dance recipe for you! Click Run!');
    });
  };

  return (
    <section
      className={`page${active ? ' active' : ''}`}
      id="page-create"
      role="tabpanel"
    >
      <h2>🧩 Block Creator</h2>
      <p className="subtitle">Build your own program with code blocks!</p>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {([
          { key: 'blocks' as CreateMode, label: '🧩 Blocks', emoji: '' },
          { key: 'vibe' as CreateMode, label: '✨ Make with AI', emoji: '' },
        ]).map(m => (
          <button
            key={m.key}
            onClick={() => setCreateMode(m.key)}
            className={`btn${createMode === m.key ? '' : ' secondary'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {createMode === 'vibe' && (
        <div className="create-workspace" style={{ gridTemplateColumns: '300px 1fr 300px' }}>
          {/* Templates left */}
          <div className="block-palette">
            <h3>✨ Magic Templates</h3>
            <p className="subtitle">Pick a starter idea!</p>
            <div className="block-list">
              {VIBE_TEMPLATES.map((t, i) => (
                <div key={i} className={`code-block ${i === 0 ? 'teal' : i === 1 ? 'pink' : 'purple'}`}
                  onClick={() => { setVibePrompt(t.prompt); handleVibeGenerate(t.prompt); }}
                >
                  <span>{t.emoji} {t.label}</span>
                  <span className="block-plus">+</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px' }}>
              <textarea
                className="code-editor"
                value={vibePrompt}
                onChange={(e) => setVibePrompt(e.target.value)}
                placeholder="Or type your own idea..."
                style={{ width: '100%', minHeight: '60px', fontSize: '12px', background: '#FFF', color: '#4A5568', border: '2px dashed #CBD5E0', borderRadius: '12px', padding: '8px', fontFamily: 'var(--p31-font-sans)' }}
              />
              <button className="btn-create-primary" onClick={() => handleVibeGenerate()} disabled={vibeLoading} style={{ width: '100%', marginTop: '8px' }}>
                {vibeLoading ? '✨ Making magic...' : '✨ Create!'}
              </button>
            </div>
          </div>

          {/* Preview center */}
          <div className="canvas-panel" style={{ overflow: 'hidden' }}>
            <div className="canvas-toolbar"><h3>🎨 Your Creation</h3></div>
            {vibeResult ? (
              <iframe
                sandbox="allow-scripts"
                srcDoc={vibeResult.html}
                style={{ flex: 1, border: 'none', background: '#FFF', borderRadius: '12px' }}
                title="AI creation preview"
              />
            ) : (
              <div className="workspace-empty">Pick a template or type an idea to create something magical! ✨</div>
            )}
          </div>

          {/* Helper right */}
          <div className="helper-panel">
            <div className="helper-header">
              <span className="helper-icon">✨</span>
              <h3>AI Helper</h3>
            </div>
            <div className="helper-chat">
              {vibeLoading ? 'Making magic... hang tight!' : vibeResult ? 'Your creation is ready! Try another template or type a new idea.' : 'Pick a template card on the left, and I\'ll build something fun for you! 🎨'}
            </div>
            {vibeResult && (
              <button className="btn-create-magic" onClick={() => { setVibeResult(null); setVibePrompt(''); }} style={{ marginTop: 'auto' }}>
                🧹 Clear & Try Again
              </button>
            )}
          </div>
        </div>
      )}

      {createMode === 'blocks' && (
      <div className="create-workspace">
        {/* Block Palette (left) */}
        <div className="block-palette">
          <h3>🧩 Code Blocks</h3>
          <p className="subtitle">Click a block to add it to your program!</p>

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

          <div className="create-tip">
            <div className="tip-title">💡 Tip for Young Creators</div>
            <p className="tip-text">
              Blocks execute in order from top to bottom. Click &apos;Run Code&apos; to test!
            </p>
          </div>
        </div>

        {/* Canvas + Workspace (middle) */}
        <div className="canvas-area">
          <div className="canvas-panel">
            <div className="canvas-toolbar">
              <h3>📜 Your Block Program</h3>
              <div className="canvas-actions">
                <button onClick={() => setWorkspace([])} className="btn-create-outline">
                  Clear All
                </button>
                <button
                  onClick={runProgram}
                  disabled={isRunning || isPending}
                  className="btn-create-primary"
                >
                  {isRunning || isPending ? 'Running...' : '▶ Run Code!'}
                </button>
              </div>
            </div>

            <div className="workspace-area">
              {workspace.map((item, idx) => (
                <div
                  key={item.id}
                  className={`code-block workspace-block ${item.color}`}
                >
                  <span>
                    {idx + 1}. {item.label}
                  </span>
                </div>
              ))}
              {workspace.length === 0 && (
                <div className="workspace-empty">
                  Click blocks on the left to start building your story!
                </div>
              )}
            </div>
          </div>

          {/* Stage (bottom half) */}
          <div className="stage-panel">
            <div className="stage-character" style={{ transform: `translateY(${characterY}px)` }}>
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

        {/* Helper AI (right) */}
        <div className="helper-panel">
          <div className="helper-header">
            <span className="helper-icon">🤖</span>
            <h3>Willow Helper</h3>
          </div>

          <div className="helper-chat">{chatMessage}</div>

          <div className="helper-actions">
            <button onClick={loadMagicRecipe} className="btn-create-magic">
              ✨ Load Magic Recipe
            </button>
          </div>
        </div>
      </div>
      )}
    </section>
  );
}
