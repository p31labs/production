/** Hierarchical query keys — one key per server-state domain (TanStack Query v5). */
export const queryKeys = {
  revenue: {
    summary: (range: string) => ['revenue', 'summary', range] as const,
    ledger: (limit: number) => ['revenue', 'ledger', limit] as const,
    verify: (hash?: string) => ['revenue', 'verify', hash ?? 'head'] as const,
  },
  allocator: {
    health: () => ['allocator', 'health'] as const,
  },
  positions: {
    list: () => ['positions', 'list'] as const,
  },
  opportunities: {
    list: (chain?: string) => ['opportunities', chain ?? 'all'] as const,
  },
  love: {
    stats: () => ['love', 'stats'] as const,
  },
  usage: {
    stats: (range: number) => ['usage', range] as const,
  },
  donations: {
    list: () => ['donations', 'list'] as const,
  },
  btcpay: {
    invoices: () => ['btcpay', 'invoices'] as const,
    stores: () => ['btcpay', 'stores'] as const,
  },
  sbt: {
    list: (did: string) => ['sbt', 'list', did] as const,
  },
  dora: {
    metrics: () => ['dora', 'metrics'] as const,
  },
  config: {
    list: () => ['config', 'list'] as const,
    flags: () => ['config', 'flags'] as const,
  },
  ops: {
    invariants: () => ['ops', 'invariants'] as const,
    mcpPricing: () => ['ops', 'mcpPricing'] as const,
  },
  billing: {
    check: (did: string, amount: string) => ['billing', 'check', did, amount] as const,
  },
} as const;