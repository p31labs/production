import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { installAnchorRetryOnVisibility } from './lib/sbt-anchor';
import '@p31/design-core/css/all.css';
import '@p31/design-core/css/container.css';
import './index.css';

// Returning to the tab flushes any offline SBT anchors (best-effort).
installAnchorRetryOnVisibility();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);