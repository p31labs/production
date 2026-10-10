#!/usr/bin/env node
// P31 Design System — portal vendor sync (shared CLI)
// Regenerates the pinned vendor tarballs for a portal from canonical sources:
//   @p31ca/design-core -> production/packages/design-core (canonical monorepo)
//   @p31ca/ui (fixed)  -> ./ui-src (source tree with the JSX/useRef fixes baked in)
// Usage: node sync-vendor.mjs --target <portalRoot>
// Run via `pnpm sync:vendor` in each portal (no postinstall bootstrapping; explicit by design).
import { execSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
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
const canonicalCore = '/home/p31/production/packages/design-core'
const uiSrc = path.join(scriptDir, 'ui-src')
const manifestPath = path.join(vendor, '.sha512')

// migration guard: Path A removed the `@p31ca/design-core/css/tokens.css`
// export. Portals still importing it work only on frozen tarballs; the next
// repack here drops the file and breaks them loudly at build time. Refuse to
// vendor a portal that has not migrated — a pre-sync failure, not a surprise.
const REMOVED_EXPORT = /@p31ca\/design-core\/css\/tokens\.css/
const SKIP_DIRS = new Set(['node_modules', 'dist', 'vendor', '.git', '.turbo', 'coverage'])
const SOURCE_RE = /\.(ts|tsx|css|js|mjs)$/
const scanForRemovedImport = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) scanForRemovedImport(full)
    } else if (SOURCE_RE.test(entry.name)) {
      const src = readFileSync(full, 'utf8')
      const lines = src.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (REMOVED_EXPORT.test(lines[i])) {
          console.error(`\n✗ migration guard: ${full}:${i + 1} still imports @p31ca/design-core/css/tokens.css (removed by SSOT Path A).`)
          console.error('  Migrate to `@p31ca/canon/tokens.css` and add "@p31ca/canon": "file:vendor/p31ca-canon-<version>.tgz" to dependencies.')
          process.exit(1)
        }
      }
    }
  }
}
scanForRemovedImport(path.join(portalRoot, 'src'))

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

const pack = (cwd, args, expectedName) =>
  execSync(`pnpm pack --pack-destination ${vendor} ${args}`, { cwd, stdio: 'inherit' })
// pnpm names tarballs after package.json `name` (@p31ca/design-core →
// p31ca-design-core-*.tgz), but the portal deps + this manifest pin the legacy
// filename (p31-design-core-*.tgz). Rename the fresh pack to the pinned name so
// the sha512 check and `pnpm install` resolve the NEW bytes, not the stale ones.
const renamePack = (packed, pinned) => {
  const dest = pinned
  if (packed !== dest) {
    rmSync(dest, { force: true })
    writeFileSync(dest, readFileSync(packed))
    rmSync(packed, { force: true })
  }
}

const refreshDep = (pkg) => {
  console.log(`Refreshing ${pkg} in ${portalRoot} (tarball content changed)…`)
  execSync(`pnpm update ${pkg}`, { cwd: portalRoot, stdio: 'inherit' })
}

const prev = readManifest()
const storedDes = new Map(Object.entries(prev))

// Derive versions from the canonical workspace packages so the sync never
// hardcodes a stale version — the root cause of the 3.0.0 drift.
const readVersion = (dir) => JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).version
const coreVersion = readVersion(canonicalCore)
const canonRoot = '/home/p31/production/packages/canon'
const canonVersion = readVersion(canonRoot)

const tarballs = [
  { key: 'design-core', path: path.join(vendor, `p31-design-core-${coreVersion}.tgz`), pkg: '@p31ca/design-core', packed: `p31ca-design-core-${coreVersion}.tgz` },
  { key: 'canon', path: path.join(vendor, `p31ca-canon-${canonVersion}.tgz`), pkg: '@p31ca/canon', packed: `p31ca-canon-${canonVersion}.tgz` },
  { key: 'ui', path: path.join(vendor, 'p31ca-ui-1.3.1.tgz'), pkg: '@p31ca/ui', packed: 'p31ca-ui-1.3.1.tgz' },
]

// canon-purity gate: refuse to vendor a corrupt canon. This is the same gate
// that would have caught the migrate-oklch.mjs NaN corruption before it ever
// shipped to design.p31ca.org.
console.log('Running canon-purity gate…')
execSync('node scripts/canon-purity.mjs', { cwd: canonicalCore, stdio: 'inherit' })

pack(canonicalCore, '', '')
pack(canonRoot, '', '')
pack(uiSrc, '', '')
rmSync(path.join(vendor, '@p31ca-ui-1.3.1.tgz'), { force: true })

// Rename fresh packs to the pinned filenames the portal deps expect.
for (const t of tarballs) {
  renamePack(path.join(vendor, t.packed), t.path)
}

const next = {}
for (const { key, path: tarball, pkg } of tarballs) {
  const hash = sha512(tarball)
  next[key] = hash
  if (storedDes.get(key) !== hash) refreshDep(pkg)
}
writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`)

console.log(`Vendor tarballs up to date for ${portalRoot}:`)
for (const { path: tarball } of tarballs) console.log(`  ${tarball}`)