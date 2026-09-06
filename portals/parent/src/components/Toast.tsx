interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  return (
    <div
      className={`toast show ${type === 'error' ? 'error' : ''}`}
      role="status"
      aria-live="polite"
      onAnimationEnd={() => onClose()}
    >
      {message}
    </div>
  );
}
