import { useEffect } from "react";
interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div id="toastContainer" role="status" aria-live="polite" aria-atomic="true" style={{
      position: 'fixed',
      top: '8px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    }}>
      <div className="toast" style={{ borderLeft: type === 'error' ? '4px solid var(--p31-accent-red)' : '4px solid var(--p31-accent-green)' }}>
        {message}
      </div>
    </div>
  );
}
