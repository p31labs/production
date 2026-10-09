import { useEffect, useState } from 'react';
import { loadConfig, type P31Config } from '../config';
import { configApi, setAdminToken, type ConfigEntry } from '../api/config';
import { ConfigField } from '../components/ConfigField';
import { StatusBanner } from '../components/StatusBanner';
import { useNotifStore } from '../lib/useNotifStore';

type FeatureKey = keyof P31Config['features'];
type Tab = 'rpc' | 'vaults' | 'strategies' | 'features' | 'secrets' | 'workers';

const TABS: { id: Tab; label: string }[] = [
  { id: 'rpc', label: 'RPC Endpoints' },
  { id: 'vaults', label: 'Vault Addresses' },
  { id: 'strategies', label: 'RWA Strategies' },
  { id: 'features', label: 'Feature Flags' },
  { id: 'secrets', label: 'Secrets' },
  { id: 'workers', label: 'Workers' },
];

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  hint: string;
  category: 'rpc' | 'vault' | 'strategy';
}

const RPC_FIELDS: FieldDef[] = [
  { key: 'rpc.eth', label: 'RPC_URL_ETH', placeholder: 'https://eth-mainnet.g.alchemy.com/v2/…', hint: 'Ethereum mainnet', category: 'rpc' },
  { key: 'rpc.base', label: 'RPC_URL_BASE', placeholder: 'https://base-mainnet.g.alchemy.com/v2/…', hint: 'Base L2', category: 'rpc' },
  { key: 'rpc.arb', label: 'RPC_URL_ARB', placeholder: 'https://arb-mainnet.g.alchemy.com/v2/…', hint: 'Arbitrum', category: 'rpc' },
  { key: 'rpc.bera', label: 'RPC_URL_BERA', placeholder: 'https://rpc.berachain.com/…', hint: 'Berachain', category: 'rpc' },
];

const VAULT_FIELDS: FieldDef[] = [
  { key: 'vault.aave', label: 'AAVE_POOL_ADDRESS', hint: 'Aave V3 pool', category: 'vault' },
  { key: 'vault.compound', label: 'COMPOUND_COMPTROLLER', hint: 'Compound comptroller', category: 'vault' },
  { key: 'vault.morpho', label: 'MORPHO_VAULT_ADDRESS', hint: 'Morpho Blue', category: 'vault' },
  { key: 'vault.bend_honey', label: 'BEND_HONEY_VAULT_ADDRESS', hint: 'Bend / Berachain HONEY vault', category: 'vault' },
];

const STRATEGY_FIELDS: FieldDef[] = [
  { key: 'strategy.midas', label: 'MIDAS_VAULT_ADDRESS', hint: 'mF-ONE RWA (~16.6% APY)', category: 'strategy' },
  { key: 'strategy.opentrade', label: 'OPENTRADE_POOL_ADDRESS', hint: 'XDFIS RWA (~13% APY)', category: 'strategy' },
  { key: 'strategy.euler', label: 'EULER_VAULT_ADDRESS', hint: 'Euler RWA USDC (~10% APY)', category: 'strategy' },
  { key: 'strategy.ethena', label: 'ETHENA_VAULT_ADDRESS', hint: 'Ethena sUSDe (6% + cashback)', category: 'strategy' },
  { key: 'strategy.benpay', label: 'BENPAY_VAULT_ADDRESS', hint: 'BenPay DeFi Earn (~13.8%)', category: 'strategy' },
  { key: 'strategy.moonwell', label: 'MOONWELL_VAULT_ADDRESS', hint: 'Moonwell lending (~7.5%)', category: 'strategy' },
  { key: 'strategy.pendle', label: 'PENDLE_VAULT_ADDRESS', hint: 'Pendle fixed-yield (6.8%)', category: 'strategy' },
  { key: 'strategy.peapods', label: 'PEAPODS_VAULT_ADDRESS', hint: 'Peapods volatility farming', category: 'strategy' },
];

const featureLabel: Record<FeatureKey, string> = {
  x402: 'x402 payment protocol revenue tracking',
  mev: 'MEV arbitrage opportunity scanner',
  crossChain: 'Cross-chain bridge monitoring',
  love: 'LOVE token harvest and gating',
  autoCompound: 'Auto-compounder positions and yield',
  btc: 'BTC payments via BTCPay',
};

