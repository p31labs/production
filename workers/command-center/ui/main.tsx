import { createRoot } from 'react-dom/client';

import '@p31ca/design-core/css/base.css';
import '@p31ca/design-core/css/all.css';
import '@p31ca/design-core/css/theme-p31ca.css';
import '@p31ca/design-core/css/typography.css';
import '@p31ca/design-core/css/layout.css';
import '@p31ca/design-core/css/container.css';
import '@p31ca/design-core/css/motion.css';
import '@p31ca/design-core/css/ambient.css';
import '@p31ca/design-core/css/quantum.css';
import '@p31ca/design-core/css/recipes.css';
import '@p31ca/design-core/css/chrome.css';
import '@p31ca/design-core/css/canon.css';
import './dashboard.css';

import { App } from './App';

const el = document.getElementById('root');
if (el) {
  createRoot(el).render(<App />);
}
