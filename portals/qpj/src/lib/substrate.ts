import { resolveWsBaseUrl } from './substrate-ws-url';

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

export interface SubstrateBuildResult {
  ok: boolean;
  buildId: string;
  artifactKey?: string;
  error?: string;
  statusUrl?: string;
}

export function getSubstrateUrl(): string | null {
  return import.meta.env?.VITE_P31_SUBSTRATE_URL ?? null;
}

export function isEdgeMode(): boolean {
  return getSubstrateUrl() !== null;
}

export function getSubstrateWsBaseUrl(): string | null {
  return resolveWsBaseUrl(
    import.meta.env?.VITE_P31_SUBSTRATE_URL ?? null,
    import.meta.env?.VITE_P31_WS_BASE ?? null,
  );
}

const DISPATCH_URL = import.meta.env?.VITE_DISPATCH_URL
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
  if (!isEdgeMode()) {
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

export async function executeBuild(
  passportId: string,
  buildId: string,
  code: string,
  filename: string,
): Promise<SubstrateBuildResult> {
  if (!isEdgeMode()) {
    return { ok: false, buildId, error: 'substrate disabled — set VITE_P31_SUBSTRATE_URL' };
  }

  try {
    const response = await fetch(`${DISPATCH_URL}/api/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'build', passportId, buildId, code, filename }),
    });

    const data = (await response.json()) as SubstrateBuildResult & { ok: boolean };
    return {
      ok: data.ok,
      buildId: data.buildId ?? buildId,
      artifactKey: data.artifactKey,
      error: data.error,
      statusUrl: `/api/build?passportId=${passportId}&buildId=${buildId}`,
    };
  } catch (e) {
    return { ok: false, buildId, error: String((e as Error)?.message ?? 'executeBuild failed') };
  }
}

export function getArtifactUrl(passportId: string, buildId: string, filename: string): string | null {
  if (!isEdgeMode()) return null;
  const enc = encodeURIComponent;
  return `${DISPATCH_URL}/api/artifacts/${enc(passportId)}/${enc(buildId)}/${enc(filename)}`;
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
