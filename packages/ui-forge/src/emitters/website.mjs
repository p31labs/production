/**
 * emitters/website.mjs — the website target emitter.
 *
 * Emits a single-page Vite + React site: the component tree as App.tsx, no
 * router, no state store. The leanest React target — the "brochure" output.
 * Deterministic: same tree → byte-identical files.
 */
import { emitAppTsx, baseReactProject } from './primitives.mjs';

export function emitWebsite({ tree }, { name, designCorePath = 'file:../../packages/design-core' }) {
  if (!tree) throw new Error('emit-website: input.tree is required');
  return {
    files: baseReactProject(name, { '@p31ca/design-core': designCorePath }, {
      'src/main.tsx': [
        "import { StrictMode } from 'react';",
        "import { createRoot } from 'react-dom/client';",
        "import App from './App';",
        "import './index.css';",
        '',
        "createRoot(document.getElementById('root')!).render(",
        '  <StrictMode><App /></StrictMode>,',
        ');',
        '',
      ].join('\n'),
      'src/App.tsx': emitAppTsx(tree),
      'src/index.css': '/* canon tokens + compositions load via @p31ca/design-core */\n',
    }),
  };
}

export default emitWebsite;