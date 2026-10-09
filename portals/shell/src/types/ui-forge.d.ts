declare module '@p31ca/ui-forge/src/center.mjs' {
  export function forge(spec: unknown, options?: {
    k?: number;
    catalog?: unknown;
    providerOpts?: unknown;
    provider?: unknown;
    emit?: (event: unknown) => void | Promise<void>;
    reviews?: unknown[];
  }): Promise<unknown>;
}

declare module '@p31ca/ui-forge/src/gate.mjs' {
  export const AXES: string[];
  export function runGate(reviews: unknown[], options?: unknown): { status: string; state?: Record<string, number>; collapsedAxes?: string[] };
}

declare module '@p31ca/ui-forge/src/provider-workers-ai-binding.mjs' {
  export function makeBindingProvider(
    env: { AI?: Ai },
    hooks?: { onUsage?: (usage: Record<string, number> | null, model: string) => void },
  ): (prompt: string, opts?: Record<string, unknown>) => Promise<string>;
  export default makeBindingProvider;
}