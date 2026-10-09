/**
 * loom-enforcement-guard — the enforce-spike detector (auto-rollback alert).
 *
 * A canary without auto-reversal is theater. When LUMI_ENFORCEMENT is
 * 'enforce', this Worker checks every 15 minutes whether the enforced-refusal
 * rate is spiking > 3x the observe baseline (rolling 24h). On a spike it
 * appends a `view.save` rollback-alert event through the API (the gate assigns
 * seq/hash, preserving chain semantics), so the operator sees it in the chain
 * and in /api/loom/events. The auto-flip itself (LUMI_ENFORCEMENT=observe via
 * the Pages API) is the documented follow-up — flipping via the env_vars PATCH
 * needs care not to clobber the redacted secrets.
 */
import { codename } from '@p31ca/canon/loom/codename';

const SPIKE_MULTIPLIER = 3;
const MIN_SPIKE_COUNT = 4;          // a burst needs ≥ 4 refusals to be a spike
const WINDOW_MS = 15 * 60_000;
const BASELINE_MS = 24 * 3_600_000;

/** Pure spike detector: enforce-mode refusals in the recent window exceeding
 *  `multiplier` × the per-window observe baseline (rolling 24h), and at least
 *  `MIN_SPIKE_COUNT` refusals (a single refusal without a baseline isn't a
 *  spike). Exported for unit tests. */
export function isEnforceSpike(recentEnforceCount: number, baselineObserveCount: number, multiplier = SPIKE_MULTIPLIER): boolean {
  const windows = Math.floor(BASELINE_MS / WINDOW_MS);
  const perWindowBaseline = Math.max(1, baselineObserveCount / windows);
  return recentEnforceCount >= MIN_SPIKE_COUNT && recentEnforceCount > multiplier * perWindowBaseline;
}

interface RefusalRow { ts: string; mode: string; reason: string; }

interface Env {
  LOOM_D1: import('@cloudflare/workers-types').D1Database;
  LOOM_API_BASE: string;
  CF_ACCESS_CLIENT_ID: string;
  CF_ACCESS_CLIENT_SECRET: string;
}

export default {
  async scheduled(_controller: { scheduledTime: number }, env: Env): Promise<void> {
    try {
      const now = Date.now();
      const windowStart = new Date(now - WINDOW_MS).toISOString();
      const baselineStart = new Date(now - BASELINE_MS).toISOString();

      const recent = await env.LOOM_D1.prepare(
        'SELECT ts, mode, reason FROM refusals WHERE mode = ? AND ts >= ? ORDER BY ts ASC',
      ).bind('enforce', windowStart).all<RefusalRow>();
      const baseline = await env.LOOM_D1.prepare(
        'SELECT ts, mode FROM refusals WHERE mode = ? AND ts >= ? ORDER BY ts ASC',
      ).bind('observe', baselineStart).all<RefusalRow>();

      const spike = isEnforceSpike(recent.results?.length ?? 0, baseline.results?.length ?? 0);

      console.log(`[guard] enforce refusals (15m): ${recent.results?.length ?? 0} · observe baseline (24h): ${baseline.results?.length ?? 0} · spike: ${spike}`);
      if (!spike) return;

      // Append a rollback-alert view.save through the API so the gate assigns
      // seq/hash (chain semantics preserved).
      const res = await fetch(`${env.LOOM_API_BASE}/api/loom/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID,
          'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET,
        },
        body: JSON.stringify({
          input: {
            writer: 'human',
            kind: 'view.save',
            label: `auto-rollback-alert-${now}`,
            from: 0,
            to: Number.MAX_SAFE_INTEGER,
            scope: 'shared',
            statedBy: codename('loom-enforcement-guard'),
          },
        }),
      });
      console.log(`[guard] rollback-alert event: ${res.status} ${(await res.text()).slice(0, 120)}`);
    } catch (e) {
      console.error('[guard] failed', String(e));
    }
  },
};