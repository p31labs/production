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
  url.searchParams.set('themeColor', '00F0FF');
  if (wallet.startsWith('0x')) {
    url.searchParams.set('walletAddress', wallet);
    url.searchParams.set('disableWalletAddressForm', 'true');
  }
  if (amount) url.searchParams.set('defaultFiatAmount', amount);
  url.searchParams.set('defaultFiatCurrency', 'USD');
  return url.toString();
}

export default function Billing() {
  const [did, setDid] = useState('');
  const [selected, setSelected] = useState('pro');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fundAmount, setFundAmount] = useState('50');

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

      <GlassCard title="Fund Wallet" variant="gold">
        <p className="billing-intro">
          Buy USDC on Base with a card or bank transfer, sent straight to your wallet.
          US-based? Coinbase Onramp. Elsewhere? Transak covers 150+ countries.
        </p>
        <div className="billing-did-field">
          <label>Amount (USD)</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="50"
            value={fundAmount}
            onChange={(e) => { setFundAmount(e.target.value); setError(''); }}
          />
        </div>
        {error && <div className="page-error">{error}</div>}
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => openOnramp('coinbase')} disabled={!did.startsWith('0x') && !did.startsWith('did:')}>
            Fund via Coinbase
          </button>
          <button className="btn" onClick={() => openOnramp('transak')} disabled={!did.startsWith('0x') && !did.startsWith('did:')}>
            Fund via Transak
          </button>
        </div>
        <p className="billing-intro" style={{ marginTop: 8 }}>
          Enter your <code>0x…</code> wallet above (DID also accepted for tier gating).
        </p>
      </GlassCard>
    </div>
  );
}
