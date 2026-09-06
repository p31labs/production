// P31 Capital Machine — Unified Configuration
// Shared between shell and portal; values overridden by Vite env vars

export interface P31Config {
  capitalMachine: {
    revenueLedgerUrl: string;
    entitlementUrl: string;
    allocatorUrl: string;
    yieldVaultUrl: string;
    mevArbitrageUrl: string;
    autoCompounderUrl: string;
  };
  features: {
    x402Gateway: boolean;
    mevArbitrage: boolean;
    crossChainArbitrage: boolean;
    loveTokenGating: boolean;
    autoCompounder: boolean;
  };
  theme: {
    primary: 'quantum-cyan' | 'quantum-violet' | 'quantum-gold' | 'quantum-green' | 'quantum-iris';
    showAmbient: boolean;
    showSpoonDial: boolean;
  };
}

// Default config used when env vars are absent
export const defaultConfig: P31Config = {
  capitalMachine: {
    revenueLedgerUrl: 'https://revenue-ledger.trimtab-signal.workers.dev',
    entitlementUrl: 'https://entitlement.trimtab-signal.workers.dev',
    allocatorUrl: 'https://capital-allocator.trimtab-signal.workers.dev',
    yieldVaultUrl: 'https://yield-vault.trimtab-signal.workers.dev',
    mevArbitrageUrl: 'https://mev-arbitrage.trimtab-signal.workers.dev',
    autoCompounderUrl: 'https://p31-auto-compounder.trimtab-signal.workers.dev',
  },
  features: {
    x402Gateway: true,
    mevArbitrage: true,
    crossChainArbitrage: true,
    loveTokenGating: true,
    autoCompounder: true,
  },
  theme: {
    primary: 'quantum-cyan',
    showAmbient: true,
    showSpoonDial: true,
  },
};

// Load config from Vite env + defaults
export function loadConfig(): P31Config {
  return {
    capitalMachine: {
      revenueLedgerUrl: import.meta.env.VITE_REVENUE_LEDGER_URL || defaultConfig.capitalMachine.revenueLedgerUrl,
      entitlementUrl: import.meta.env.VITE_ENTITLEMENT_URL || defaultConfig.capitalMachine.entitlementUrl,
      allocatorUrl: import.meta.env.VITE_ALLOCATOR_URL || defaultConfig.capitalMachine.allocatorUrl,
      yieldVaultUrl: import.meta.env.VITE_YIELD_VAULT_URL || defaultConfig.capitalMachine.yieldVaultUrl,
      mevArbitrageUrl: import.meta.env.VITE_MEV_ARBITRAGE_URL || defaultConfig.capitalMachine.mevArbitrageUrl,
      autoCompounderUrl: import.meta.env.VITE_AUTO_COMPOUNDER_URL || defaultConfig.capitalMachine.autoCompounderUrl,
    },
    features: {
      x402Gateway: import.meta.env.VITE_FEATURE_X402 === 'true',
      mevArbitrage: import.meta.env.VITE_FEATURE_MEV === 'true',
      crossChainArbitrage: import.meta.env.VITE_FEATURE_CROSS_CHAIN === 'true',
      loveTokenGating: import.meta.env.VITE_FEATURE_LOVE_TOKEN === 'true',
      autoCompounder: import.meta.env.VITE_FEATURE_AUTO_COMPOUND === 'true',
    },
    theme: {
      primary: import.meta.env.VITE_PRIMARY_THEME as any || defaultConfig.theme.primary,
      showAmbient: import.meta.env.VITE_SHOW_AMBIENT !== 'false',
      showSpoonDial: import.meta.env.VITE_SHOW_SPOON_DIAL !== 'false',
    },
  };
}
