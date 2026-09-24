import { useEffect, useState } from 'react'
import type { ToolDef } from '@/types'
import { fieldsFromSchema, defaultsFromSchema, sampleArgs, validateArgs, coerceArgs, type FormField } from '@/lib/schemaForm'
import { RiskChip } from '@/features/marketplace/components'

interface ToolFormProps {
  tool: ToolDef
  serverReadOnlySafe: boolean
  onRun: (args: Record<string, unknown>) => void
  busy: boolean
}

function FieldInput({ field, value, onChange }: { field: FormField; value: unknown; onChange: (v: unknown) => void }) {
  if (field.kind === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={field.label}
      />
    )
  }
  if (field.kind === 'enum') {
    return (
      <select
        className="setup-input"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        aria-label={field.label}
      >
        {field.enum?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    )
  }
  if (field.kind === 'number') {
    return (
      <input
        type="number"
        className="setup-input"
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        aria-label={field.label}
      />
    )
  }
  if (field.kind === 'json') {
    return (
      <textarea
        className="setup-input"
        style={{ minHeight: 80, fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)', resize: 'vertical' }}
        value={value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
        onChange={(e) => onChange(e.target.value)}
        aria-label={field.label}
        spellCheck={false}
      />
    )
  }
  return (
    <input
      type="text"
      className="setup-input"
      value={value === undefined || value === null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value)}
      aria-label={field.label}
    />
  )
}

export function ToolForm({ tool, serverReadOnlySafe, onRun, busy }: ToolFormProps) {
  const schema = tool.inputSchema
  const fields = fieldsFromSchema(schema)
  const [args, setArgs] = useState<Record<string, unknown>>(() => defaultsFromSchema(schema))
  const [errors, setErrors] = useState<string[]>([])
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    setArgs(defaultsFromSchema(tool.inputSchema))
    setErrors([])
    setConfirm(false)
  }, [tool.name, tool.inputSchema])

  if (fields.length === 0) {
    return (
      <div className="surface-panel">
        <div className="surface-card-title">{tool.name}</div>
        <div className="surface-card-desc">No input schema — runs with empty arguments.</div>
        <button type="button" className="btn-sm" style={{ marginTop: 'var(--p31-space-3)', background: 'var(--p31-accent)', color: 'var(--p31-void)', padding: '8px 16px', borderRadius: 'var(--p31-radius-md)' }} onClick={() => onRun({})} disabled={busy}>
          {busy ? 'Running…' : 'Run'}
        </button>
      </div>
    )
  }

  const isWrite = tool.risk === 'write'
  const safe = !isWrite

  const run = () => {
    const coerced = coerceArgs(args, schema)
    const errs = validateArgs(coerced, schema)
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    setErrors([])
    if (isWrite && !confirm) {
      setConfirm(true)
      return
    }
    onRun(coerced)
  }

  return (
    <div className="surface-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
        <div className="surface-card-title">{tool.name}</div>
        <RiskChip risk={tool.risk} />
        {safe && <span className="chip" style={{ color: 'var(--p31-accent-green)' }}>runs instantly</span>}
      </div>
      <div className="surface-card-desc" style={{ marginBottom: 'var(--p31-space-3)' }}>{tool.description ?? '—'}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--p31-space-3)' }}>
        {fields.map((f) => (
          <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-1)' }}>
            <span style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>
              {f.label}{f.required ? ' *' : ''}
            </span>
            <FieldInput field={f} value={args[f.key]} onChange={(v) => setArgs((s) => ({ ...s, [f.key]: v }))} />
          </label>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="setup-err" style={{ marginTop: 'var(--p31-space-3)' }}>
          {errors.map((e) => <div key={e}>• {e}</div>)}
        </div>
      )}

      {confirm && (
        <div className="surface-panel" style={{ marginTop: 'var(--p31-space-3)', borderColor: 'color-mix(in oklab, var(--p31-accent-red) 50%, transparent)' }}>
          <div style={{ color: 'var(--p31-accent-red)', fontWeight: 600 }}>⚠ This tool mutates state or writes data.</div>
          <div style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-sm)' }}>Confirm to execute {tool.name} against {serverReadOnlySafe ? 'a read-only-safe server' : 'this server'}.</div>
          <div style={{ display: 'flex', gap: 'var(--p31-space-2)', marginTop: 'var(--p31-space-2)' }}>
            <button type="button" className="btn-sm" style={{ background: 'var(--p31-accent-red)', color: 'var(--p31-void)', padding: '8px 14px', borderRadius: 'var(--p31-radius-md)' }} onClick={() => onRun(coerceArgs(args, schema))} disabled={busy}>
              Confirm run
            </button>
            <button type="button" className="btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--p31-space-2)', marginTop: 'var(--p31-space-3)', alignItems: 'center' }}>
        <button type="button" className="btn-sm" style={{ background: 'var(--p31-accent)', color: 'var(--p31-void)', padding: '8px 16px', borderRadius: 'var(--p31-radius-md)', fontWeight: 600 }} onClick={run} disabled={busy}>
          {busy ? 'Running…' : isWrite && !confirm ? 'Run' : 'Run tool'}
        </button>
        <button type="button" className="btn-sm" onClick={() => setArgs(sampleArgs(schema))}>use sample args</button>
        <button type="button" className="btn-sm" onClick={() => setArgs(defaultsFromSchema(schema))}>reset</button>
        <span style={{ marginLeft: 'auto', color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>
          {fields.length} arg{fields.length === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}