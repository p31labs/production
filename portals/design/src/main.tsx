import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Cascade-layer CSS entry — design-core canon first, then suite shell, then
// portal content. JS-side imports resolve package subpaths reliably (the
// workspace/mcp-marketplace pattern); CSS-side @import was silently dropped
// by Vite in the two-entry build.
import '@p31ca/design-core/css/index.css';
import './tokens.css';
import './workspace.css';
import './globals.css';
import './content.css';
import './index.css';
import './polish.css';
import './surfaces/surface.css';
import './utilities.css';
import './surfaces/legacy-missing.css';
import './surfaces/dome.css';
import '@p31/p31ca-ambient/css/molecular-dome.css';
import '@p31/p31ca-ambient/css/p31-style.css';
import '@p31/p31ca-ambient/css/controls.css';
import './surfaces/ambient.css';
import { useThemeStore } from '@p31ca/design-core/theming/theme-store';

// p31-enterprise-baseline: SW registration + path→hash deep-link pre-hook.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
(() => {
  const seg = location.pathname.replace(/^\/+/, '').split('/')[0];
  if (seg && /^[a-z0-9-]+$/i.test(seg) && !/\.(html|js|css|png|json|svg|ico|webmanifest|txt|xml)$/i.test(seg)) {
    history.replaceState(null, '', '/');
    location.hash = '#/' + seg;
  }
})();

useThemeStore.getState().applyTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
