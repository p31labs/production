#!/usr/bin/env node
// Derives src/data/manifest.json from the REAL forge content packs
// (software/p31-forge/content/**/*.json). The manifest cannot list a pack
// that does not exist — it walks the actual filesystem.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = resolve(fileURLToPath(import.meta.url), '..')
const root = resolve(here, '..')

// The forge package content root (sibling workspace).
const candidates = [
  resolve(root, '..', '..', '..', 'P31-local-workspace', 'software', 'p31-forge', 'content'),
  resolve(root, '..', '..', '..', '..', 'P31-local-workspace', 'software', 'p31-forge', 'content'),
]
const contentDir = candidates.find(existsSync)
if (!contentDir) {
  console.error('✗ content root not found — expected software/p31-forge/content')
  process.exit(1)
}

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...walk(p))
    else if (p.endsWith('.json')) out.push(p)
  }
  return out
}

const packs = []
for (const file of walk(contentDir)) {
  let pack
  try {
    pack = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    continue // not a valid pack; skip
  }
  if (!pack || typeof pack !== 'object' || !pack.kind) continue
  const rel = relative(contentDir, file).replace(/\\/g, '/')
  const kind = rel.split('/')[0]
  const id = rel.replace(/\.json$/, '').replace(/\//g, '-')
  packs.push({
    id,
    kind,
    title: pack.title || pack.program || id,
    filename: pack.filename || `${id}.docx`,
    date: pack.date ?? null,
    theme: pack.theme ?? null,
    source: rel,
  })
}

packs.sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title))

const manifest = {
  generatedAt: new Date().toISOString(),
  contentRoot: contentDir,
  count: packs.length,
  kinds: [...new Set(packs.map((p) => p.kind))],
  packs,
}

const outDir = resolve(root, 'src', 'data')
const outPath = join(outDir, 'manifest.json')
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`✅ manifest: ${packs.length} packs across ${manifest.kinds.length} kinds → src/data/manifest.json`)