import { useEffect } from 'react';

export interface A2ToastProps {
  message: string;
  variant?: string;
  onToast?: (message: string, variant?: string) => void;
}

export default function A2Toast({ message, variant, onToast }: A2ToastProps) {
  useEffect(() => {
    onToast?.(message, variant);
  }, [message, variant, onToast]);
  return null;
}
