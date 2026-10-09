import { useState } from 'react';
import { api } from '../api/client';
import { MetricCard } from '../components/MetricCard';
import { StatusBanner } from '../components/StatusBanner';
import { useNotifStore } from '../lib/useNotifStore';

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

const COINBASE_APP_ID = import.meta.env.VITE_COINBASE_ONRAMP_APP_ID || '';
const TRANSAK_API_KEY = import.meta.env.VITE_TRANSAK_API_KEY || '';

function coinbaseUrl(wallet: string, amount?: string): string | null {
  if (!COINBASE_APP_ID) return null;
  const url = new URL('https://pay.coinbase.com/buy/select-asset');
  url.searchParams.set('appId', COINBASE_APP_ID);
  if (wallet.startsWith('0x')) {
    url.searchParams.set('addresses', JSON.stringify({ [wallet]: ['base', 'ethereum'] }));
  }
  url.searchParams.set('assets', JSON.stringify(['USDC']));
  if (amount) url.searchParams.set('presetFiatAmount', amount);
  url.searchParams.set('fiatCurrency', 'USD');
  return url.toString();
}

function transakUrl(wallet: string, amount?: string): string | null {
  if (!TRANSAK_API_KEY) return null;
  const url = new URL('https://global.transak.com/');
  url.searchParams.set('apiKey', TRANSAK_API_KEY);
  url.searchParams.set('referrerDomain', window.location.hostname);
  url.searchParams.set('cryptoCurrencyCode', 'USDC');
  url.searchParams.set('network', 'base');
  url.searchParams.set('productsAvailed', 'BUY');
  if (wallet.startsWith('0x')) {
    url.searchParams.set('walletAddress', wallet);
    url.searchParams.set('disableWalletAddressForm', 'true');
  }
  if (amount) url.searchParams.set('defaultFiatAmount', amount);
  url.searchParams.set('defaultFiatCurrency', 'USD');
  return url.toString();
}

export default function BillingSurface() {
  const [did, setDid] = useState('');
  const [selected, setSelected] = useState('pro');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fundAmount, setFundAmount] = useState('50');
  const notify = useNotifStore((s) => s.notify);

  const openOnramp = (provider: 'coinbase' | 'transak') => {
    const url = provider === 'coinbase' ? coinbaseUrl(did, fundAmount) : transakUrl(did, fundAmount);
    if (!url) {
      setError(provider === 'coinbase'
        ? 'Coinbase Onramp not configured (VITE_COINBASE_ONRAMP_APP_ID).'
        : 'Transak not configured (VITE_TRANSAK_API_KEY).');
      return;
    }
    window.open(url, '_blank', 'noopener');
  };

  const subscribe = async () => {
    if (!did) {
      setError('Enter your wallet/DID first.');
      return;
    }
    setBusy(true);
    setError('');
    setStatus(null);
    try {
      const plan = TIER_PLANS.find((p) => p.id === selected)!;
      const result = await api.checkEntitlement(did, plan.allowance, true);
      setStatus(result.allowed ? `Entitlement confirmed — allowance ${result.remaining ?? 'available'}.` : `Blocked: ${result.reason ?? 'over allowance'}.`);
      notify({ kind: result.allowed ? 'success' : 'error', title: 'Entitlement check', body: result.reason });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Entitlement check failed');
    } finally {
      setBusy(false);
    }
  };

  const selectedPlan = TIER_PLANS.find((p) => p.id === selected)!;

  return (
    <div className="surface-page">
      <header className="surface-head">
        <div>
          <h2 className="surface-title">Billing</h2>
          <p className="surface-sub">Tier plans, entitlements, and on-ramp funding.</p>
        </div>
      </header>

      {error && <StatusBanner kind="error">{error}</StatusBanner>}
      {status && (
        <div className="status-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span>{status}</span>
          <span className="integrity-badge">✓ Entitlement verified</span>
        </div>
      )}

      <div className="metric-grid">
        <MetricCard label="Selected Plan" value={selectedPlan.name} sub={`$${selectedPlan.price}/mo · ${selectedPlan.calls} calls`} accent="violet" />
        <MetricCard label="Allowance" value={`$${selectedPlan.allowance}`} sub="per-period usage credit" accent="gold" />
      </div>

      <div className="row-list">
        {TIER_PLANS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            className="row-card"
            style={{ textAlign: 'left', cursor: 'pointer' }}
            onClick={() => setSelected(plan.id)}
          >
            <div className="row-card__head">
              <span className="row-card__title">{plan.name}</span>
              <span className={`badge ${selected === plan.id ? 'badge-spark' : 'badge-maker'}`}>
                {selected === plan.id ? 'SELECTED' : `$${plan.price}/mo`}
              </span>
            </div>
            <div className="row-card__meta">{plan.feature} · {plan.calls} calls · ${plan.allowance} allowance</div>
          </button>
        ))}
      </div>

      <div className="surface-card" style={{ marginBottom: 'var(--p31-space-6)' }}>
        <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-4)' }}>Fund & Verify</h3>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="billing-did">Wallet / DID</label>
            <input id="billing-did" type="text" value={did} onChange={(e) => setDid(e.target.value)} placeholder="did:key:z… or 0x…" />
          </div>
          <div className="field">
            <label htmlFor="billing-amount">Fund amount (USD)</label>
            <input id="billing-amount" type="text" inputMode="decimal" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} />
          </div>
        </div>
        <div className="surface-actions" style={{ marginTop: 'var(--p31-space-4)' }}>
          <button className="btn btn-primary" type="button" onClick={subscribe} disabled={busy}>
            {busy ? 'Checking…' : 'Check Entitlement'}
          </button>
          <button className="btn btn-glass" type="button" onClick={() => openOnramp('coinbase')}>Coinbase Onramp</button>
          <button className="btn btn-glass" type="button" onClick={() => openOnramp('transak')}>Transak</button>
        </div>
      </div>
    </div>
  );
}