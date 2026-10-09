import { useState, useRef, useCallback, useEffect } from 'react';
import { useDataStore, type PlannerEntry, type UploadedFile } from '../../store/useDataStore';

const ACCEPTED_TYPES = ['application/json', 'text/csv', 'text/markdown', 'text/plain'];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = w / (data.length - 1);

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    data.forEach((val, i) => {
      const x = i * step;
      const y = h - ((val - min) / range) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [data, color]);

  if (data.length < 2) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '32px', display: 'block' }}
    />
  );
}

export default function LeftDataUploadHUD() {
  const addFile = useDataStore((s) => s.addFile);
  const removeFile = useDataStore((s) => s.removeFile);
  const files = useDataStore((s) => s.files);
  const entries = useDataStore((s) => s.entries);
  const addEntry = useDataStore((s) => s.addEntry);

  const [dragOver, setDragOver] = useState(false);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (list: FileList | File[]) => {
      Array.from(list).forEach((file) => {
        const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const uploaded: UploadedFile = {
          id,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          uploadedAt: Date.now(),
        };
        addFile(uploaded);
      });
    },
    [addFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) handleFiles(e.target.files);
      e.target.value = '';
    },
    [handleFiles]
  );

  const submitEntry = useCallback(() => {
    if (!mood && !energy && !note.trim()) return;
    addEntry({
      date: new Date().toISOString().split('T')[0],
      mood,
      energy,
      tasks: [],
      notes: note.trim(),
    });
    setNote('');
  }, [mood, energy, note, addEntry]);

  const recent = entries.slice(-14);
  const moodData = recent.map((e) => e.mood);
  const energyData = recent.map((e) => e.energy);

  return (
    <div className="hud-section">
      <div className="hud-block-title">Data Uplink</div>
      <div
        className="data-upload-zone"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1px dashed ${dragOver ? 'var(--p31-accent)' : 'var(--p31-glass-border)'}`,
          padding: '10px',
          textAlign: 'center',
          cursor: 'pointer',
          borderRadius: '8px',
          background: dragOver ? 'var(--p31-glass-bg-strong)' : 'transparent',
          transition: 'all 150ms ease',
        }}
      >
        <span style={{ fontSize: '16px', display: 'block', marginBottom: '2px' }}>📂</span>
        <span style={{ fontSize: '10px', color: 'var(--p31-text-secondary)' }}>Drop JSON, CSV, or Markdown</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".json,.csv,.md,.txt"
          style={{ display: 'none' }}
          onChange={onInputChange}
        />
      </div>

      {files.length > 0 && (
        <div className="hud-block" style={{ gap: '4px' }}>
          {files.slice(-5).reverse().map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '10px',
                padding: '3px 8px',
                background: 'var(--p31-glass-bg)',
                border: '1px solid var(--p31-glass-border)',
                borderRadius: '6px',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {f.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(f.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--p31-text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '0 4px',
                }}
                aria-label={`Remove ${f.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="hud-section-title">Planner</div>
      <div className="hud-block" style={{ gap: '8px' }}>
        <div className="hud-control">
          <label>Mood</label>
          <input
            type="range"
            min="1"
            max="5"
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
          />
          <span className="hud-val">{mood}</span>
        </div>
        <div className="hud-control">
          <label>Energy</label>
          <input
            type="range"
            min="1"
            max="5"
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
          />
          <span className="hud-val">{energy}</span>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Quick note..."
          rows={2}
          style={{
            width: '100%',
            background: 'var(--p31-glass-bg)',
            border: '1px solid var(--p31-glass-border)',
            borderRadius: '6px',
            color: 'var(--p31-text)',
            padding: '6px 8px',
            fontSize: '10px',
            resize: 'vertical',
          }}
        />
        <button
          type="button"
          className="hud-mode-btn"
          onClick={submitEntry}
          style={{ width: '100%' }}
        >
          Log Entry
        </button>
      </div>

      {recent.length > 0 && (
        <div className="hud-section-title">Life Visualizer</div>
      )}
      {moodData.length > 1 && (
        <div className="hud-block" style={{ gap: '2px' }}>
          <div style={{ fontSize: '10px', color: 'var(--p31-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mood
          </div>
          <Sparkline data={moodData} color="var(--p31-accent)" />
        </div>
      )}
      {energyData.length > 1 && (
        <div className="hud-block" style={{ gap: '2px' }}>
          <div style={{ fontSize: '10px', color: 'var(--p31-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Energy
          </div>
          <Sparkline data={energyData} color="var(--p31-accent-alt)" />
        </div>
      )}
      {recent.length === 0 && (
        <div style={{ fontSize: '10px', color: 'var(--p31-text-tertiary)', textAlign: 'center', padding: '8px 0' }}>
          Log entries to see your visualizer
        </div>
      )}
    </div>
  );
}
