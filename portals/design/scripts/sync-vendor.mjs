#!/usr/bin/env node
// P31 Design System — portal vendor sync (thin wrapper)
// Delegates to the shared CLI in production/tools/portal-vendor-sync so the
// canonical sources (design-core + fixed @p31/ui) live in exactly one place.
// Run via `pnpm sync:vendor` (no postinstall bootstrapping; explicit by design).
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const shared = path.join(here, '..', '..', '..', 'tools', 'portal-vendor-sync', 'sync-vendor.mjs')
const portalRoot = path.join(here, '..')

execSync(`node ${shared} --target ${portalRoot}`, { stdio: 'inherit' })