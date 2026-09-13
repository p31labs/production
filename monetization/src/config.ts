export interface P31Config {
  workers: {
    revenueLedger: string;
    entitlement: string;
    allocator: string;
    yieldVault: string;
    mevArbitrage: string;
    autoCompounder: string;
    btcpayGateway: string;
  };
  features: {
    x402: boolean;
    mev: boolean;
    crossChain: boolean;
    love: boolean;
    autoCompound: boolean;
    btc: boolean;
  };
  theme: {
    primary: string;
    ambient: boolean;
    spoonDial: boolean;
  };
}

export const defaultConfig: P31Config = {
  workers: {
    revenueLedger: 'https://revenue-ledger.trimtab-signal.workers.dev',
    entitlement: 'https://entitlement.trimtab-signal.workers.dev',
    allocator: 'https://capital-allocator.trimtab-signal.workers.dev',
    yieldVault: 'https://yield-vault.trimtab-signal.workers.dev',
    mevArbitrage: 'https://mev-arbitrage.trimtab-signal.workers.dev',
    autoCompounder: 'https://p31-auto-compounder.trimtab-signal.workers.dev',
    btcpayGateway: 'https://btcpay-gateway.trimtab-signal.workers.dev',
  },
  features: {
    x402: true,
    mev: true,
    crossChain: true,
    love: true,
    autoCompound: true,
    btc: true,
  },
  theme: {
    primary: 'quantum-cyan',
    ambient: true,
    spoonDial: true,
  },
};

export function loadConfig(): P31Config {
  return {
    workers: {
      revenueLedger: import.meta.env.VITE_REVENUE_LEDGER_URL || defaultConfig.workers.revenueLedger,
      entitlement: import.meta.env.VITE_ENTITLEMENT_URL || defaultConfig.workers.entitlement,
      allocator: import.meta.env.VITE_ALLOCATOR_URL || defaultConfig.workers.allocator,
      yieldVault: import.meta.env.VITE_YIELD_VAULT_URL || defaultConfig.workers.yieldVault,
      mevArbitrage: import.meta.env.VITE_MEV_ARBITRAGE_URL || defaultConfig.workers.mevArbitrage,
      autoCompounder: import.meta.env.VITE_AUTO_COMPOUNDER_URL || defaultConfig.workers.autoCompounder,
      btcpayGateway: import.meta.env.VITE_BTCPAY_URL || defaultConfig.workers.btcpayGateway,
    },
    features: {
      x402: import.meta.env.VITE_FEATURE_X402 === 'true',
      mev: import.meta.env.VITE_FEATURE_MEV === 'true',
      crossChain: import.meta.env.VITE_FEATURE_CROSS_CHAIN === 'true',
      love: import.meta.env.VITE_FEATURE_LOVE_TOKEN === 'true',
      autoCompound: import.meta.env.VITE_FEATURE_AUTO_COMPOUND === 'true',
      btc: import.meta.env.VITE_FEATURE_BTC === 'true',
    },
    theme: {
      primary: import.meta.env.VITE_PRIMARY_THEME || defaultConfig.theme.primary,
      ambient: import.meta.env.VITE_SHOW_AMBIENT !== 'false',
      spoonDial: import.meta.env.VITE_SHOW_SPOON_DIAL !== 'false',
    },
  };
}
