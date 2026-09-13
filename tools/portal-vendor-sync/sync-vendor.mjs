#!/usr/bin/env node
// P31 Design System — portal vendor sync (shared CLI)
// Regenerates the pinned vendor tarballs for a portal from canonical sources:
//   @p31/design-core -> P31-local-workspace/packages/design-core (canonical monorepo)
//   @p31/ui (fixed)  -> ./ui-src (source tree with the JSX/useRef fixes baked in)
// Usage: node sync-vendor.mjs --target <portalRoot>
// Run via `pnpm sync:vendor` in each portal (no postinstall bootstrapping; explicit by design).
import { execSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const args = process.argv.slice(2)
const targetArg = args[args.indexOf('--target') + 1]
if (!targetArg) {
  console.error('Usage: node sync-vendor.mjs --target <portalRoot>')
  process.exit(1)
}

const portalRoot = path.resolve(targetArg)
const vendor = path.join(portalRoot, 'vendor')
const canonicalCore = '/home/p31/P31-local-workspace/packages/design-core'
const uiSrc = path.join(scriptDir, 'ui-src')
const manifestPath = path.join(vendor, '.sha512')

mkdirSync(vendor, { recursive: true })

// pnpm pins `file:` tarball deps by their sha512 in pnpm-lock.yaml. Repacking a
// tarball with new content but the same name/version leaves the lockfile pointing
// at the old hash, so `pnpm install` (even `--force`) reports "Already up to date"
// and the portal gets stale bytes. `pnpm update <pkg>` re-resolves the tarball and
// refreshes the lockfile integrity — this fix makes that refresh automatic when a
// vendor tarball's content actually changes.
const readManifest = () => {
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch {
    return {}
  }
}

const sha512 = (file) => createHash('sha512').update(readFileSync(file)).digest('hex')

const pack = (cwd, args) =>
  execSync(`pnpm pack --pack-destination ${vendor} ${args}`, { cwd, stdio: 'inherit' })

const refreshDep = (pkg) => {
  console.log(`Refreshing ${pkg} in ${portalRoot} (tarball content changed)…`)
  execSync(`pnpm update ${pkg}`, { cwd: portalRoot, stdio: 'inherit' })
}

const prev = readManifest()
const storedDes = new Map(Object.entries(prev))

const tarballs = [
  { key: 'design-core', path: path.join(vendor, 'p31-design-core-2.2.0.tgz'), pkg: '@p31/design-core' },
  { key: 'ui', path: path.join(vendor, 'p31-ui-1.3.1.tgz'), pkg: '@p31/ui' },
]

pack(canonicalCore, '')
pack(uiSrc, '')
rmSync(path.join(vendor, '@p31-ui-1.3.1.tgz'), { force: true })

const next = {}
for (const { key, path: tarball, pkg } of tarballs) {
  const hash = sha512(tarball)
  next[key] = hash
  if (storedDes.get(key) !== hash) refreshDep(pkg)
}
writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`)

console.log(`Vendor tarballs up to date for ${portalRoot}:`)
for (const { path: tarball } of tarballs) console.log(`  ${tarball}`)