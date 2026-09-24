import type { ToolSchema } from '@/types'

/**
 * Schema → form model. Renders flat fields for primitives and enums; nested
 * objects/arrays collapse to a JSON textarea with validation (MVP scope).
 */
export type FieldKind = 'string' | 'number' | 'boolean' | 'enum' | 'json'

export interface FormField {
  key: string
  kind: FieldKind
  label: string
  description?: string
  default?: unknown
  enum?: string[]
  required: boolean
  isObject?: boolean
}

interface PropMeta {
  type?: string
  description?: string
  default?: unknown
  enum?: string[]
  items?: { type?: string }
}

export function fieldsFromSchema(schema?: ToolSchema): FormField[] {
  const props = (schema?.properties ?? {}) as Record<string, PropMeta>
  const required = new Set(schema?.required ?? [])
  return Object.entries(props).map(([key, p]) => {
    const t = p.type ?? 'string'
    let kind: FieldKind = 'string'
    if (t === 'number' || t === 'integer') kind = 'number'
    else if (t === 'boolean') kind = 'boolean'
    else if (Array.isArray(p.enum)) kind = 'enum'
    else if (t === 'object' || t === 'array') kind = 'json'
    return {
      key,
      kind,
      label: key,
      description: p.description,
      default: p.default,
      enum: Array.isArray(p.enum) ? p.enum : undefined,
      required: required.has(key),
      isObject: t === 'object',
    }
  })
}

export function defaultsFromSchema(schema?: ToolSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fieldsFromSchema(schema)) {
    if (f.default !== undefined) out[f.key] = f.default
  }
  return out
}

export function sampleArgs(schema?: ToolSchema): Record<string, unknown> {
  const props = (schema?.properties ?? {}) as Record<string, PropMeta>
  const out: Record<string, unknown> = {}
  for (const [key, p] of Object.entries(props)) {
    const t = p.type ?? 'string'
    if (Array.isArray(p.enum)) out[key] = p.enum[0]
    else if (t === 'boolean') out[key] = false
    else if (t === 'number' || t === 'integer') out[key] = 0
    else if (t === 'object') out[key] = {}
    else if (t === 'array') out[key] = []
    else out[key] = key
  }
  return out
}

/** Return a list of validation error messages for the given args. */
export function validateArgs(args: Record<string, unknown>, schema?: ToolSchema): string[] {
  const errors: string[] = []
  const props = (schema?.properties ?? {}) as Record<string, PropMeta>
  for (const key of schema?.required ?? []) {
    const v = args[key]
    if (v === undefined || v === null || v === '') errors.push(`"${key}" is required`)
  }
  for (const [key, p] of Object.entries(props)) {
    const v = args[key]
    if (v === undefined) continue
    const t = p.type ?? 'string'
    if (t === 'number' || t === 'integer') {
      if (typeof v !== 'number' || Number.isNaN(v)) errors.push(`"${key}" must be a number`)
    } else if (t === 'boolean') {
      if (typeof v !== 'boolean') errors.push(`"${key}" must be a boolean`)
    } else if (t === 'object') {
      if (typeof v === 'string') {
        try {
          JSON.parse(v)
        } catch {
          errors.push(`"${key}" must be valid JSON`)
        }
      }
    } else if (t === 'array') {
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v)
          if (!Array.isArray(parsed)) errors.push(`"${key}" must be a JSON array`)
        } catch {
          errors.push(`"${key}" must be valid JSON`)
        }
      }
    }
  }
  return errors
}

/** Coerce JSON-textarea values back into structured args. */
export function coerceArgs(args: Record<string, unknown>, schema?: ToolSchema): Record<string, unknown> {
  const props = (schema?.properties ?? {}) as Record<string, PropMeta>
  const out: Record<string, unknown> = { ...args }
  for (const [key, p] of Object.entries(props)) {
    const v = out[key]
    const t = p.type ?? 'string'
    if ((t === 'object' || t === 'array') && typeof v === 'string' && v.trim()) {
      try {
        out[key] = JSON.parse(v)
      } catch {
        /* leave as string — validation will surface the error */
      }
    } else if ((t === 'number' || t === 'integer') && typeof v === 'string' && v !== '') {
      const n = Number(v)
      if (!Number.isNaN(n)) out[key] = n
    }
  }
  return out
}