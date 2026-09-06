import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { formatCurrency } from '../lib/formatters';

interface TierPlan {
  id: string;
  name: string;
  price: string;
  allowance: string;
  calls: number;
  feature: string;
}

const TIER_PLANS: TierPlan[] = [
  { id: 'free', name: 'Starter', price: '0', allowance: '0', calls: 100, feature: 'Soulbound LOVE access' },
  { id: 'pro', name: 'Pro', price: '50', allowance: '50', calls: 1000, feature: '2x burst, more endpoints' },
  { id: 'enterprise', name: 'Enterprise', price: '500', allowance: '500', calls: 10000, feature: '5x burst, dedicated allocation' },
];

export default function Billing() {
  const [did, setDid] = useState('');
  const [selected, setSelected] = useState('pro');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const subscribe = async () => {
    if (!did) {
      setError('Enter your wallet/DID first.');
      return;
    }
    setBusy(true);
    setError('');
    setStatus(null);
    try {
      const res = await fetch('/api/entitlement/tier-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did, tier: selected }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || 'Subscription failed');
      setStatus(`Subscribed ${did} to ${selected} — allowance ${formatCurrency(json?.data?.monthly_allowance_usdc ?? '0')}/mo.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Subscription failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-billing">
      <GlassCard title="Subscribe" variant="cyan">
        <p className="billing-intro">
          Upgrade to Pro or Enterprise to unlock API allowance and higher rate limits. The premium tier is
          gated by your entitlement DID.
        </p>

        <div className="billing-did-field">
          <label>Wallet / DID</label>
          <input
            type="text"
            placeholder="did:key:... or your wallet address"
            value={did}
            onChange={(e) => { setDid(e.target.value); setError(''); }}
          />
        </div>

        <div className="billing-plans">
          {TIER_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`billing-plan ${selected === plan.id ? 'selected' : ''}`}
              onClick={() => { setSelected(plan.id); setError(''); }}
            >
              <div className="billing-plan-name">{plan.name}</div>
              <div className="billing-plan-price">
                ${formatCurrency(plan.price)}<span className="billing-plan-per">/mo</span>
              </div>
              <div className="billing-plan-allowance">{formatCurrency(plan.allowance)} USDC allowance</div>
              <div className="billing-plan-calls">{plan.calls.toLocaleString()} calls/tool</div>
              <div className="billing-plan-feature">{plan.feature}</div>
            </div>
          ))}
        </div>

        {error && <div className="page-error">{error}</div>}
        {status && <div className="billing-status">{status}</div>}

        <div className="page-actions">
          <button className="btn btn-primary" onClick={subscribe} disabled={busy}>
            {busy ? 'Subscribing…' : 'Subscribe'}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
