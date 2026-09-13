import React from 'react';
import ReactDOM from 'react-dom/client';
import { GreyRock } from '@p31/ui/adaptive/GreyRock';
import { useNeuroAdapter } from '@p31/ui/adaptive/NeuroAdapter';
import App from './App';
import '../index.css';
import { useThemeStore } from '@p31/design-core/theming/theme-store';

useThemeStore.getState().applyTheme();

function AdaptiveRoot({ children }: { children: React.ReactNode }) {
  useNeuroAdapter({ emitInterval: 2000 });
  return <GreyRock passport={null}>{children}</GreyRock>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AdaptiveRoot>
      <App />
    </AdaptiveRoot>
  </React.StrictMode>,
);
