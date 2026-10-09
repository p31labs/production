/**
 * emitters/app.mjs — the app target emitter.
 *
 * Emits a multi-route Vite + React application: the component tree as a route
 * element, React Router v7 (manual configuration, per the v7 recommendation —
 * not file-based conventions), and a zustand store stub.
 *
 * The route tree is deliberately trivial — a single "/" route wrapping the
 * generated tree. This is intentional v1: the emitter proves the app
 * *scaffold* builds. Real multi-route routing is a follow-up field in the
 * handoff contract (a route manifest), not a hardcoded single route.
 *
 * Deterministic: same tree → byte-identical files.
 */
import { emitAppTsx, baseReactProject } from './primitives.mjs';

export function emitApp({ tree }, { name, designCorePath = 'file:../../packages/design-core' }) {
  if (!tree) throw new Error('emit-app: input.tree is required');
  return {
    files: baseReactProject(
      name,
      {
        '@p31ca/design-core': designCorePath,
        'react-router-dom': '^7.0.0',
        zustand: '^5.0.0',
      },
      {
        'src/main.tsx': [
          "import { StrictMode } from 'react';",
          "import { createRoot } from 'react-dom/client';",
          "import { RouterProvider } from 'react-router-dom';",
          "import { router } from './routes';",
          "import './index.css';",
          '',
          "createRoot(document.getElementById('root')!).render(",
          '  <StrictMode><RouterProvider router={router} /></StrictMode>,',
          ');',
          '',
        ].join('\n'),
        'src/routes.tsx': [
          "import { createBrowserRouter } from 'react-router-dom';",
          "import App from './App';",
          '',
          '/**',
          ' * React Router v7 manual route configuration.',
          ' * v7 recommends manual routes over the fs-routes convention for',
          ' * generated apps — the route tree is known at emit time, and the',
          ' * convention adds a filesystem dependency the emitter cannot satisfy.',
          ' */',
          'export const router = createBrowserRouter([',
          "  { path: '/', element: <App /> },",
          ']);',
          '',
        ].join('\n'),
        'src/store.ts': [
          "import { create } from 'zustand';",
          '',
          '/**',
          ' * The app store. Emitted as a stub — the Grounder derives the real',
          ' * entities from the brief; the store exposes them as a typed slice.',
          ' * Extend this file when a run declares entities in the handoff block.',
          ' */',
          'export interface AppState {',
          '  ready: boolean;',
          '  setReady: (v: boolean) => void;',
          '}',
          '',
          'export const useAppStore = create<AppState>((set) => ({',
          '  ready: false,',
          '  setReady: (ready) => set({ ready }),',
          '}));',
          '',
        ].join('\n'),
        'src/App.tsx': emitAppTsx(tree),
        'src/index.css': '/* canon tokens + compositions load via @p31ca/design-core */\n',
      },
    ),
  };
}

export default emitApp;