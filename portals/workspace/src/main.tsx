import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
// Canon component CSS layer — imported before the portal's css so the
// portal's own values win the cascade at equal specificity (canon keeps
// attribute-scoped physics tokens; the portal's accent/brand values are
// preserved). Mirrors the design-core aggregate index.css minus the
// tokens.css shim (the shim imports '@p31/canon' which does not resolve;
// canon/base/all carry the token definitions).
import '@p31ca/design-core/css/canon.css'
import '@p31ca/design-core/css/all.css'
import '@p31ca/design-core/css/base.css'
import '@p31ca/design-core/css/layout.css'
import '@p31ca/design-core/css/typography.css'
import '@p31ca/design-core/css/motion.css'
import '@p31ca/design-core/css/glass.css'
import '@p31ca/design-core/css/quantum.css'
import '@p31ca/design-core/css/recipes.css'
import '@p31ca/design-core/css/chrome.css'
import '@p31ca/design-core/css/container.css'
import '@p31ca/design-core/css/size-class.css'
import '@p31ca/design-core/css/link-glow.css'
import '@p31ca/design-core/css/ambient.css'
import '@p31ca/design-core/css/a2ui-datacard.css'
import './globals.css'
import './workspace.css'

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

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)