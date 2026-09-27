import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { installAnchorRetryOnVisibility } from './lib/sbt-anchor';
import '@p31ca/design-core/css/all.css';
import '@p31ca/design-core/css/container.css';
import './index.css';

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

// Returning to the tab flushes any offline SBT anchors (best-effort).
installAnchorRetryOnVisibility();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);