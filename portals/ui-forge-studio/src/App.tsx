import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lumi } from './components/Lumi';
import { TreeRenderer } from './renderer/TreeRenderer';
import StageTrace from './components/StageTrace';
import type { TreeNode } from './renderer/registry';
import type { ForgeEvent } from './lib/events';
import { buildDocHtml } from './lib/exportDoc';
import { useStudio, setStudio, resetStudio, type DesignBrief } from './lib/studioStore';
import { downloadBrief } from './lib/exportBrief';
import { pendingQuestions, shouldClarify, type ClarifyQuestion } from './lib/clarify';
import { PLANS, PLAN_ORDER, cacheTier, isProPlus } from './lib/tiers';
import type { PlanId } from './lib/tiers';
import { ensureIdentity, shortDid } from './lib/identity';
import { fetchSession, signInWithPasskey, signOut, studioDid, type SessionState } from './lib/auth';

const GATE_TONE: Record<string, string> = {
  pass: 'pass',
  incomplete: 'incomplete',
  'needs-revision': 'needs-revision',
  'needs-review': 'needs-review',
};

/** What /api/billing/tiers returns (Wave 3 — the tier pill + plans panel). */
interface TierInfo {
  plans: typeof PLANS;
  did: string | null;
  tier: PlanId;
  remaining: string | null;
  limit: number | null;
  used: number | null;
  role: 'viewer' | 'operator' | 'admin' | null;
}

interface ForgeResult {
  artifact: TreeNode | null;
  gate: { status: string; collapsedAxes?: string[]; degradedAxes?: string[]; issues?: string[] } | null;
  nextGate: Array<{ axis: string; action: string; severity: string }>;
  logs: { groundedFacts: number; gaps: number; candidates: number; admissible: number; survivors: number };
  gateSource?: 'vision' | 'artifact';
}

/** The named fix for each SIC-POVM axis — mirrors the engine's NEXT_GATE_ACTIONS
 *  (center.mjs) so the studio renders the same actionable text the engine names. */
const AXIS_ACTIONS: Record<string, { action: string; severity: string }> = {
  'layout-parity': { action: 'rebalance the rail proportion; promote the primary action; re-group threads', severity: 'major' },
  'sensory-safety': { action: 'reduce ambient opacity below 0.35; raise text contrast over the starfield; enable reduced-motion', severity: 'critical' },
  'identity-surface': { action: 'restore user-chip legibility; raise DID to tertiary contrast; fix the pre-mint state', severity: 'critical' },
  'motion-interaction': { action: 'add focus rings; define pressed states; signal composer loading/stop', severity: 'major' },
};

/** Map the verdict's collapsed axes (axes below the gate floor) to the named
 *  next-gate actions the engine would produce — so "make the brief clearer"
 *  becomes "here is exactly what to fix". */
function nameNextGateActions(status: string, axes: Record<string, number>): Array<{ axis: string; action: string; severity: string }> {
  if (status === 'pass') return [];
  if (status === 'incomplete' || status === 'needs-review' || status === 'needs-revision') {
    const collapsed = Object.entries(axes)
      .filter(([, v]) => v < 0.4)
      .map(([axis]) => axis);
    return (collapsed.length > 0 ? collapsed : Object.keys(axes))
      .map((axis) => AXIS_ACTIONS[axis] ?? { action: 'revisit this axis', severity: 'major' })
      .map((a, i) => ({ axis: (collapsed.length > 0 ? collapsed : Object.keys(axes))[i], ...a }));
  }
  return [];
}

/** Pull the pipeline's real counts from the emitted agent.done events (the
 *  engine rides facts/gaps/candidates/admissible/survivors along on the done
 *  frame), so the exported doc and the report carry the truth, not zeros. */
function extractLogs(events: ForgeEvent[]): { groundedFacts: number; gaps: number; candidates: number; admissible: number; survivors: number } {
  const pick = (agent: string, key: string): number => {
    const done = [...events].reverse().find((e) => e.type === 'agent.done' && e.agent === agent);
    const v = (done as { [k: string]: unknown } | undefined)?.[key];
    return typeof v === 'number' ? v : 0;
  };
  return {
    groundedFacts: pick('grounder', 'facts'),
    gaps: pick('grounder', 'gaps'),
    candidates: pick('dreamer', 'candidates'),
    admissible: pick('governor', 'admissible'),
    survivors: pick('governor', 'survivors'),
  };
}

