// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import rehypeMermaidLite from 'rehype-mermaid-lite';

// NOTE (Astro v6→v7): the @astrojs/cloudflare adapter is intentionally NOT in
// integrations/config. With Astro 6+ an adapter forces the Workers output
// layout (dist/server/.prerender + dist/client + an ASSETS binding) even
// under `output: 'static'`, which breaks the Pages static deploy
// (`wrangler pages deploy dist` expects dist/index.html). The hub is a
// static Pages site — the adapter stays installed (latest, per the upgrade
// runbook) for a future Workers-runtime move, but is not wired here.
//
// Astro v7 notes:
// - markdown.rehypePlugins moved to `markdown.processor: unified({...})`
//   (v7's default markdown pipeline is Sätteri; we keep the unified pipeline
//   for rehype-mermaid-lite via @astrojs/markdown-remark).
// - compressHTML: true pins the v6 HTML-aware whitespace behavior (v7's
//   default is 'jsx', which strips inter-inline-element spaces).
export default defineConfig({
  output: 'static',
  integrations: [react()],
  site: 'https://p31ca.org',
  trailingSlash: 'always',
  compressHTML: true,
  markdown: {
    processor: unified({
      rehypePlugins: [rehypeMermaidLite],
    }),
    syntaxHighlight: {
      excludeLangs: ['mermaid'],
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    // Vite 8 (Astro v7): esbuild → oxc. `esbuild.jsx: 'automatic'` is
    // auto-converted to `oxc.jsx: { runtime: 'automatic' }`, pinned
    // explicitly here. Workspace-package sources consumed raw via package
    // exports (e.g. @p31ca/ui/chrome — exports point at ./src/*.tsx) fall
    // through to the Oxc transform with the ROOT tsconfig's classic JSX mode,
    // emitting React.createElement with no React binding (SSR
    // ReferenceError). Pinning the automatic runtime here keeps every .tsx
    // on the react/jsx-runtime automatic transform regardless of which
    // tsconfig the transformer discovers.
    oxc: {
      jsx: { runtime: 'automatic' },
    },
    build: {
      sourcemap: false,
      // Vite 8 SPIKE (2026-10-14): Vite 8 defaults build.cssMinify to
      // 'lightningcss', which DROPS the unprefixed `backdrop-filter` whenever
      // a `-webkit-backdrop-filter` twin is present (vitejs/vite#22649,
      // parcel-bundler/lightningcss#695). The hub's glass language
      // (topbar/cards/dome) is written with the standard + -webkit pair, so
      // the default minifier erases the glass. Pinning 'esbuild' (the Vite 7
      // default minifier) preserves both properties — requires `esbuild` as
      // an explicit devDependency (Vite 8 no longer bundles it).
      cssMinify: 'esbuild',
      // Vite 8: rollupOptions → rolldownOptions; function-form manualChunks is
      // deprecated → rolldown output.codeSplitting groups (three / pglite
      // vendor split, same intent as the v6 manualChunks map).
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'three', test: /node_modules[\\/]three/ },
              { name: 'pglite', test: /@electric-sql[\\/]pglite/ },
            ],
          },
        },
      },
    },
    plugins: [],
  },
});