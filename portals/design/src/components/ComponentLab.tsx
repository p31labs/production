import { useState } from 'react';
import { Button, GlassCard, GlassPanel, StatusBadge, SpoonDial } from '@p31ca/design-core/compositions';
import { useThemeStore } from '@p31ca/design-core/theming/theme-store';
import { useSpoonsStore } from '../lib/useSpoonsStore';

type LabName = 'Button' | 'GlassPanel' | 'GlassCard' | 'StatusBadge' | 'SpoonDial'
type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'
const COMPONENTS: LabName[] = ['Button', 'GlassPanel', 'GlassCard', 'StatusBadge', 'SpoonDial']
const WORLDS = ['garden', 'ocean', 'aurora', 'zen', 'volt'] as const
type World = (typeof WORLDS)[number]

function snippetFor(name: LabName, opts: Record<string, string>): string {
  const attrs = Object.entries(opts).map(([k, v]) => ` ${k}="${v}"`).join('')
  return `import { ${name} } from '@p31ca/design-core/compositions'\n\n<${name}${attrs} />`
}

/** ComponentLab — drive a live composition by props, theme, and spoon level. */
export default function ComponentLab() {
  const [name, setName] = useState<LabName>('Button');
  const [variant, setVariant] = useState<Variant>('primary');
  const [size, setSize] = useState<Size>('md');
  const [strong, setStrong] = useState(true);
  const spoons = useSpoonsStore((s) => s.spoons);
  const setSpoons = useSpoonsStore((s) => s.setSpoons);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [world, setWorld] = useState<World>('aurora');

  const switchWorld = (w: World) => { setWorld(w); setTheme(w) }

  const renderLive = () => {
    switch (name) {
      case 'Button':
        return <Button variant={variant} size={size}>{variant}</Button>
      case 'GlassPanel':
        return <GlassPanel strong={strong}><span className="preview-box__text">Glassmorphism 2.0 — clean host frame, chrome only.</span></GlassPanel>
      case 'GlassCard':
        return <GlassCard strong={strong}><span className="preview-box__text">Elevated tile above the void.</span></GlassCard>
      case 'StatusBadge':
        return (
          <>
            <StatusBadge status="online" label="Online" />
            <StatusBadge status="offline" label="Idle" />
            <StatusBadge status="busy" label="Busy" />
            <StatusBadge status="away" label="Away" />
          </>
        )
      case 'SpoonDial':
        return <SpoonDial level={spoons} onChange={setSpoons} />
    }
  }

  const opts: Record<string, string> = name === 'Button' ? { variant, size } : strong ? { strong: 'true' } : {}

  return (
    <div data-mcp-tool="componentLab" data-mcp-state="ready">
      <GlassPanel strong>
        <div className="meta-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 240 }}>
            <div>
              <h5 className="label-tiny">Component</h5>
              <select className="input" value={name} onChange={(e) => setName(e.target.value as LabName)} aria-label="Component">
                {COMPONENTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {name === 'Button' && (
              <div>
                <h5 className="label-tiny">Variant</h5>
                <div className="meta-row">
                  {(['primary', 'secondary', 'ghost'] as Variant[]).map((v) => (
                    <button key={v} type="button" className={`chip ${variant === v ? 'active' : ''}`} onClick={() => setVariant(v)}>{v}</button>
                  ))}
                </div>
                <h5 className="label-tiny" style={{ marginTop: 10 }}>Size</h5>
                <div className="meta-row">
                  {(['sm', 'md', 'lg'] as Size[]).map((s) => (
                    <button key={s} type="button" className={`chip ${size === s ? 'active' : ''}`} onClick={() => setSize(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {(name === 'GlassPanel' || name === 'GlassCard') && (
              <div>
                <h5 className="label-tiny">Elevation</h5>
                <div className="meta-row">
                  <button type="button" className={`chip ${strong ? 'active' : ''}`} onClick={() => setStrong(!strong)}>strong {strong ? 'on' : 'off'}</button>
                </div>
              </div>
            )}

            <div>
              <h5 className="label-tiny">World</h5>
              <div className="meta-row">
                {WORLDS.map((w) => (
                  <button key={w} type="button" className={`chip ${world === w ? 'active' : ''}`} onClick={() => switchWorld(w)}>{w}</button>
                ))}
              </div>
              <div className="meta-row" style={{ marginTop: 10 }}>
                <SpoonDial level={spoons} onChange={setSpoons} />
              </div>
            </div>
          </div>

          <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 280 }}>
            <div className="preview-box preview-box--lab" aria-label={`${name} live render`}>
              {renderLive()}
            </div>
            <div style={{ border: '1px solid var(--p31-glass-border)', borderRadius: 12, padding: 14, background: 'var(--p31-glass-bg)' }}>
              <pre className="mono" style={{ fontSize: 12, margin: 0, color: 'var(--p31-text-secondary)', whiteSpace: 'pre-wrap' }}>{snippetFor(name, opts)}</pre>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}