export default function SettingsSurface() {
  const [config, setConfig] = useState<P31Config>(loadConfig());
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('rpc');
  const [loadedConfig, setLoadedConfig] = useState<Record<string, ConfigEntry>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [adminTokenInput, setAdminTokenInput] = useState('');
  const [serverStatus, setServerStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const notify = useNotifStore((s) => s.notify);

  useEffect(() => {
    configApi.getConfig()
      .then(({ config: entries }) => {
        const map: Record<string, ConfigEntry> = {};
        for (const e of entries) map[e.key] = e;
        setLoadedConfig(map);
        setServerStatus('ok');
      })
      .catch(() => {
        console.warn('Config gateway unreachable');
        setServerStatus('error');
      });
  }, []);

  const allFields = [...RPC_FIELDS, ...VAULT_FIELDS, ...STRATEGY_FIELDS];
  useEffect(() => {
    setValues((prev) => {
      const next: Record<string, string> = { ...prev };
      for (const f of allFields) {
        if (!next[f.key]) next[f.key] = loadedConfig[f.key]?.value ?? '';
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedConfig]);

  const flashSaved = () => {
    setSaved(true);
    notify({ kind: 'success', title: 'Saved', body: 'Configuration persisted.' });
    setTimeout(() => setSaved(false), 2000);
  };

  const persistFeature = async (key: FeatureKey, value: boolean) => {
    setConfig((prev) => ({ ...prev, features: { ...prev.features, [key]: value } }));
    try {
      await configApi.saveConfig({ [`features.${key}`]: { value: String(value), category: 'feature' } });
      flashSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const handleSaveServer = async () => {
    setSaving(true);
    setError('');
    try {
      const input: Record<string, { value: string; category: 'rpc' | 'vault' | 'strategy' }> = {};
      for (const f of allFields) {
        const v = values[f.key]?.trim();
        if (v) input[f.key] = { value: v, category: f.category };
      }
      if (Object.keys(input).length > 0) {
        await configApi.saveConfig(input);
        flashSaved();
        return;
      }
      setError('No values to save');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLocal = () => {
    localStorage.setItem('p31-monetization-config', JSON.stringify(config));
    flashSaved();
  };

  const handleReset = () => {
    const fresh = loadConfig();
    setConfig(fresh);
    setValues({});
    localStorage.removeItem('p31-monetization-config');
    setSaved(false);
  };

  const handleAdminToken = () => {
    setAdminToken(adminTokenInput || null);
    setAdminTokenInput('');
    flashSaved();
  };

  return (
    <div className="surface-page">
      <header className="surface-head">
        <div>
          <h2 className="surface-title">Settings</h2>
          <p className="surface-sub">RPC, vaults, strategies, features, secrets, workers.</p>
        </div>
      </header>

      {serverStatus === 'error' && (
        <StatusBanner>Config gateway unreachable — saving to local storage only.</StatusBanner>
      )}
      {error && <StatusBanner kind="error">{error}</StatusBanner>}

      <div className="surface-card" style={{ padding: 'var(--p31-space-5)' }}>
        <div className="settings-tabs" role="tablist" aria-label="Settings sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              className={`settings-tab ${activeTab === t.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="settings-pane">
          {activeTab === 'rpc' && (
            <div className="surface-card__body">
              {RPC_FIELDS.map((f) => (
                <ConfigField
                  key={f.key}
                  key_={f.key}
                  label={f.label}
                  placeholder={f.placeholder}
                  hint={f.hint}
                  category={f.category}
                  value={values[f.key] ?? ''}
                  onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
                />
              ))}
            </div>
          )}

          {activeTab === 'vaults' && (
            <div className="surface-card__body">
              {VAULT_FIELDS.map((f) => (
                <ConfigField
                  key={f.key}
                  key_={f.key}
                  label={f.label}
                  hint={f.hint}
                  category={f.category}
                  value={values[f.key] ?? ''}
                  onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
                />
              ))}
            </div>
          )}

          {activeTab === 'strategies' && (
            <div className="surface-card__body">
              {STRATEGY_FIELDS.map((f) => (
                <ConfigField
                  key={f.key}
                  key_={f.key}
                  label={f.label}
                  hint={f.hint}
                  category={f.category}
                  value={values[f.key] ?? ''}
                  onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
                />
              ))}
            </div>
          )}

          {activeTab === 'features' && (
            <div className="surface-card__body">
              {(Object.keys(config.features) as FeatureKey[]).map((key) => (
                <div key={key} className="row-card" style={{ marginBottom: 'var(--p31-space-3)' }}>
                  <div className="row-card__head">
                    <span className="row-card__title">{key}</span>
                    <button
                      type="button"
                      className={`btn btn-glass ${config.features[key] ? 'badge-spark' : ''}`}
                      style={{ minWidth: 96 }}
                      aria-pressed={config.features[key]}
                      onClick={() => persistFeature(key, !config.features[key])}
                    >
                      {config.features[key] ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className="row-card__meta">{featureLabel[key]}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'secrets' && (
            <div className="surface-card__body">
              <div className="row-card" style={{ marginBottom: 'var(--p31-space-4)' }}>
                <div className="row-card__head">
                  <span className="row-card__title">Private Keys & API Keys</span>
                  <span className="badge badge-workshop">NEVER DISPLAYED</span>
                </div>
                <div className="row-card__meta">
                  Secrets are never exposed in the UI. Manage them via <code className="mono">wrangler secret put</code>.
                </div>
              </div>
              <div className="field" style={{ marginBottom: 'var(--p31-space-4)' }}>
                <label htmlFor="cfg-admin-token">Admin Token</label>
                <div style={{ display: 'flex', gap: 'var(--p31-space-2)' }}>
                  <input
                    id="cfg-admin-token"
                    type="password"
                    value={adminTokenInput}
                    placeholder="Enter admin token…"
                    onChange={(e) => setAdminTokenInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-primary" type="button" onClick={handleAdminToken}>Set</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workers' && (
            <div className="surface-card__body">
              {(Object.keys(config.workers) as Array<keyof P31Config['workers']>).map((key) => (
                <div className="field" key={key} style={{ marginBottom: 'var(--p31-space-3)' }}>
                  <label htmlFor={`cfg-w-${key}`}>{key}</label>
                  <input
                    id={`cfg-w-${key}`}
                    type="text"
                    className="mono"
                    value={config.workers[key]}
                    onChange={(e) => setConfig((prev) => ({ ...prev, workers: { ...prev.workers, [key]: e.target.value } }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-actions" style={{ marginTop: 'var(--p31-space-5)' }}>
          {activeTab !== 'features' && (
            <button className="btn btn-primary" type="button" onClick={handleSaveServer} disabled={saving}>
              {saving ? 'Saving…' : 'Save to Gateway'}
            </button>
          )}
          <button className="btn btn-glass" type="button" onClick={handleSaveLocal}>Save Locally</button>
          <button className="btn btn-glass" type="button" onClick={handleReset}>Reset</button>
          {saved && <span className="integrity-badge">Saved!</span>}
        </div>
      </div>
    </div>
  );
}