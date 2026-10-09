import { CSSProperties } from 'react';

export interface A2ButtonProps {
  label: string;
  variant?: string;
  action?: string;
  payload?: unknown;
  disabled?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
  onAction?: (action: string, payload?: unknown, el?: HTMLElement) => void;
}

export default function A2Button({ label, variant, action, payload, disabled, style, onClick, onAction }: A2ButtonProps) {
  return (
    <button
      type="button"
      className={variant ? `btn ${variant}` : 'btn'}
      data-a2ui-action={action || ''}
      data-a2ui-payload={payload !== undefined ? JSON.stringify(payload) : ''}
      disabled={disabled}
      style={style}
      onClick={(e) => {
        if (action && onAction) onAction(action, payload, e.currentTarget);
        onClick?.();
      }}
    >
      {label}
    </button>
  );
}
