/**
 * livePreview — reusable "live render + code + edit props" primitive.
 * Used by Catalog, Recipes, GlassLab, Marketplace. Lightweight: components
 * are local, so no Sandpack/iframe — live render, code toggle, editable props.
 */
import { useState, type ReactNode } from 'react';

interface LiveExampleProps {
  title: string;
  description?: string;
  render: (props: Record<string, unknown>) => ReactNode;
  initialProps?: Record<string, unknown>;
  code?: string;
}

export function LiveExample({ title, description, render, initialProps = {}, code }: LiveExampleProps) {
  const [props, setProps] = useState(initialProps);
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="live-example" data-mcp-tool="liveExample" data-mcp-state="ready">
      <div className="live-example__head">
        <h3 className="live-example__title">{title}</h3>
        {code && (
          <button
            type="button"
            className="live-example__toggle"
            onClick={() => setShowCode((s) => !s)}
            aria-pressed={showCode}
          >
            {showCode ? 'Preview' : 'Code'}
          </button>
        )}
      </div>
      {description && <p className="live-example__desc">{description}</p>}

      {showCode ? (
        <pre className="live-example__code"><code>{code}</code></pre>
      ) : (
        <div className="live-example__render">{render(props)}</div>
      )}

      {Object.keys(initialProps).length > 0 && (
        <div className="live-example__controls">
          {Object.entries(initialProps).map(([key, val]) => (
            <label key={key} className="live-example__control">
              <span>{key}</span>
              {typeof val === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={Boolean(props[key])}
                  onChange={(e) => setProps((p) => ({ ...p, [key]: e.target.checked }))}
                />
              ) : typeof val === 'number' ? (
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={Number(props[key])}
                  onChange={(e) => setProps((p) => ({ ...p, [key]: Number(e.target.value) }))}
                />
              ) : (
                <input
                  type="text"
                  value={String(props[key])}
                  onChange={(e) => setProps((p) => ({ ...p, [key]: e.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default LiveExample;