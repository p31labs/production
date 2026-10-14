// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import rehypeMermaidLite from 'rehype-mermaid-lite';

// NOTE (Astro v6): the @astrojs/cloudflare adapter is intentionally NOT in
// integrations/config. With Astro 6 an adapter forces the Workers output
// layout (dist/server/.prerender + dist/client + an ASSETS binding) even
// under `output: 'static'`, which breaks the Pages static deploy
// (`wrangler pages deploy dist` expects dist/index.html). The hub is a
// static Pages site — the adapter stays installed (latest, per the upgrade
// runbook) for a future Workers-runtime move, but is not wired here.
export default defineConfig({
  output: 'static',
  integrations: [react()],
  site: 'https://p31ca.org',
  trailingSlash: 'always',
  markdown: {
    syntaxHighlight: {
      excludeLangs: ['mermaid'],
    },
    rehypePlugins: [rehypeMermaidLite],
  },
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    // Astro v6: @vitejs/plugin-react (via @astrojs/react) transforms the app's
    // .tsx, but workspace-package sources consumed raw via package exports
    // (e.g. @p31ca/ui/chrome — exports point at ./src/*.tsx) fall through to
    // esbuild with the ROOT tsconfig's classic JSX mode, emitting
    // React.createElement with no React binding (SSR ReferenceError). Pinning
    // the automatic runtime here keeps every .tsx on the react/jsx-runtime
    // automatic transform regardless of which tsconfig esbuild discovers.
    esbuild: {
      jsx: 'automatic',
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) return 'three';
            if (id.includes('@electric-sql/pglite')) return 'pglite';
          },
        },
      },
    },
    plugins: [],
  },
});
