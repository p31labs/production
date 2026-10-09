import { useLedStore, LED_MODES, LED_PALETTE_SLOTS, LED_MODE_INFO } from '../../store/useLedStore';

export default function RightHardwareHUD() {
  const mode = useLedStore((s) => s.mode);
  const speed = useLedStore((s) => s.speed);
  const brightness = useLedStore((s) => s.brightness);
  const color = useLedStore((s) => s.color);
  const colors = useLedStore((s) => s.colors);
  const setMode = useLedStore((s) => s.setMode);
  const setSpeed = useLedStore((s) => s.setSpeed);
  const setBrightness = useLedStore((s) => s.setBrightness);
  const setColor = useLedStore((s) => s.setColor);
  const setColors = useLedStore((s) => s.setColors);

  const paletteSlots = LED_PALETTE_SLOTS[mode];

  return (
    <div className="hud-block">
      <div className="hud-block-title">NeoPixel</div>
      <div className="hud-mode-grid">
        {LED_MODES.map((m) => (
          <button
            key={m}
            type="button"
            className={`hud-mode-btn${mode === m ? ' hud-mode-btn--active' : ''}`}
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="hud-control">
        <label>Primary</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <span className="hud-hex">{color}</span>
      </div>

      {paletteSlots > 0 && (
        <div className="hud-control hud-control--palette">
          <label>Palette</label>
          {Array.from({ length: paletteSlots }).map((_, idx) => (
            <span className="hud-palette-slot" key={idx}>
              <input
                type="color"
                value={colors[idx] ?? '#000000'}
                onChange={(e) => {
                  const next = [...colors];
                  next[idx] = e.target.value;
                  setColors(next);
                }}
              />
              <span className="hud-palette-tag">C{idx + 1}</span>
            </span>
          ))}
        </div>
      )}

      <div className="hud-control">
        <label>Speed</label>
        <input
          type="range" min="0" max="10" value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
        <span className="hud-val">{speed}</span>
      </div>

      <div className="hud-control">
        <label>Bright</label>
        <input
          type="range" min="0" max="100" value={brightness}
          onChange={(e) => setBrightness(Number(e.target.value))}
        />
        <span className="hud-val">{brightness}%</span>
      </div>

      <div className="hud-block-hint">{LED_MODE_INFO[mode]}</div>
    </div>
  );
}
