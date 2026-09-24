#!/usr/bin/env node
/**
 * Token audit — enforces that production source uses only OKLCH tokens.
 * Fails on raw hex (#...) or rgba() in src/*.css outside the token definitions.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'src')
const HEX = /#[0-9a-fA-F]{3,8}\b/g
const RAW_RGBA = /\brgba?\(/g

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (p.endsWith('.css')) out.push(p)
  }
  return out
}

let failures = 0
for (const file of walk(ROOT)) {
  const content = readFileSync(file, 'utf8')
  // tokens.css is the definition file — its :root block is allowed to be raw-free
  const hex = content.match(HEX)
  const rgba = content.match(RAW_RGBA)
  if (hex?.length || rgba?.length) {
    failures++
    console.log(`✗ ${file.replace(process.cwd(), '.')}: ${hex?.join(', ') ?? ''} ${rgba?.join(', ') ?? ''}`)
  }
}

if (failures) {
  console.log(`\nToken audit FAILED: ${failures} file(s) with raw color values.`)
  process.exit(1)
}
console.log('Token audit OK — no raw hex/rgba outside token definitions.')