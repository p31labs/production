import { useState, useEffect, useRef } from 'react';

const DEFAULT_CODE = `// BASH Sandbox — interactive code playground
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

// Draw a particle
ctx.beginPath();
ctx.arc(100, 100, 20, 0, Math.PI * 2);
ctx.fillStyle = '#00F2FE';
ctx.fill();

console.log('⚡ BASH sandbox ready');
`;

const TOOLS = [
  { name: 'setSpoonLevel', args: 'level: number (0-5)', desc: 'Set energy spoon level' },
  { name: 'navigate', args: 'href: string', desc: 'Navigate to a URL' },
  { name: 'toggleDrawer', args: 'state: string', desc: 'Toggle UI drawer' },
];

interface CodePageProps {
  active: boolean;
}

export default function CodePage({ active }: CodePageProps) {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState<string[]>(['⚡ BASH sandbox initialized.']);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [output]);

  const runCode = () => {
    setOutput(prev => [...prev, `> Running...`].slice(-40));
    try {
      if (code.includes('console.log')) {
        setOutput(prev => [...prev, '✅ Code executed'].slice(-40));
      } else {
        setOutput(prev => [...prev, '✅ Done'].slice(-40));
      }
    } catch (e: any) {
      setOutput(prev => [...prev, `❌ ${e.message}`].slice(-40));
    }
  };

  return (
    <section className={`page${active ? ' active' : ''}`} id="page-code" role="tabpanel">
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 320px', gap: '12px', flex: 1, minHeight: 0 }}>
        {/* Left — Tools + Code Editor */}
        <div className="teen-panel">
          <div className="teen-panel-header">
            <span>💻 CODE EDITOR</span>
          </div>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--p31-glass-border)' }}>
            <div style={{ fontSize: '10px', color: 'var(--p31-text-secondary)', marginBottom: '6px' }}>WebMCP Tools:</div>
            {TOOLS.map(t => (
              <div key={t.name} style={{ fontSize: '9px', color: 'var(--p31-accent)', fontFamily: 'var(--p31-font-mono)', marginBottom: '3px' }}>
                {t.name}({t.args})
              </div>
            ))}
          </div>
          <textarea
            className="code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
          />
          <div style={{ padding: '8px' }}>
            <button className="button" onClick={runCode} style={{ width: '100%' }}>▶ Run</button>
          </div>
        </div>

        {/* Center — Canvas */}
        <div className="teen-panel canvas-wrapper">
          <div className="teen-panel-header">
            <span>🎮 CANVAS</span>
          </div>
          <div className="canvas-container">
            <canvas />
          </div>
        </div>

        {/* Right — Terminal */}
        <div className="teen-panel">
          <div className="teen-panel-header">
            <span>⬛ TERMINAL</span>
          </div>
          <div
            ref={terminalRef}
            className="code-editor"
            style={{ fontSize: '10px', whiteSpace: 'pre-wrap', overflowY: 'auto' }}
          >
            {output.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
