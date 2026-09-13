import { useEffect, useState } from 'react';
import { loadConfig, type P31Config } from '../config';
import { configApi, setAdminToken, type ConfigEntry } from '../api/config';
import GlassCard from '../components/GlassCard';
import ConfigField from '../components/ConfigField';

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

const RPC_FIELDS = [
  { key: 'rpc.eth', label: 'RPC_URL_ETH', placeholder: 'https://eth-mainnet.g.alchemy.com/v2/…', hint: 'Ethereum mainnet' },
  { key: 'rpc.base', label: 'RPC_URL_BASE', placeholder: 'https://base-mainnet.g.alchemy.com/v2/…', hint: 'Base L2' },
  { key: 'rpc.arb', label: 'RPC_URL_ARB', placeholder: 'https://arb-mainnet.g.alchemy.com/v2/…', hint: 'Arbitrum' },
  { key: 'rpc.bera', label: 'RPC_URL_BERA', placeholder: 'https://rpc.berachain.com/…', hint: 'Berachain' },
];

const VAULT_FIELDS = [
  { key: 'vault.aave', label: 'AAVE_POOL_ADDRESS', hint: 'Aave V3 pool' },
  { key: 'vault.compound', label: 'COMPOUND_COMPTROLLER', hint: 'Compound comptroller' },
  { key: 'vault.morpho', label: 'MORPHO_VAULT_ADDRESS', hint: 'Morpho Blue' },
  { key: 'vault.bend_honey', label: 'BEND_HONEY_VAULT_ADDRESS', hint: 'Bend / Berachain HONEY vault' },
];

const STRATEGY_FIELDS = [
  { key: 'strategy.midas', label: 'MIDAS_VAULT_ADDRESS', hint: 'mF-ONE RWA (~16.6% APY)' },
  { key: 'strategy.opentrade', label: 'OPENTRADE_POOL_ADDRESS', hint: 'XDFIS RWA (~13% APY)' },
  { key: 'strategy.euler', label: 'EULER_VAULT_ADDRESS', hint: 'Euler RWA USDC (~10% APY)' },
  { key: 'strategy.ethena', label: 'ETHENA_VAULT_ADDRESS', hint: 'Ethena sUSDe (6% + cashback)' },
  { key: 'strategy.benpay', label: 'BENPAY_VAULT_ADDRESS', hint: 'BenPay DeFi Earn (~13.8%)' },
  { key: 'strategy.moonwell', label: 'MOONWELL_VAULT_ADDRESS', hint: 'Moonwell lending (~7.5%)' },
  { key: 'strategy.pendle', label: 'PENDLE_VAULT_ADDRESS', hint: 'Pendle fixed-yield (6.8%)' },
  { key: 'strategy.peapods', label: 'PEAPODS_VAULT_ADDRESS', hint: 'Peapods volatility farming' },
];

