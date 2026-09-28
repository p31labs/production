import { useEffect, useState } from 'react';
import { fetchEnv, fetchStatus, fetchAudit, SCOPE_LABELS, type Scope, type EnvList, type EnvStatus, type AuditRow } from './env';
import { useSpoonsStore } from './useSpoonsStore';

const MASK = '••••••••';

const fmtTs = (ms: number) => {
  const d = new Date(ms);
  return d.toISOString().slice(0, 16).replace('T', ' ');
};

export function EnvSurface() {
  const spoons = useSpoonsStore((s) => s.spoons);
  const [scope, setScope] = useState<'all' | 'capital' | 'mcp'>('all');
  const [env, setEnv] = useState<EnvList | null>(null);
  const [status, setStatus] = useState<EnvStatus | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    Promise.all([fetchEnv(scope), fetchStatus(), fetchAudit(20)])
      .then(([e, s, a]) => {
        if (cancelled) return;
        setEnv(e);
        setStatus(s);
        setAudit(a);
      })
      .catch((e) => !cancelled && setErr(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [scope]);

  return (
    <section className="env-surface" aria-label="Environment command center">
      {spoons === 0 && (
        <div className="env-crisis" role="status">
          <p className="env-crisis__title">Crisis mode — secret management paused.</p>
          <p className="env-crisis__body">Read-only. No reveals, no rotation, no changes while the floor is calm.</p>
        </div>
      )}

      <div className="env-head">
        <div className="env-scope" role="group" aria-label="Environment scope">
          {(Object.keys(SCOPE_LABELS) as Scope[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`chip${scope === s ? ' active' : ''}`}
              onClick={() => setScope(s)}
            >
              {SCOPE_LABELS[s]}
            </button>
          ))}
        </div>
        <p className="env-lede">Secret <em>names</em> across the fleet — values never leave Cloudflare. Missing = the gap to close.</p>
      </div>

      {err && <p className="env-error">{err}</p>}
      {loading && <p className="env-loading" aria-live="polite">Reading the fleet…</p>}

      {status && (
        <div className="env-status">
          <MetricBadge value={String(status.totals.totalSecrets)} label="secrets" />
          <MetricBadge value={String(status.totals.missingRequiredCount)} label="missing required" warn={status.totals.missingRequiredCount > 0} />
          <MetricBadge value={String(status.totals.staleCount)} label="stale (>90d)" warn={status.totals.staleCount > 0} />
          <MetricBadge value={String(status.totals.workers)} label="workers" />
        </div>
      )}

      {env && (
        <div className="env-workers">
          {env.workers.map((w) => (
            <article key={w.worker} className="env-worker glass-tile">
              <header className="env-worker__head">
                <h3 className="env-worker__name">{w.worker}</h3>
                {w.error && <span className="badge" data-tone="error">{w.error}</span>}
                {w.missing.length > 0 && <span className="badge" data-tone="warning">missing {w.missing.length}</span>}
              </header>
              <div className="env-worker__secrets">
                {w.secrets.length === 0 && !w.error && <span className="env-empty">no secrets bound</span>}
                {w.secrets.map((name) => (
                  <span key={name} className="env-secret" title="name only — value never exposed">
                    <span className="env-secret__mask" aria-hidden="true">{MASK}</span>
                    <span className="env-secret__name">{name}</span>
                  </span>
                ))}
              </div>
              {w.required.length > 0 && (
                <footer className="env-worker__foot">
                  <span className="env-req-label">required</span>
                  {w.required.map((r) => (
                    <span key={r} className={`chip chip--micro${w.missing.includes(r) ? ' env-missing' : ''}`}>
                      {r}{w.missing.includes(r) ? ' ✕' : ' ✓'}
                    </span>
                  ))}
                </footer>
              )}
            </article>
          ))}
        </div>
      )}

      {audit.length > 0 && (
        <div className="env-audit glass-tile">
          <h3 className="env-audit__title">Audit</h3>
          <ul className="env-audit__list">
            {audit.map((row) => (
              <li key={row.key_id} className="env-audit__row">
                <span className="env-audit__action">{row.action}</span>
                <span className="env-audit__key mono">{row.key_id}</span>
                <span className="env-audit__worker">{row.worker_name ?? '—'}</span>
                <span className="env-audit__ts">{fmtTs(row.ts)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function MetricBadge({ value, label, warn }: { value: string; label: string; warn?: boolean }) {
  return (
    <div className={`env-metric${warn ? ' warn' : ''}`}>
      <span className="env-metric__value">{value}</span>
      <span className="env-metric__label">{label}</span>
    </div>
  );
}