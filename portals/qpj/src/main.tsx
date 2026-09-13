import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import '@p31/design-core/css/all.css';
import '@p31/design-core/css/container.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);