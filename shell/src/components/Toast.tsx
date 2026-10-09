import { useEffect } from "react";
import { useSensoryStore } from "../store/useSensoryStore";
interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type = 'success', onClose }: ToastProps) {
  const focus = useSensoryStore((s) => s.focus);

  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Focus mode suppresses non-critical toasts (errors always surface).
  if (focus && type !== 'error') return null;

  return (
    <div id="toastContainer" role="status" aria-live="polite" aria-atomic="true" style={{
      position: 'fixed',
      top: '8px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 'var(--p31-z-toast)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--p31-space-tiny)',
      pointerEvents: 'none',
    }}>
      <div className="toast" style={{ borderLeft: type === 'error' ? '4px solid var(--p31-accent-red)' : '4px solid var(--p31-accent-green)' }}>
        {message}
      </div>
    </div>
  );
}
