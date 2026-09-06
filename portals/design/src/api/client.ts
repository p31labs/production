// P31 Capital Machine — API Client
// Auto-configured from P31Config; talks to all 5 monetization workers.

import { loadConfig } from './config';

const config = loadConfig();

export const api = {
  // Revenue Ledger
  async getRevenueSummary() {
    const res = await fetch(`${config.capitalMachine.revenueLedgerUrl}/summary`);
    if (!res.ok) throw new Error('Revenue summary failed');
    return res.json();
  },

  // Entitlement Service
  async checkEntitlement(did: string, amount: string, loves?: boolean) {
    const res = await fetch(`${config.capitalMachine.entitlementUrl}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ did, amount, loves }),
    });
    if (!res.ok) throw new Error('Entitlement check failed');
    return res.json();
  },

  // Auto-Compounder
  async getPositions() {
    const res = await fetch(`${config.capitalMachine.autoCompounderUrl}/positions`);
    if (!res.ok) throw new Error('Failed to fetch positions');
    return res.json();
  },

  // MEV Arbitrage
  async getOpportunities(chain?: string) {
    const url = chain
      ? `${config.capitalMachine.mevArbitrageUrl}/opportunities?chain=${chain}`
      : `${config.capitalMachine.mevArbitrageUrl}/opportunities`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('MEV scan failed');
    return res.json();
  },

  // Yield Vault (LOVE token)
  async getLoveHarvest() {
    const res = await fetch(`${config.capitalMachine.yieldVaultUrl}/stats`);
    if (!res.ok) throw new Error('Yield vault stats failed');
    return res.json();
  },

  // Capital Allocator
  async getAllocatorStatus(target?: string) {
    const url = target ? `${config.capitalMachine.allocatorUrl}/allocation/status?target=${target}` : `${config.capitalMachine.allocatorUrl}/health`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Allocator status failed');
    return res.json();
  },
};