export default function Settings() {
  const [config, setConfig] = useState<P31Config>(loadConfig());
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('rpc');
  const [loadedConfig, setLoadedConfig] = useState<Record<string, ConfigEntry>>({});
  const [adminTokenInput, setAdminTokenInput] = useState('');
  const [serverStatus, setServerStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    configApi.getConfig()
      .then(({ config: entries }) => {
        const map: Record<string, ConfigEntry> = {};
        for (const e of entries) map[e.key] = e;
        setLoadedConfig(map);
        setServerStatus('ok');
      })
      .catch((e) => {
        console.warn('Config gateway unreachable', e);
        setServerStatus('error');
      });
  }, []);

  const updateFeature = (key: FeatureKey, value: boolean) => {
    setConfig((prev) => ({
      ...prev,
      features: { ...prev.features, [key]: value },
    }));
  };

  const persistFeature = async (key: FeatureKey, value: boolean) => {
    updateFeature(key, value);
    try {
      await configApi.saveConfig({ [`features.${key}`]: { value: String(value), category: 'feature' } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const handleSaveLocal = () => {
    localStorage.setItem('p31-monetization-config', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveServer = async () => {
    setSaving(true);
    setError('');
    try {
      const input: Record<string, { value: string; category: 'rpc' | 'vault' | 'strategy' }> = {};
      for (const f of RPC_FIELDS) {
        const v = document.querySelector<HTMLInputElement>(`input[data-field="${f.label}"]`)?.value;
        if (v) input[f.key] = { value: v, category: 'rpc' };
      }
      for (const f of VAULT_FIELDS) {
        const v = document.querySelector<HTMLInputElement>(`input[data-field="${f.label}"]`)?.value;
        if (v) input[f.key] = { value: v, category: 'vault' };
      }
      for (const f of STRATEGY_FIELDS) {
        const v = document.querySelector<HTMLInputElement>(`input[data-field="${f.label}"]`)?.value;
        if (v) input[f.key] = { value: v, category: 'strategy' };
      }
      if (Object.keys(input).length > 0) {
        await configApi.saveConfig(input);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        return;
      }
      setError('No values to save');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const fresh = loadConfig();
    setConfig(fresh);
    localStorage.removeItem('p31-monetization-config');
    setSaved(false);
  };

  const handleAdminToken = () => {
    setAdminToken(adminTokenInput || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const featureLabel: Record<FeatureKey, string> = {
    x402: 'x402 payment protocol revenue tracking',
    mev: 'MEV arbitrage opportunity scanner',
    crossChain: 'Cross-chain bridge monitoring',
    love: 'LOVE token harvest and gating',
    autoCompound: 'Auto-compounder positions and yield',
    btc: 'BTC payments via BTCPay',
  };

  return (
    <div className="page-settings">
      {serverStatus === 'error' && (
        <GlassCard className="settings-section alert-section">
          <div className="alert-banner">
            <span className="status-badge status-badge-down">Offline</span>
            <span>Config gateway unreachable — saving to local storage only.</span>
          </div>
        </GlassCard>
      )}

      <GlassCard className="settings-section">
        <div className="settings-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`settings-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="settings-tab-content">
          {activeTab === 'rpc' && (
            <div className="config-fields">
              {RPC_FIELDS.map((f) => (
                <ConfigField
                  key={f.key}
                  label={f.label}
                  placeholder={f.placeholder}
                  hint={f.hint}
                  category="rpc"
                  defaultValue={loadedConfig[f.key]?.value || ''}
                />
              ))}
            </div>
          )}

          {activeTab === 'vaults' && (
            <div className="config-fields">
              {VAULT_FIELDS.map((f) => (
                <ConfigField
                  key={f.key}
                  label={f.label}
                  hint={f.hint}
                  category="vault"
                  defaultValue={loadedConfig[f.key]?.value || ''}
                />
              ))}
            </div>
          )}

          {activeTab === 'strategies' && (
            <div className="config-fields">
              {STRATEGY_FIELDS.map((f) => (
                <ConfigField
                  key={f.key}
                  label={f.label}
                  hint={f.hint}
                  category="strategy"
                  defaultValue={loadedConfig[f.key]?.value || ''}
                />
              ))}
            </div>
          )}

          {activeTab === 'features' && (
            <div className="settings-list">
              {(Object.keys(config.features) as FeatureKey[]).map((key) => (
                <div key={key} className="setting-row">
                  <div className="setting-info">
                    <span className="setting-label">{key}</span>
                    <span className="setting-description">{featureLabel[key]}</span>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={config.features[key]}
                      onChange={(e) => persistFeature(key, e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'secrets' && (
            <div className="settings-list">
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-label">Private Keys & API Keys</span>
                  <span className="setting-description">
                    Secrets are never exposed in the UI for security. Manage them via{' '}
                    <code>wrangler secret put</code> in Cloudflare.
                  </span>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-label">Admin Token</span>
                  <span className="setting-description">
                    Used to authenticate config changes against the gateway.
                  </span>
                </div>
                <input
                  type="password"
                  className="setting-input"
                  value={adminTokenInput}
                  placeholder="Enter admin token…"
                  onChange={(e) => setAdminTokenInput(e.target.value)}
                />
                <button className="btn btn-secondary" onClick={handleAdminToken}>
                  Set
                </button>
              </div>
            </div>
          )}

          {activeTab === 'workers' && (
            <div className="settings-list">
              {(Object.keys(config.workers) as Array<keyof typeof config.workers>).map((key) => (
                <div key={key} className="setting-row">
                  <div className="setting-info">
                    <span className="setting-label">{key}</span>
                    <span className="setting-description">Worker endpoint URL</span>
                  </div>
                  <input
                    type="text"
                    className="setting-input"
                    value={config.workers[key]}
                    onChange={(e) => setConfig((prev) => ({
                      ...prev,
                      workers: { ...prev.workers, [key]: e.target.value },
                    }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      <div className="settings-actions">
        {activeTab !== 'features' && (
          <button className="btn btn-primary" onClick={handleSaveServer} disabled={saving}>
            {saving ? 'Saving…' : 'Save to Gateway'}
          </button>
        )}
        <button className="btn btn-secondary" onClick={handleSaveLocal}>
          Save Locally
        </button>
        <button className="btn btn-secondary" onClick={handleReset}>
          Reset
        </button>
      </div>

      {saved && <div className="settings-saved-toast">Saved!</div>}
      {error && <div className="settings-error-toast">{error}</div>}
    </div>
  );
}
