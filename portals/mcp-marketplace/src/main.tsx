import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initObservability } from './lib/observability'
import './globals.css'
import './workspace.css'
import './marketplace.css'

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

initObservability()

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)