import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { configure } from '@p31/sovereign-core';
import App from './App';
import '@p31/design-core/css/all.css';
import '@p31/ui/chrome.css';
import './index.css';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE || 'production',
    tracesSampleRate: 0.01,
    beforeSend(event) {
      const extra = event.extra as Record<string, unknown> | undefined;
      if (extra) {
        if (extra.chatMessage) extra.chatMessage = '[REDACTED]';
        if (extra.history) extra.history = '[REDACTED]';
        if (extra.toolArguments) extra.toolArguments = '[REDACTED]';
      }
      return event;
    },
  });
}

configure({ profilePrefix: 'meatspace:' });

const Root = Sentry.withErrorBoundary(App, {
  fallback: (
    <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--p31-font-sans)' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🫂</div>
      <h2 style={{ fontSize: '28px' }}>Something went wrong</h2>
      <p style={{ color: 'var(--p31-text-secondary)' }}>
        Try refreshing the page. If the problem persists, please try again later.
      </p>
    </div>
  ),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
