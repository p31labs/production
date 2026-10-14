import { useEffect, useState } from 'react'
import { Input, Textarea, Select, Menu } from '@p31ca/design-core/canon-v2'
import { Checkbox } from '@p31ca/design-core/compositions'
import type { ToolDef } from '@/types'
import { fieldsFromSchema, prefillsFromSchema, sampleArgs, validateArgs, coerceArgs, type FormField } from '@/lib/schemaForm'
import { RiskChip } from '@/features/marketplace/components'

interface ToolFormProps {
  tool: ToolDef
  serverReadOnlySafe?: boolean
  onRun: (args: Record<string, unknown>) => void
  busy: boolean
}

function FieldControl({ field, value, onChange }: { field: FormField; value: unknown; onChange: (v: unknown) => void }) {
  if (field.kind === 'boolean') {
    return (
      <Checkbox
        label={`${field.label}${field.required ? ' *' : ''}`}
        checked={Boolean(value)}
        onChange={(next) => onChange(next)}
      />
    )
  }
  if (field.kind === 'enum') {
    return (
      <Select
        options={(field.enum ?? []).map((opt) => ({ value: opt, label: opt }))}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        aria-label={field.label}
      />
    )
  }
  if (field.kind === 'number') {
    return (
      <Input
        type="number"
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        aria-label={field.label}
      />
    )
  }
  if (field.kind === 'json') {
    return (
      <Textarea
        style={{ fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}
        value={value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
        onChange={(e) => onChange(e.target.value)}
        aria-label={field.label}
        spellCheck={false}
      />
    )
  }
  return (
    <Input
      type="text"
      value={value === undefined || value === null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value)}
      aria-label={field.label}
    />
  )
}

/** C-2: one schema-annotated field — type, description, enum, default, example. */
function AnnotatedField({ field, value, onChange }: { field: FormField; value: unknown; onChange: (v: unknown) => void }) {
  const annotations: string[] = []
  if (field.type) annotations.push(field.type)
  if (field.enum) annotations.push(`${field.enum.length} choices`)
  if (field.default !== undefined) annotations.push(`default: ${JSON.stringify(field.default)}`)
  else if (field.examples && field.examples.length > 0) annotations.push(`example: ${JSON.stringify(field.examples[0])}`)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-1)' }}>
      <span style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>
        {field.label}{field.required ? ' *' : ''}
        <span style={{ fontFamily: 'var(--p31-font-mono)', opacity: 0.8 }}> · {annotations.join(' · ')}</span>
      </span>
      <FieldControl field={field} value={value} onChange={onChange} />
      {field.description && (
        <span style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)', opacity: 0.85 }}>{field.description}</span>
      )}
    </div>
  )
}

export function ToolForm({ tool, onRun, busy }: ToolFormProps) {
  const schema = tool.inputSchema
  const fields = fieldsFromSchema(schema)
  const [args, setArgs] = useState<Record<string, unknown>>(() => prefillsFromSchema(schema))
  const [errors, setErrors] = useState<string[]>([])
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    setArgs(prefillsFromSchema(tool.inputSchema))
    setErrors([])
    setConfirm(false)
  }, [tool.name, tool.inputSchema])

  if (fields.length === 0) {
    return (
      <div className="surface-panel">
        <div className="surface-card-title">{tool.name}</div>
        <div className="surface-card-desc">This tool needs no inputs. It runs right away.</div>
        <button type="button" className="btn-sm" style={{ marginTop: 'var(--p31-space-3)', background: 'var(--p31-accent)', color: 'var(--p31-void)', padding: '8px 16px', borderRadius: 'var(--p31-radius-md)' }} onClick={() => onRun({})} disabled={busy}>
          {busy ? 'Running…' : 'Run it'}
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
        {safe && <span className="chip" style={{ color: 'var(--p31-accent-green)' }}>safe to run</span>}
      </div>
      <div className="surface-card-desc" style={{ marginBottom: 'var(--p31-space-3)' }}>{tool.description ?? '—'}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--p31-space-3)', alignItems: 'start' }}>
        {fields.map((f) => (
          <AnnotatedField key={f.key} field={f} value={args[f.key]} onChange={(v) => setArgs((s) => ({ ...s, [f.key]: v }))} />
        ))}
      </div>

      {errors.length > 0 && (
        <div className="setup-err" style={{ marginTop: 'var(--p31-space-3)' }}>
          {errors.map((e) => <div key={e}>• {e}</div>)}
        </div>
      )}

      {confirm && (
        <div className="surface-panel" style={{ marginTop: 'var(--p31-space-3)', borderColor: 'color-mix(in oklab, var(--p31-accent-red) 50%, transparent)' }}>
          <div style={{ color: 'var(--p31-accent-red)', fontWeight: 600 }}>⚠ This tool can change things on the server.</div>
          <div style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-sm)' }}>Tap Yes to run {tool.name} here.</div>
          <div style={{ display: 'flex', gap: 'var(--p31-space-2)', marginTop: 'var(--p31-space-2)' }}>
            <button type="button" className="btn-sm" style={{ background: 'var(--p31-accent-red)', color: 'var(--p31-void)', padding: '8px 14px', borderRadius: 'var(--p31-radius-md)' }} onClick={() => onRun(coerceArgs(args, schema))} disabled={busy}>
              Yes, run it
            </button>
            <button type="button" className="btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* One button hierarchy: the common action stays a button; the rest
          fold into a canon Menu. */}
      <div style={{ display: 'flex', gap: 'var(--p31-space-2)', marginTop: 'var(--p31-space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn-sm" style={{ background: 'var(--p31-accent)', color: 'var(--p31-void)', padding: '8px 16px', borderRadius: 'var(--p31-radius-md)', fontWeight: 600 }} onClick={run} disabled={busy}>
          {busy ? 'Running…' : 'Run it'}
        </button>
        <Menu
          ariaLabel="More ways to fill the form"
          items={[
            { id: 'sample', label: 'Fill in example values' },
            { id: 'reset', label: 'Reset' },
          ]}
          onSelect={(id) => {
            if (id === 'sample') setArgs(sampleArgs(schema))
            if (id === 'reset') setArgs(prefillsFromSchema(schema))
          }}
        />
        <span style={{ marginLeft: 'auto', color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>
          {fields.length} input{fields.length === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}