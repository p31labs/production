'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('[P31 ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="eb-min-h--200px- eb-flex eb-items-center eb-justify-center eb-p-6">
          <div className="eb-text-center eb-space-y-3">
            <div className="eb-text-4xl">⚠️</div>
            <h2 className="eb-text-lg eb-font-bold" style={{ color: 'var(--p31-text)' }}>
              Component Error
            </h2>
            <p className="eb-text-sm eb-max-w-md" style={{ color: 'var(--p31-text-secondary)' }}>
              This section encountered an unexpected state. The rest of the page remains functional.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="eb-px-4 eb-py-2 eb-rounded-lg eb-text-sm eb-font-medium eb-transition-colors"
              style={{ background: 'var(--p31-accent)', color: '#000' }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
