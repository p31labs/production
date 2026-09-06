export function formatCurrency(value: string | number, decimals = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatAPY(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function safeDate(input: string | number | Date | undefined | null): Date | null {
  if (!input) return null;
  const date = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatTime(timestamp: string | number | Date | undefined | null): string {
  const date = safeDate(timestamp);
  if (!date) return '—';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDate(timestamp: string | number | Date | undefined | null): string {
  const date = safeDate(timestamp);
  if (!date) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTime(timestamp: string | number | Date | undefined | null): string {
  const date = safeDate(timestamp);
  if (!date) return '—';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
