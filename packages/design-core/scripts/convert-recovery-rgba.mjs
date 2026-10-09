#!/usr/bin/env node
/**
 * convert-recovery-rgba.mjs — convert the NaN-recovery rgba() literals to OKLCH.
 *
 * The NaN fix recovered values from @p31ca/canon v0.1.0 which used rgba()
 * (pre-OKLCH-migration). The design rule (token-audit) is OKLCH-only. This
 * converts every rgba() we introduced back to its exact OKLCH equivalent so
 * the canon satisfies the stance. Files already in the audit allowlist
 * (code/canvas/tests) are left untouched.
 */
import { converter } from 'culori'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const toOklch = converter('oklch')

// rg -> oklch {l, c, h} (0..1)
function rgbaToOklch(r, g, b, a) {
  const o = toOklch({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 })
  let s = `oklch(${fmt(o.l * 100)}% ${fmt(o.c)} ${fmt(o.h)})`
  if (a !== undefined && a < 1) {
    s = `oklch(${fmt(o.l * 100)}% ${fmt(o.c)} ${fmt(o.h)} / ${fmt(a)})`
  }
  return s
}
const fmt = (n) => String(Math.round(n * 1000) / 1000)

// Collect every rgba() literal in non-allowlisted src files.
const ALLOW = [
  'src/converter/audit.ts', 'src/principles.ts', 'src/math/colors.ts',
  'src/starfield.ts', 'src/starfield/', 'src/generator/figma-sync.test.ts',
  'src/generator/componentGenerator.wc.test.ts',
]
const files = execSync("grep -rl 'rgba(' src/ --include='*.css' --include='*.json' --include='*.ts' --include='*.js'")
  .toString().trim().split('\n')
  .filter((f) => !ALLOW.some((a) => f === a || f.startsWith(a) || f.endsWith(a)) && existsSync(f))

const re = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)/g
let converted = 0
for (const f of files) {
  const txt = readFileSync(f, 'utf8')
  let out = txt
  let m
  while ((m = re.exec(txt))) {
    const [, r, g, b, a] = m
    const ok = rgbaToOklch(+r, +g, +b, a !== undefined ? +a : 1)
    out = out.replace(m[0], ok)
    converted++
  }
  if (out !== txt) writeFileSync(f, out)
  const rem = (out.match(/rgba?\(\s*\d/g) || []).length
  if (rem > 0) console.log(`${f}: ${rem} rgba remaining (possibly shadows/compound)`)
}
console.log(`\nConverted ${converted} rgba() → OKLCH across ${files.length} files.`)