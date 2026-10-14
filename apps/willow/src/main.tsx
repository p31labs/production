import '@p31ca/design-core/css/base.css';
import '@p31ca/design-core/css/glass.css';
import '@p31ca/design-core/css/size-class.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
