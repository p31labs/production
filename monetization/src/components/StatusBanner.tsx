import { useState, useEffect } from 'react';
import { configApi } from '../api/config';

interface ServiceStatus {
  name: string;
  ok: boolean;
  detail?: string;
}

export default function StatusBanner() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const results: ServiceStatus[] = [
        { name: 'Config', ok: false },
        { name: 'Revenue', ok: false },
        { name: 'Yield', ok: false },
      ];
      try {
        await configApi.getConfig();
        results[0].ok = true;
      } catch {
        results[0].ok = false;
      }
      try {
        const res = await fetch('/api/revenue/summary');
        results[1].ok = res.ok;
      } catch {
        results[1].ok = false;
      }
      try {
        const res = await fetch('/api/yield-vault/stats');
        results[2].ok = res.ok;
      } catch {
        results[2].ok = false;
      }
      if (!cancelled) {
        setServices(results);
        setChecked(true);
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const allOk = checked && services.every((s) => s.ok);
  const someDown = checked && services.some((s) => !s.ok);

  return (
    <div className={`status-banner ${allOk ? 'ok' : someDown ? 'degraded' : ''}`}>
      <span className={`status-banner-dot ${allOk ? 'ok' : someDown ? 'degraded' : 'loading'}`} />
      {!checked
        ? 'Checking service health…'
        : allOk
          ? 'All Systems Operational'
          : `${services.filter((s) => !s.ok).length} service(s) degraded`}
    </div>
  );
}
