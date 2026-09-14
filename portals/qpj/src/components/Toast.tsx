import { Button } from '@p31/design-core/compositions';
import { useQpjStore } from '../store/useQpjStore';

export function Toast() {
  const toast = useQpjStore((s) => s.toast);
  const clearToast = useQpjStore((s) => s.clearToast);

  if (!toast) return null;

  return (
    <div className={`toast toast--${toast.type ?? 'info'}`} role="status" aria-live="polite">
      <span className="toast__message">{toast.message}</span>
      <Button type="button" className="toast__close" onClick={clearToast} aria-label="Dismiss notification">
        ×
      </Button>
    </div>
  );
}