import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { configure } from '@p31ca/sovereign-core';
import { useThemeStore } from '@p31ca/shell-chrome';
import { getTrustedTypesPolicy } from './lib/trustedTypes';
import App from './App';
import './index.css';

configure({ profilePrefix: 'shell:' });

// Apply persisted theme before first paint (prevents flash)
const theme = JSON.parse(localStorage.getItem('p31-theme') || '{}');
if (theme?.state?.theme) useThemeStore.getState().setTheme(theme.state.theme);
if (theme?.state?.age) useThemeStore.getState().setAge(theme.state.age);
useThemeStore.getState().applyTheme();

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE || 'production',
    tracesSampleRate: 0.01,
  });
}

// Register service worker (manual, with Trusted Types support)
if ('serviceWorker' in navigator) {
  const swUrl = '/sw.js';
  const policy = getTrustedTypesPolicy();
  const registerSw = async () => {
    try {
      const url = policy ? policy.createScriptURL(swUrl) : swUrl;
      await navigator.serviceWorker.register(url, { scope: '/' });
    } catch {
      // SW registration is optional; app works without it
    }
  };
  window.addEventListener('load', registerSw);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div style={{ padding: 24, fontFamily: 'monospace' }}>Something went wrong.</div>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