/**
 * UI Forge — the family-side studio. Five chapters, one thing on each screen.
 *
 *   Ch0 Front Door  — Lumi + one sentence + Start (or Continue + memory when prior work).
 *   Ch1 Your Idea   — one textarea + "Write my brief".
 *   Ch2 Your Brief  — the living description + the clarifying gate (confidence-aware).
 *   Ch3 Your Schema — the report + a live StageTrace streaming the agents' work
 *                     over SSE from `/api/forge/stream`. Collapses when done.
 *   Ch4 Your Surface — the rendered artifact + a celebration beat when the gate passes.
 *
 * Chapter position is derived from `store.activeStage`. `started` gates only the
 * front door so every load greets warm first.
 *
 * Every interactive element carries the data-agent-* attributes the Loom uses.
 */
type Screen = 'welcome' | 'idea' | 'brief' | 'schema' | 'surface';

const CHAPTER_STEPS: Record<Screen, { n: number; label: string }> = {
  welcome: { n: 1, label: 'The front door' },
  idea: { n: 2, label: 'Your idea' },
  brief: { n: 3, label: 'Your brief' },
  schema: { n: 4, label: 'Your schema' },
  surface: { n: 5, label: 'Your surface' },
};

const CHAPTER_GUIDANCE: Partial<Record<Screen, string>> = {
  idea: 'We\u2019ll turn this into a brief you can refine. The Forge reads what you say, not what you meant.',
  brief: 'Refine the details — add entities (what it shows), actions (what you can do), or the goal. Then we compile the schema.',
  schema: 'Four agents are running: Grounder reads the brief, Dreamer writes candidate layouts, Governor cuts the ones that don\u2019t bind, Shaper applies the canon.',
  surface: 'Take it with you, or start again. Nothing is saved until you download it.',
};

const MIN_TEXTAREA_LAYOUT = 640;

