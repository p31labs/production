import { useQpjStore } from '../store/useQpjStore';

export function Toast() {
  const toast = useQpjStore((s) => s.toast);
  const clearToast = useQpjStore((s) => s.clearToast);

  if (!toast) return null;

  return (
    <div className={`toast toast--${toast.type ?? 'info'}`} role="status" aria-live="polite">
      <span className="toast__message">{toast.message}</span>
      <button
        type="button"
        className="toast__close"
        onClick={clearToast}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}