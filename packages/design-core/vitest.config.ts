import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Root is the config's own directory so the same tarball works from any cwd
// (canonical `pnpm test` and portal `test:core -c node_modules/...` alike).
const root = path.dirname(fileURLToPath(import.meta.url))

// Dual-React guard (docs/fix-plans/design-core-dual-react-test-hazard.md):
// `react` resolves to the workspace .pnpm copy while `react-dom/server` fell
// through to the home-dir node_modules — two React instances, so every hook
// component failed with "Invalid hook call". Pin both to the PAIRED workspace
// copies, computed at config load so re-links cannot drift the alias.
const req = createRequire(import.meta.url)
const reactEntry = req.resolve('react')
const reactDir = reactEntry.replace(/\/index\.js$/, '')
const reactDomEntry = req.resolve('react-dom', { paths: [path.dirname(reactDir)] })
const reactDomDir = reactDomEntry.replace(/\/index\.js$/, '')

export default defineConfig({
  resolve: {
    alias: {
      react: reactDir,
      'react-dom': reactDomDir,
    },
  },
  test: {
    root,
    include: ['tests/**/*.spec.{ts,tsx}'],
  },
})