export default function App() {
  const store = useStudio();
  const r = store.forgeResult as ForgeResult | null;

  const [started, setStarted] = useState(false);
  const stage = started ? store.activeStage : 1;
  const screen: Screen =
    stage === 1 ? 'welcome'
    : stage === 2 ? 'idea'
    : stage === 3 ? 'brief'
    : stage === 4 ? 'schema'
    : 'surface';

  const hasPriorWork = !!store.brief || !!store.schema || !!store.forgeResult;
  const resumeStage = r ? 5 : store.schema ? 4 : store.brief ? 3 : 2;
  const step = CHAPTER_STEPS[screen];

  const [nlInput, setNlInput] = useState(store.nlInput);
  const [briefLoading, setBriefLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clarifyAnswered, setClarifyAnswered] = useState<Record<string, boolean>>({});
  const [skipClarify, setSkipClarify] = useState(false);
  const [clarifyInputs, setClarifyInputs] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<'waiting' | 'celebrating' | 'celebrated'>('waiting');

  // The live agent-work stream (Wave 1C/1B wiring). StageTrace renders
  // ForgeEvents as they arrive; the schema chapter opens the SSE stream.
  const [forgeEvents, setForgeEvents] = useState<ForgeEvent[]>([]);
  const [streamActive, setStreamActive] = useState(false);
  const [artifactTier, setArtifactTier] = useState<'dream' | 'catalog-walk' | 'fallback' | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Wave 3 — passkey/DID auth, the tier pill, and run metering ────────
  const [authState, setAuthState] = useState<SessionState>({ authenticated: false });
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [overAllowance, setOverAllowance] = useState(false);
  const [runCompleted, setRunCompleted] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const clarifyQs = pendingQuestions(store.brief);
  const showClarify = screen === 'brief' && clarifyQs.length > 0 && !skipClarify && shouldClarify(store.brief);

  useEffect(() => {
    if (screen === 'idea') ideaRef.current?.focus();
    if (screen !== 'surface') setPhase('waiting');
  }, [screen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Abort the stream when leaving the schema chapter.
  useEffect(() => {
    if (screen !== 'schema') abortRef.current?.abort();
  }, [screen]);

  // Warm up auth + the tier pill once (Wave 3). The browser's Ed25519 did is
  // the metering subject; a passkey session, when present, overrides it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await fetchSession();
        if (cancelled) return;
        setAuthState(session);
        await refreshTier();
      } catch {
        // offline or cold-start — the pill simply won't resolve yet
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshTier = async () => {
    try {
      const did = await studioDid();
      const res = await fetch('/api/billing/tiers', { headers: { 'X-Forge-Did': did } });
      if (!res.ok) return;
      const data = (await res.json()) as TierInfo;
      setTierInfo(data);
      cacheTier(data.did ?? did, data.tier);
    } catch {
      // offline — keep the cached pill
    }
  };

  const handlePasskeyAuth = async () => {
    setAuthBusy(true); setAuthError(null);
    try {
      const { did } = await signInWithPasskey();
      const session = await fetchSession();
      setAuthState({ ...session, did: did ?? session.did });
      await refreshTier();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Passkey sign-in didn\u2019t complete.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setAuthState({ authenticated: false });
    await refreshTier();
  };

  /** Pro+ gate lives here: the entitlement worker enforces quota; the UI
   *  keeps the export behind a warm Pro prompt (never an error wall). */
  const downloadAuditLog = async () => {
    if (!runCompleted) return;
    if (!isProPlus(tierInfo?.tier)) { setUpgradeOpen(true); return; }
    try {
      const res = await fetch('/api/audit/export');
      if (res.status === 401) {
        setAuthError('Sign in with a passkey to download the audit log.');
        setMenuOpen(false);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'The audit log couldn\u2019t be exported.');
        return;
      }
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/x-ndjson' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'ui-forge-audit.jsonl'; a.click(); URL.revokeObjectURL(url);
    } catch {
      setError('The audit log couldn\u2019t be exported right now.');
    }
  };

  const syncNl = (v: string) => { setNlInput(v); setStudio({ nlInput: v }); };

  const generateBrief = async () => {
    if (nlInput.trim().length <= 5) {
      setHint('A few more words will help the Forge understand what you want.');
      return;
    }
    setBriefLoading(true); setError(null); setHint(null);
    try {
      const res = await fetch('/api/brief', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: nlInput.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; brief?: DesignBrief; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (!data.brief) throw new Error('No brief returned');
      setStudio({ brief: data.brief, activeStage: 3 });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBriefLoading(false); }
  };

  const applyRefine = async (instruction: string) => {
    if (!store.brief) return;
    setChatLoading(true); setError(null);
    try {
      const res = await fetch('/api/refine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: store.brief, instruction }),
      });
      const data = (await res.json()) as { ok?: boolean; brief?: DesignBrief; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (!data.brief) throw new Error('No refined brief returned');
      setStudio({
        brief: data.brief,
        refinementHistory: [
          ...store.refinementHistory,
          { role: 'human', text: instruction },
          { role: 'agent', text: `Applied: ${data.brief.goal}` },
        ],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setChatLoading(false); }
  };

  const refineBrief = async () => {
    if (!chatInput.trim()) return;
    const instruction = chatInput;
    setChatInput('');
    await applyRefine(instruction);
  };

  const answerClarify = async (q: ClarifyQuestion) => {
    const answer = (clarifyInputs[q.id] ?? '').trim();
    if (!answer) return;
    setClarifyAnswered((prev) => ({ ...prev, [q.id]: true }));
    setClarifyInputs((prev) => ({ ...prev, [q.id]: '' }));
    await applyRefine(q.refineTemplate(answer));
  };

  /** Parse an SSE response body (ReadableStream) into ForgeEvents. Accumulates
   *  into a LOCAL array and returns it — no stale-closure read of state.
   *  Also returns whether the stream was refused at the gate (over-allowance),
   *  read from the response header AND the terminal event. */
  const runStream = useCallback(async (spec: unknown, signal: AbortSignal): Promise<{ events: ForgeEvent[]; overAllowance: boolean }> => {
    const did = await studioDid();
    const res = await fetch('/api/forge/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forge-Did': did },
      body: JSON.stringify(spec),
      signal,
    });
    if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`);
    const headerDenied = res.headers.get('X-Forge-Entitlement') === 'over-allowance';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const events: ForgeEvent[] = [];
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let sep = buf.indexOf('\n\n');
      while (sep !== -1) {
        const frame = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        const eventLine = frame.split('\n').find((l) => l.startsWith('event:'));
        const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
        if (eventLine && dataLine) {
          try {
            const ev = JSON.parse(dataLine.slice(5)) as ForgeEvent;
            events.push(ev);
          } catch { /* skip malformed frame */ }
        }
        sep = buf.indexOf('\n\n');
      }
    }
    const terminal = events.find((e) => e.type === 'stream.end');
    const terminalDenied = terminal?.type === 'stream.end' && terminal.error === 'over-allowance';
    return { events, overAllowance: headerDenied || terminalDenied };
  }, []);

  const forgeSchema = async () => {
    if (!store.brief) return;
    setLoading(true); setError(null);
    setForgeEvents([]);
    setStreamActive(true);
    const spec = {
      title: store.brief.title,
      entities: store.brief.entities.map((e) => ({ name: e.name, fields: e.fields ?? [] })),
      actions: store.brief.actions.map((a) => ({ name: a.name })),
      k: 4,
    };
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      // The stream endpoint always produces an artifact (never-fail pipeline),
      // UNLESS the run was refused at the entitlement gate — then it emits a
      // single stream.end(error 'over-allowance') and closes. That is a warm
      // upgrade prompt, never an error wall.
      const { events, overAllowance: denied } = await runStream(spec, ctrl.signal);
      setForgeEvents(events);
      const terminal = events.find((e) => e.type === 'stream.end');
      if (terminal?.reason === 'complete') setRunCompleted(true);
      void refreshTier();
      if (denied) {
        setOverAllowance(true);
        setStudio({ activeStage: 4 });
        return;
      }
      const final = [...events].reverse().find((e) => e.type === 'artifact.final');
      if (final && final.tree != null) {
        const tree = final.tree as unknown as TreeNode;
        setArtifactTier(final.tier ?? null);
        // The honest verdict: read the terminal gate.verdict the engine emits.
        // The stream always carries it (the gate now runs deterministically from
        // the artifact when /vision reviews are absent) — never hardcode a lie.
        const verdict = [...events].reverse().find((e) => e.type === 'gate.verdict');
        const status = verdict?.status ?? 'needs-review';
        const axes = verdict?.axes ?? {};
        const source = verdict?.source ?? 'artifact';
        const collapsedAxes = Object.entries(axes).filter(([, v]) => v < 0.4).map(([axis]) => axis);
        const logs = extractLogs(events);
        const payload = {
          artifact: tree,
          gate: { status, collapsedAxes, degradedAxes: [], issues: [] },
          nextGate: nameNextGateActions(status, axes),
          logs,
          gateSource: source,
        } as ForgeResult;
        setStudio({ schema: tree, forgeResult: payload, activeStage: 4 });
        setPhase('waiting');
      } else if (final) {
        // artifact.final with a null tree is the never-fail empty case.
        setArtifactTier(final.tier ?? null);
        setStudio({ schema: null, forgeResult: null, activeStage: 4 });
        setPhase('waiting');
      } else {
        throw new Error('The pipeline finished without an artifact.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStreamActive(false);
      abortRef.current = null;
    }
  };

  const startNew = () => {
    abortRef.current?.abort();
    resetStudio();
    setNlInput('');
    setChatInput('');
    setError(null);
    setHint(null);
    setPhase('waiting');
    setClarifyAnswered({});
    setSkipClarify(false);
    setClarifyInputs({});
    setForgeEvents([]);
    setStreamActive(false);
    setArtifactTier(null);
    setOverAllowance(false);
    setRunCompleted(false);
  };

  // ── Exports (the quiet menu) ────────────────────────────────────────
  const exportBrief = () => { if (store.brief) downloadBrief(store.brief); };
  const exportSchema = () => {
    const schemaJson = store.schema ? JSON.stringify(store.schema, null, 2) : '';
    if (!schemaJson) return;
    const blob = new Blob([schemaJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ui-forge-artifact.json'; a.click(); URL.revokeObjectURL(url);
  };
  const exportDoc = () => {
    if (!store.forgeResult) return;
    const rr = store.forgeResult as ForgeResult;
    const html = buildDocHtml({
      title: store.brief?.title ?? 'Forged surface',
      artifact: rr.artifact,
      gate: rr.gate,
      nextGate: rr.nextGate,
      logs: rr.logs,
    });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ui-forge-doc.html'; a.click(); URL.revokeObjectURL(url);
  };

  const gateStatus = r?.gate?.status ?? null;
  const gateTone = gateStatus ? (GATE_TONE[gateStatus] ?? 'unknown') : null;
  const lumiGreeting = screen === 'surface' && gateTone === 'pass';
  const celebrating = phase === 'celebrating';
  const handlePulseEnd = () => setPhase('celebrated');
  const hasArtifact = !!r?.artifact;

  const memoryLine = hasPriorWork && store.brief
    ? `You were working on ${store.brief.title}.`
    : null;

  // Lumi scales by chapter: 132 welcome, 96 idea, 40 inline.
  const lumiSize = screen === 'welcome' ? 132 : screen === 'idea' ? 96 : 40;

  const guidance = CHAPTER_GUIDANCE[screen];

  // The header pill (Wave 3): "Free · 3/5 runs this month".
  const pillTier = tierInfo ? (PLANS[tierInfo.tier]?.name ?? 'Free') : 'Free';
  const pillText = tierInfo
    ? `${pillTier} · ${tierInfo.remaining ?? '—'}${tierInfo.limit != null ? `/${tierInfo.limit}` : ''} runs this month`
    : `${pillTier} · —/5 runs this month`;

  return (
    <div className="studio" data-theme="family" data-spoons="3">
      {/* Quiet header — appears once inside. Step indicator rides here. */}
      {screen !== 'welcome' && (
        <header className="studio__head">
          <span className="studio__head-mark">
            <span className="studio__head-dot" aria-hidden="true" />
            UI Forge
          </span>
          <div className="studio__head-side">
            <button
              className="studio__tier-pill"
              onClick={() => setUpgradeOpen(true)}
              type="button"
              aria-label="See the Forge plans and your run allowance"
              data-agent-kind="action"
              data-agent-action="forge.plans.open"
              data-agent-danger="none"
              data-agent-confirm="never"
            >
              {pillText}
            </button>
            <span className="studio__head-step">{step.n} of 5 · {step.label}</span>
            <button
              className="studio__menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              data-agent-kind="action"
              data-agent-action="forge.menu.open"
              data-agent-danger="none"
              data-agent-confirm="never"
            >
              ☰
            </button>
          </div>
        </header>
      )}

      {/* Step indicator — dots + text, hidden on the welcome. */}
      {screen !== 'welcome' && (
        <div className="studio__steps" role="progressbar" aria-label="Flow progress" aria-valuenow={step.n} aria-valuemin={1} aria-valuemax={5}>
          <span className="studio__dots" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`studio__dot${n === step.n ? ' active' : n < step.n ? ' done' : ''}`} />
            ))}
          </span>
          <span className="studio__steps-text">{step.label}</span>
        </div>
      )}

      <div className="studio__canvas" ref={canvasRef}>
        <div key={screen} className="studio__chapter" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        {screen === 'welcome' && (
          <div className="forge-welcome">
            <Lumi size={lumiSize} />
            <h1 className="forge-title">Welcome to the Forge</h1>
            <p className="forge-copy">
              You and the Forge are going to build something together.
              Tell us what you have in mind — in your own words.
            </p>
            {memoryLine && <p className="forge-memory" data-agent-kind="status" data-agent-action="forge.memory">{memoryLine}</p>}
            <button
              className="forge-primary"
              onClick={() => { setStarted(true); setStudio({ activeStage: hasPriorWork ? resumeStage : 2, nlInput: store.nlInput }); }}
              type="button"
              data-agent-kind="action"
              data-agent-action={hasPriorWork ? 'forge.resume' : 'forge.start'}
              data-agent-danger="none"
              data-agent-confirm="never"
            >
              {hasPriorWork ? '▶ Continue' : '▶ Start'}
            </button>
            <div className="forge-auth">
              {authState.authenticated ? (
                <span className="forge-auth-state" data-agent-kind="status" data-agent-action="auth.session.active">
                  Signed in as {shortDid(authState.did ?? '')}
                </span>
              ) : (
                <button
                  className="forge-quiet"
                  onClick={handlePasskeyAuth}
                  disabled={authBusy}
                  type="button"
                  data-agent-kind="action"
                  data-agent-action="auth.passkey.signin"
                  data-agent-danger="none"
                  data-agent-confirm="never"
                >
                  {authBusy ? 'Checking your passkey…' : 'Sign in with a passkey'}
                </button>
              )}
              {authError && <p className="forge-hint" role="status">{authError}</p>}
            </div>
          </div>
        )}

        {screen === 'idea' && (
          <div className="forge-canvas">
            <Lumi size={lumiSize} thinking={briefLoading} />
            <h1 className="forge-title">What do you want to build?</h1>
            {guidance && <p className="forge-guidance">{guidance}</p>}
            <textarea
              ref={ideaRef}
              className="forge-textarea"
              value={nlInput}
              onChange={(e) => syncNl(e.target.value)}
              placeholder="I want a calm dashboard for tracking daily spoons — a level meter, a task list, and a log action…"
              spellCheck={false}
              aria-label="Describe your idea"
            />
            <button
              className="forge-primary"
              onClick={generateBrief}
              disabled={briefLoading}
              type="button"
              data-agent-kind="action"
              data-agent-action="forge.brief.generate"
              data-agent-danger="none"
              data-agent-confirm="never"
            >
              {briefLoading ? 'Writing your brief…' : 'Write my brief'}
            </button>
            {hint && <div className="forge-hint" role="status">{hint}</div>}
            <button className="forge-quiet" onClick={startNew} type="button">Start over</button>
            {error && <div className="forge-error" role="alert">{error}</div>}
          </div>
        )}

        {screen === 'brief' && store.brief && (
          <div className="forge-canvas">
            <h1 className="forge-title" style={{ fontSize: '1.5rem' }}>Here's your brief</h1>
            {guidance && <p className="forge-guidance">{guidance}</p>}
            <div className="forge-card">
              <span className="forge-card-label">Your brief</span>
              <h2 className="forge-card-title">{store.brief.title}</h2>
              <p className="forge-card-goal">{store.brief.goal}</p>
              {store.brief.entities.length > 0 && (
                <p className="forge-card-meta"><strong>Entities:</strong> {store.brief.entities.map((e) => e.name).join(' · ')}</p>
              )}
              {store.brief.actions.length > 0 && (
                <p className="forge-card-meta"><strong>Actions:</strong> {store.brief.actions.map((a) => a.name).join(' · ')}</p>
              )}
            </div>

            {store.refinementHistory.length > 0 && (
              <div className="forge-thread">
                <span className="forge-thread-label">Refinement</span>
                {store.refinementHistory.map((t, i) => (
                  <div key={i} className={`forge-thread-turn forge-thread-turn--${t.role}`}>
                    {t.text}
                  </div>
                ))}
              </div>
            )}

            {/* The clarifying-questions gate — confidence-aware, optional. */}
            {showClarify && (
              <div className="forge-clarify">
                <span className="forge-clarify-label">A couple of quick questions</span>
                <p className="forge-clarify-intro">
                  Answering is always optional — answer the ones you have opinions about and skip the rest.
                </p>
                {clarifyQs.map((q) => (
                  <div key={q.id} className={`forge-clarify-q${clarifyAnswered[q.id] ? ' done' : ''}`}>
                    <p className="forge-clarify-prompt">{q.prompt}</p>
                    {clarifyAnswered[q.id] ? (
                      <span className="forge-clarify-answered">✓ noted — the brief will include it</span>
                    ) : (
                      <div className="forge-clarify-row">
                        <input
                          className="forge-clarify-input"
                          value={clarifyInputs[q.id] ?? ''}
                          onChange={(e) => setClarifyInputs((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') answerClarify(q); }}
                          placeholder={q.placeholder}
                          aria-label={q.prompt}
                        />
                        <button
                          className="forge-clarify-send"
                          onClick={() => answerClarify(q)}
                          disabled={chatLoading || !(clarifyInputs[q.id] ?? '').trim()}
                          data-agent-kind="action"
                          data-agent-action={`forge.clarify.${q.id}`}
                          data-agent-danger="none"
                          data-agent-confirm="never"
                        >
                          OK
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button className="forge-clarify-skipall" onClick={() => setSkipClarify(true)} type="button">Skip all</button>
              </div>
            )}

            <div className="forge-refine">
              <input
                className="forge-refine-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') refineBrief(); }}
                placeholder="Make it better… (e.g. add a task entity)"
                aria-label="Refine the brief"
              />
              <button
                className="forge-refine-btn"
                onClick={refineBrief}
                disabled={chatLoading || !chatInput.trim()}
                data-agent-kind="action"
                data-agent-action="forge.brief.refine"
                data-agent-danger="none"
                data-agent-confirm="never"
              >
                {chatLoading ? '…' : 'Refine'}
              </button>
            </div>

            <button
              className="forge-primary"
              onClick={forgeSchema}
              disabled={loading}
              type="button"
              data-agent-kind="action"
              data-agent-action="forge.schema.compile"
              data-agent-danger="none"
              data-agent-confirm="never"
            >
              {loading ? 'Compiling your schema…' : 'Show me my schema'}
            </button>
            <button className="forge-quiet" onClick={startNew} type="button">Start over</button>
            {error && <div className="forge-error" role="alert">{error}</div>}
          </div>
        )}

        {screen === 'schema' && (
          <div className="forge-timeline">
            {/* The glass box — the pipeline run as a collapsible thinking block,
                baked into the chat flow (the DeepSeek/Claude pattern). */}
            {streamActive && (
              <StageTrace events={forgeEvents} running={streamActive} label="The agents are working" />
            )}

            {/* The agent's output message — the schema report. */}
            <div className="forge-msg">
              <div className="forge-msg__from">
                <Lumi size={lumiSize} thinking={streamActive} calm={!streamActive} />
                <span className="forge-msg__name">{streamActive ? 'The Forge' : 'The Forge · schema'}</span>
              </div>
              <h1 className="forge-title" style={{ fontSize: '1.4rem' }}>
                {streamActive ? 'Building your schema…' : 'Here\u2019s your schema'}
              </h1>
              {guidance && <p className="forge-guidance">{guidance}</p>}
              {overAllowance && !streamActive && (
                <div className="forge-upgrade" role="status" aria-live="polite">
                  <span className="forge-upgrade__label">The Forge needs a little room</span>
                  <h2 className="forge-upgrade__title">You’ve used this month’s runs</h2>
                  <p className="forge-upgrade__copy">
                    Every run asks the agents to build. Yours are used up for this month — bump to Pro for
                    50 runs plus the audit export, or let the allowance reset.
                  </p>
                  <button
                    className="forge-primary"
                    onClick={() => setUpgradeOpen(true)}
                    type="button"
                    data-agent-kind="action"
                    data-agent-action="forge.plans.open"
                    data-agent-danger="none"
                    data-agent-confirm="never"
                  >
                    See the plans
                  </button>
                </div>
              )}
              {!streamActive && r && (
                <div className="forge-schema">
                  <h2 className="forge-schema-title">{store.brief?.title}</h2>
                  <p className="forge-schema-meta">
                    <strong>{r.artifact ? 'Ready to render' : 'No surface this time'}</strong>
                    {r.logs && ` · ${r.logs.survivors ?? 0} candidate${(r.logs.survivors ?? 0) === 1 ? '' : 's'}`}
                  </p>
                  <p className="forge-schema-desc">
                    {artifactTier === 'dream'
                      ? 'Built from your brief by the agents — the layout the Dreamer shaped from what you described.'
                      : artifactTier === 'catalog-walk'
                        ? 'The agents produced nothing bindable from your brief, so here\u2019s a canonical starting layout. Refine the brief and it will become yours.'
                        : artifactTier === 'fallback'
                          ? 'A starting point from the canon. Refine the brief to make it your own.'
                          : r.artifact
                            ? 'The agents shaped this layout from your brief.'
                            : 'The pipeline produced a starting point — refine the brief to make it yours.'}
                  </p>
{gateTone && <span className={`forge-gate forge-gate--${gateTone}`}>Gate · {gateStatus}</span>}
                  {!streamActive && r?.nextGate && r.nextGate.length > 0 && (
                    <div className="forge-nextgate" role="status" aria-live="polite">
                      <h3 className="forge-nextgate__title">What to fix</h3>
                      <ul className="forge-nextgate__list">
                        {r.nextGate.map((g, i) => (
                          <li key={i} className="forge-nextgate__item">
                            <span className="forge-nextgate__axis">{g.axis}</span>
                            <span className="forge-nextgate__action">{g.action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!!store.schema && (
                    <details className="forge-schema-details">
                      <summary>See the raw schema</summary>
                      <pre className="forge-schema-code">{JSON.stringify(store.schema, null, 2)}</pre>
                    </details>
                  )}
                  {!r.artifact && (
                    <p className="forge-card-goal">The pipeline produced a starting point — refine the brief to make it yours.</p>
                  )}
                </div>
              )}
              {!streamActive && r?.artifact && (
                <button
                  className="forge-primary"
                  onClick={() => { setStudio({ activeStage: 5 }); setPhase('celebrating'); }}
                  type="button"
                  data-agent-kind="action"
                  data-agent-action="forge.surface.reveal"
                  data-agent-danger="none"
                  data-agent-confirm="never"
                >
                  Show me my surface
                </button>
              )}
              {!streamActive && !r?.artifact && (
                <button
                  className="forge-primary"
                  onClick={() => { setSkipClarify(false); setStudio({ activeStage: 3 }); }}
                  type="button"
                  data-agent-kind="action"
                  data-agent-action="forge.schema.retry"
                  data-agent-danger="none"
                  data-agent-confirm="never"
                >
                  Make the brief clearer
                </button>
              )}
              {error && <div className="forge-error" role="alert">{error}</div>}
            </div>
          </div>
        )}

        {screen === 'surface' && r && (
          <div className="forge-canvas">
            <div className="chapter-lumi" style={{ position: 'relative' }}>
              <span
                className={`chapter-pulse ${celebrating ? 'chapter-pulse--active' : ''}`}
                aria-hidden="true"
                onAnimationEnd={handlePulseEnd}
              />
              <Lumi size={lumiSize} greeting={lumiGreeting} calm={phase !== 'celebrating'} thinking={false} />
            </div>
            {celebrating ? (
              <div className="forge-celebration" role="status">Your surface is ready!</div>
            ) : (
              <h1 className="forge-title" style={{ fontSize: '1.5rem' }}>Here's your surface</h1>
            )}
            {guidance && <p className="forge-guidance">{guidance}</p>}
            <div className="forge-surface">
              {r.artifact ? <TreeRenderer node={r.artifact} /> : (
                <p className="forge-card-goal">The surface didn't quite come together this time. That's okay — make the brief a little clearer and try again.</p>
              )}
              {gateTone && <span className={`forge-gate forge-gate--${gateTone}`}>Gate · {gateStatus}</span>}
            </div>
            {phase === 'celebrated' && (
              <button
                className="forge-primary"
                onClick={startNew}
                type="button"
                data-agent-kind="action"
                data-agent-action="forge.new"
                data-agent-danger="none"
                data-agent-confirm="never"
              >
                Start something new
              </button>
            )}
            <button className="forge-quiet" onClick={() => setMenuOpen(true)} type="button">Save or share it</button>
            {error && <div className="forge-error" role="alert">{error}</div>}
          </div>
        )}
        </div>
      </div>

      {/* The quiet menu — hidden until asked for. 48px rows, family floor. */}
      {menuOpen && (
        <>
          <div className="studio__menu-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="studio__menu" role="dialog" aria-label="Menu">
            <h2>Take it with you</h2>
            <button
              onClick={exportBrief}
              disabled={!store.brief}
              data-agent-kind="action"
              data-agent-action="forge.export.brief"
              data-agent-danger="none"
              data-agent-confirm="never"
            >Download the brief (.md)</button>
            <button
              onClick={exportSchema}
              disabled={!store.schema}
              data-agent-kind="action"
              data-agent-action="forge.export.schema"
              data-agent-danger="none"
              data-agent-confirm="never"
            >Download the schema (.json)</button>
            <button
              onClick={exportDoc}
              disabled={!store.forgeResult}
              data-agent-kind="action"
              data-agent-action="forge.export.page"
              data-agent-danger="none"
              data-agent-confirm="never"
            >
              {hasArtifact ? 'Download the page (.html)' : 'Download the record (.html)'}
            </button>
            <button
              onClick={downloadAuditLog}
              disabled={!runCompleted}
              data-agent-kind="action"
              data-agent-action="forge.export.audit"
              data-agent-danger="none"
              data-agent-confirm="never"
            >
              Download the audit log (.jsonl)
            </button>
            <hr />
            {authState.authenticated ? (
              <button
                onClick={handleSignOut}
                data-agent-kind="action"
                data-agent-action="auth.passkey.signout"
                data-agent-danger="none"
                data-agent-confirm="never"
              >
                Sign out ({shortDid(authState.did ?? '')})
              </button>
            ) : (
              <button
                onClick={() => { setMenuOpen(false); void handlePasskeyAuth(); }}
                data-agent-kind="action"
                data-agent-action="auth.passkey.signin"
                data-agent-danger="none"
                data-agent-confirm="never"
              >
                Sign in with a passkey
              </button>
            )}
            <button
              className="studio__menu-danger"
              onClick={startNew}
              data-agent-kind="action"
              data-agent-action="forge.new"
              data-agent-danger="high"
              data-agent-confirm="once"
            >Start over</button>
          </div>
        </>
      )}

      {/* The plans — the tier table behind the pill + the upgrade prompt.
          Warm and informational; the entitlement worker enforces the quota. */}
      {upgradeOpen && (
        <>
          <div className="studio__menu-backdrop" onClick={() => setUpgradeOpen(false)} aria-hidden="true" />
          <div className="studio__plans" role="dialog" aria-label="The Forge plans">
            <h2>The Forge plans</h2>
            <p className="studio__plans-intro">
              Runs are monthly, pooled per family. The audit log and compliance exports are Pro and up.
            </p>
            <div className="studio__plans-grid">
              {PLAN_ORDER.map((id) => {
                const p = PLANS[id];
                const current = tierInfo?.tier === id;
                return (
                  <div key={id} className={`studio__plan${current ? ' studio__plan--current' : ''}`}>
                    <span className="studio__plan-name">{p.name}</span>
                    <span className="studio__plan-price">{p.priceLabel}</span>
                    <ul className="studio__plan-features">
                      {p.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    {current && <span className="studio__plan-current">You’re on this plan</span>}
                  </div>
                );
              })}
            </div>
            <button
              className="forge-primary studio__plans-close"
              onClick={() => setUpgradeOpen(false)}
              type="button"
              data-agent-kind="action"
              data-agent-action="forge.plans.close"
              data-agent-danger="none"
              data-agent-confirm="never"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}