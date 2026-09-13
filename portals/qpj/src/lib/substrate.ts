const DEFAULT_CPU_MS = 5000;
const DEFAULT_SUB_REQUESTS = 50;

export interface SubstrateConfig {
  enabled: boolean;
  dispatchUrl: string;
  cpuMs: number;
  subRequests: number;
}

export interface SubstrateGoalResult {
  ok: boolean;
  deferred: boolean;
  statusUrl?: string;
  error?: string;
  result?: unknown;
  verificationPassed?: boolean;
  auditIssues?: string[];
}

export interface SubstrateStatusResult {
  ok: boolean;
  result?: unknown;
  error?: string;
}

// Internal: allows tests to override getSubstrateUrl return value.
// import.meta.env is frozen at module load time in vitest, so runtime
// env mutation cannot simulate edge mode. This override enables tests
// to exercise edge-mode code paths without changing the environment.
let _getSubstrateUrlOverride: (() => string | null) | null = null;

export function _setGetSubstrateUrlOverride(fn: (() => string | null) | null): void {
  _getSubstrateUrlOverride = fn;
}

export function getSubstrateUrl(): string | null {
  if (_getSubstrateUrlOverride) {
    return _getSubstrateUrlOverride();
  }
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  return env.VITE_P31_SUBSTRATE_URL ?? null;
}

export function isEdgeMode(): boolean {
  return getSubstrateUrl() !== null;
}

// Internal: allows tests to override edge mode detection.
// import.meta.env is frozen at module load time in vitest, so runtime
// env mutation cannot simulate edge mode. This override enables tests
// to exercise edge-mode code paths without changing the environment.
let _isEdgeMode: () => boolean = isEdgeMode;

export function _setEdgeModeOverride(fn: () => boolean): void {
  _isEdgeMode = fn;
}

const DISPATCH_URL = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_DISPATCH_URL
  ?? 'https://qpj-dispatch.p31ca.org';

export function getSubstrateConfig(): SubstrateConfig {
  return {
    enabled: isEdgeMode(),
    dispatchUrl: getSubstrateUrl() ?? 'https://qpj-dispatch.p31ca.org',
    cpuMs: DEFAULT_CPU_MS,
    subRequests: DEFAULT_SUB_REQUESTS,
  };
}

export async function submitGoal(
  passportId: string,
  goal: string,
  opts: {
    mode?: string;
    autonomy?: string;
    sessionId?: string;
    cpuMs?: number;
    subRequests?: number;
  } = {},
): Promise<SubstrateGoalResult> {
  if (!_isEdgeMode()) {
    return { ok: false, deferred: false, error: 'substrate disabled — set VITE_P31_SUBSTRATE_URL' };
  }

  if (opts.cpuMs && opts.cpuMs > DEFAULT_CPU_MS) {
    return { ok: false, deferred: false, error: `cpuMs ${opts.cpuMs} exceeds limit ${DEFAULT_CPU_MS}` };
  }

  if (opts.subRequests && opts.subRequests > DEFAULT_SUB_REQUESTS) {
    return { ok: false, deferred: false, error: `subRequests ${opts.subRequests} exceeds limit ${DEFAULT_SUB_REQUESTS}` };
  }

  try {
    const response = await fetch(`${DISPATCH_URL}/api/goal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'goal',
        passportId,
        goal,
        mode: opts.mode,
        autonomy: opts.autonomy,
        sessionId: opts.sessionId,
        payload: {
          cpuMs: opts.cpuMs ?? DEFAULT_CPU_MS,
          subRequests: opts.subRequests ?? DEFAULT_SUB_REQUESTS,
        },
      }),
    });

    const data = (await response.json()) as SubstrateGoalResult & { ok: boolean };
    return {
      ok: data.ok,
      deferred: data.deferred ?? false,
      statusUrl: data.statusUrl,
      error: data.error,
      result: data.result,
      verificationPassed: data.verificationPassed,
      auditIssues: data.auditIssues,
    };
  } catch (e) {
    return { ok: false, deferred: false, error: String((e as Error)?.message ?? 'submitGoal failed') };
  }
}

export async function checkStatus(
  passportId: string,
  statusUrl: string,
): Promise<SubstrateStatusResult> {
  try {
    const response = await fetch(`${DISPATCH_URL}${statusUrl}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = (await response.json()) as SubstrateStatusResult & { ok: boolean };
    return {
      ok: data.ok,
      result: data.result,
      error: data.error,
    };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? 'checkStatus failed') };
  }
}

export async function verifyPassport(passportId: string): Promise<{ passed: boolean; issues: string[] }> {
  try {
    const response = await fetch(`${DISPATCH_URL}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'verify', passportId }),
    });

    const data = (await response.json()) as { ok: boolean; auditIssues?: string[] };
    return { passed: data.ok, issues: data.auditIssues ?? [] };
  } catch (e) {
    return { passed: false, issues: [(e as Error)?.message ?? 'verification service unreachable'] };
  }
}
