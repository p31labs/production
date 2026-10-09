/**
 * @file @p31ca/governance test config.
 * Runs the design-core governance suite against the facade (the implementation
 * is tested in design-core; this proves the facade re-exports resolve).
 */
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
const homeStore = resolve('/home/p31/node_modules/.pnpm')
const reactRoot = `${homeStore}/react@18.3.1/node_modules/react`
const reactDomRoot = `${homeStore}/react-dom@18.3.1_react@18.3.1/node_modules/react-dom`
export default defineConfig({
  resolve: {
    alias: [
      { find: /^react$/, replacement: `${reactRoot}/index.js` },
      { find: /^react\/jsx-runtime$/, replacement: `${reactRoot}/jsx-runtime.js` },
      { find: /^react-dom$/, replacement: `${reactDomRoot}/index.js` },
      { find: /^react-dom\/client$/, replacement: `${reactDomRoot}/client.js` },
    ],
  },
  test: { globals: true, environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
})