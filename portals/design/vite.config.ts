import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'preserve-design-system-css',
      closeBundle() {
        const base = path.resolve(__dirname, 'design-core/src');
        const parts = [
          'generated/color-palette.css',
          'generated/typography-scale.css',
          'css/recipes.css',
          'recipes/forms.css',
          'recipes/responsive.css',
          'generated/spoon-ladder.css',
          'styles/accessibility.css',
        ];
        const dest = path.resolve(__dirname, 'dist/design-system.css');
        const missing = parts.filter((p) => !fs.existsSync(path.join(base, p)));
        if (missing.length) throw new Error(`design-system sources missing: ${missing.join(', ')}`);
        fs.writeFileSync(
          dest,
          `/* P31 design-system bundle (concatenated from design-core) */\n` +
            parts.map((p) => fs.readFileSync(path.join(base, p), 'utf8')).join('\n')
        );
        console.log('✅ Bundled design-system.css (' + parts.length + ' parts)');
      },
    },
  ],
  server: { port: 5190, host: true },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 800,
    cssMinify: false,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';
          if (id.includes('design-core')) return 'vendor-sovereign';
        },
      },
    },
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
