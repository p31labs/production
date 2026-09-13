#!/usr/bin/env node
// P31 Design System — portal vendor gate (shared CLI)
// Asserts the portal's installed tarball deps resolve to canonical versions.
// Usage: node v-gate.mjs [--target <portalRoot>]  (defaults to cwd)
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const i = args.indexOf('--target')
const targetRoot = path.resolve(i >= 0 ? args[i + 1] : process.cwd())
const require = createRequire(path.join(targetRoot, 'package.json'))
const read = (f) => JSON.parse(readFileSync(f, 'utf8'))

const resolvePkg = (name) => {
  try {
    return read(require.resolve(`${name}/package.json`))
  } catch {
    const entry = require.resolve(name)
    let dir = path.dirname(entry)
    for (;;) {
      try {
        return read(path.join(dir, 'package.json'))
      } catch {}
      const parent = path.dirname(dir)
      if (parent === dir) throw new Error(`cannot locate package.json for ${name}`)
      dir = parent
    }
  }
}

const expected = { '@p31/design-core': '2.3.0', '@p31/ui': '1.3.1' }
for (const [name, version] of Object.entries(expected)) {
  const pkg = resolvePkg(name)
  if (pkg.version !== version) {
    console.error(`v:gate FAIL: ${name} expected ${version}, got ${pkg.version} in ${targetRoot}`)
    process.exit(1)
  }
  console.log(`  ${name} OK ${pkg.version}`)
}
console.log('v:gate PASS')