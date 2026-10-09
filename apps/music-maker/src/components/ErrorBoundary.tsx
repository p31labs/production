/**
 * The music maker — ErrorBoundary.
 *
 * The instrument runs inside QPJ's sandboxed iframe. When a render or effect
 * throws, the iframe's own console is the only signal — the parent shell cannot
 * see it, so an unhandled crash would look like a white frame. This boundary
 * renders a warm, recoverable message instead, and logs the stack to the
 * iframe's console for the grown-ups.
 */
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Called with the error after it is logged — a hook for telemetry/bridge. */
  onError?: (error: Error) => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error('[music-maker] render/effect crashed:', error);
    this.props.onError?.(error);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="mm-crash" role="alert">
          <p className="mm-crash__title">the instrument took a nap</p>
          <p className="mm-crash__body">tap anywhere to try again.</p>
          <button
            type="button"
            className="mm-btn"
            onClick={() => this.setState({ error: null })}
          >
            wake it up
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}