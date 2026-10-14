import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initObservability } from './lib/observability'
// Canon v2 CSS wiring (docs/enterprise/design-system/canon-v2.md §4):
//   1. layers.css FIRST — the first @layer order declaration wins
//   2. the canon tokens (emits @layer canon.tokens)
//   3. the aggregate index.css (bundles canon-v2.css + the legacy
//      design-core recipes the Topbar/Starfield compositions still use)
// Then the portal sheets, every one wired into a layer by globals.css.
import '@p31ca/canon/css/layers.css'
import '@p31ca/canon/tokens.css'
import '@p31ca/design-core/css/index.css'
import './globals.css'

// p31-enterprise-baseline: SW registration + path→hash deep-link pre-hook.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
(() => {
  const seg = location.pathname.replace(/^\/+/, '').split('/')[0];
  if (seg && /^[a-z0-9-]+$/i.test(seg) && !/\.(html|js|css|png|json|svg|ico|webmanifest|txt|xml)$/i.test(seg)) {
    history.replaceState(null, '/');
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