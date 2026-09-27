#!/usr/bin/env node
// P31 Design System — portal vendor gate (shared CLI)
// Asserts the portal's installed tarball deps resolve to canonical versions.
// Usage: node v-gate.mjs [--target <portalRoot>]  (defaults to cwd)
//
// Fixes GAP-07: expected packages are derived from the target package.json's
// `file:vendor/*.tgz` deps (the tarball version is encoded in the filename), so
// any consumer (workspace, design portal, mcp-marketplace) is checked against
// ITS OWN vendored tarballs regardless of the package's npm name.
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

/** Derive expected { name: version } from file:vendor tarball deps. */
function expectedFromManifest(pkg) {
  const out = {}
  for (const [name, spec] of Object.entries(pkg.dependencies ?? {})) {
    if (typeof spec === 'string' && spec.startsWith('file:vendor/')) {
      const m = spec.match(/-(\d+\.\d+\.\d+)\.tgz$/)
      if (m) out[name] = m[1]
    }
  }
  return out
}

// Legacy fallback (no file:vendor deps): the canon packages + versions.
const LEGACY = { '@p31ca/design-core': '3.0.0', '@p31ca/ui': '1.3.1' }

const pkg = read(path.join(targetRoot, 'package.json'))
const expected = Object.keys(expectedFromManifest(pkg)).length
  ? expectedFromManifest(pkg)
  : LEGACY

let ok = 0
for (const [name, version] of Object.entries(expected)) {
  const installed = resolvePkg(name)
  if (installed.version !== version) {
    console.error(`v:gate FAIL: ${name} expected ${version}, got ${installed.version} in ${targetRoot}`)
    process.exit(1)
  }
  console.log(`  ${name} OK ${installed.version}`)
  ok++
}
console.log(`v:gate PASS (${ok} package(s))`)