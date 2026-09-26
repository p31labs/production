import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../index.css';
import { useThemeStore } from '@p31ca/design-core/theming/theme-store';

useThemeStore.getState().applyTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
