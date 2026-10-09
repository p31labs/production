import { useCallback, useEffect, useState } from 'react';

interface ChainVerdict {
  valid: boolean;
  checked: number;
  brokenAt: number | null;
  head: string;
}

interface ChainStatusProps {
  /** Prominent placement (family view) vs subtle (the bar). */
  prominent?: boolean;
}

/**
 * The chain-status widget — the /api/loom/verify endpoint made human-readable.
 *
 * Converts the tamper-evidence technical feature into a constant trust signal:
 * a green "Chain verified · N events" when the hash chain replays clean, or a
 * red state naming the broken seq when it does not. This is the visible proof
 * of the co-presence promise: the log cannot be silently altered.
 *
 * Read-only. `Cache-Control: no-store` on the endpoint guarantees a fresh
 * verdict every poll. When unauthenticated (Access redirect / 401), the widget
 * falls back to a neutral "chain status unavailable" line — never a false
 * green.
 */
export function ChainStatus({ prominent = false }: ChainStatusProps) {
  const [verdict, setVerdict] = useState<ChainVerdict | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'broken' | 'unavailable'>('loading');

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/loom/verify', { cache: 'no-store' });
      if (!res.ok) {
        setState('unavailable');
        setVerdict(null);
        return;
      }
      const v = (await res.json()) as ChainVerdict;
      setVerdict(v);
      setState(v.valid ? 'ok' : 'broken');
    } catch {
      setState('unavailable');
      setVerdict(null);
    }
  }, []);

  useEffect(() => {
    void poll();
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, [poll]);

  const cls = `chain-status ${state}${prominent ? ' chain-status--prominent' : ''}`;

  return (
    <div
      className={cls}
      data-agent-kind="status"
      data-agent-action="chain.verify"
      role="status"
      aria-live="polite"
    >
      {state === 'loading' && <span className="chain-dot" aria-hidden="true" />}
      {state === 'ok' && verdict && (
        <>
          <span className="chain-dot chain-dot--ok" aria-hidden="true" />
          <span className="chain-label">
            Chain verified
            {prominent ? ` · ${verdict.checked} events` : ''}
            {prominent ? ` · head ${verdict.head.slice(0, 8)}` : ''}
          </span>
        </>
      )}
      {state === 'broken' && verdict && (
        <>
          <span className="chain-dot chain-dot--broken" aria-hidden="true" />
          <span className="chain-label">
            Chain BROKEN at seq {verdict.brokenAt} — the log was altered.
          </span>
        </>
      )}
      {state === 'unavailable' && (
        <span className="chain-label chain-label--muted">Chain status unavailable</span>
      )}
    </div>
  );
}