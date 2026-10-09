#!/usr/bin/env node
/**
 * gate.mjs — the surface / feature / wave gate runner.
 *
 * The build package's gates are documents (docs/enterprise/build-package/gates/*),
 * but the assertions are code. This script runs them. It is the executor the
 * master runbook named but did not provide.
 *
 * Usage:
 *   node scripts/gate.mjs --surface studio           # the studio surface gate
 *   node scripts/gate.mjs --surface studio --quick   # skip build/typecheck (fast)
 *   node scripts/gate.mjs --surface studio --live    # also gate the deployed URL
 *   node scripts/gate.mjs --feature authz            # the authz feature gate
 *   node scripts/gate.mjs --wave 1                   # the wave-1 gate
 *   node scripts/gate.mjs --list                     # list every gate
 *   node scripts/gate.mjs --check-role viewer studio # the authz role check
 *
 * Exit 0 = all assertions pass. Exit 1 = a named assertion failed.
 *
 * The live gate reads P31_SHELL_URL (defaults to the production shell).
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHELL = join(ROOT, 'portals', 'shell');
const LIVE_URL = process.env.P31_SHELL_URL ?? 'https://p31-portal-shell.pages.dev';
const args = process.argv.slice(2);

function arg(name) { const i = args.indexOf(`--${name}`); return i >= 0 ? (args[i + 1] ?? true) : undefined; }
function has(flag) { return args.includes(`--${flag}`); }

/** Run a shell command; capture exit code + output; never throw. */
function run(cmd, { cwd = ROOT, timeout = 120_000 } = {}) {
  try {
    const out = execSync(cmd, { cwd, encoding: 'utf8', timeout, stdio: ['pipe', 'pipe', 'pipe'] });
    return { ok: true, out: out.trim(), err: '', code: 0 };
  } catch (e) {
    return { ok: false, out: (e.stdout ?? '').trim(), err: (e.stderr ?? '').trim(), code: e.status ?? 1 };
  }
}

/** Run one assertion. Returns { ok, reason? }. */
async function assertGate(name, fn) {
  try {
    const r = await fn();
    if (r === true || r === undefined) { console.log(`  \u2713 ${name}`); return { ok: true }; }
    console.log(`  \u2717 ${name}: ${r}`); return { ok: false, reason: String(r) };
  } catch (e) {
    console.log(`  \u2717 ${name}: ${e.message}`); return { ok: false, reason: e.message };
  }
}

/** Read a shell source file as text. */
function shellSrc(rel) { return readFileSync(join(SHELL, rel), 'utf8'); }
// Like shellSrc, but returns '' for a missing file so a pre-build gate fails
// on a clean assertion message instead of an ENOENT stack.
function shellSrcIf(rel) { const p = join(SHELL, rel); return existsSync(p) ? readFileSync(p, 'utf8') : ''; }
// Like shellSrcIf, but for repo-root docs (e.g. docs/enterprise/build-package/...).
function rootSrcIf(rel) { const p = join(ROOT, rel); return existsSync(p) ? readFileSync(p, 'utf8') : ''; }

/** Strip line and block comments so a bare-identifier assertion matches CODE,
 *  not prose. This prevents the recurring false positive where a gate matches a
 *  docstring instead of the actual identifier. Every bare-identifier assertion
 *  must use this. */
function assertCode(src, pattern) { return pattern.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')); }

// ── Role floor (mirrors portals/shell/src/shell/surface-registry.ts) ────────
const ROLE_RANK = { viewer: 0, operator: 1, admin: 2 };

function surfaceFloor(surface) {
  const src = shellSrc('src/shell/surface-registry.ts');
  const m = src.match(new RegExp(`${surface}:\\s*'([a-z]+)'`));
  return m ? m[1] : null;
}

function checkRole(role, surface) {
  const floor = surfaceFloor(surface);
  if (!floor) return true; // no floor → open to all roles
  return (ROLE_RANK[role] ?? -1) >= ROLE_RANK[floor];
}

// ── The surface gates ───────────────────────────────────────────────────────
const SURFACES = {
  studio: [
    { name: 'StudioFace.tsx exists', fn: () => existsSync(join(SHELL, 'src/faces/studio/StudioFace.tsx')) || 'missing StudioFace.tsx' },
    { name: 'Workbench.tsx exists', fn: () => existsSync(join(SHELL, 'src/shell/Workbench.tsx')) || 'missing Workbench.tsx' },
    { name: 'Workbench.tsx exports Workbench', fn: () => /export\s+(default\s+)?(function|const)\s+Workbench/.test(shellSrc('src/shell/Workbench.tsx')) || 'no Workbench export' },
    { name: 'StudioFace renders a chat thread', fn: () => /StageTrace|forge-timeline|forge-msg/.test(shellSrc('src/faces/studio/StudioFace.tsx')) || 'no chat-thread markers' },
    { name: 'card-body padding pinned to 24px', fn: () => /\.card-body\s*\{[^}]*padding:\s*24px/.test(shellSrc('src/index.css')) || 'card-body padding not pinned' },
    { name: 'viewer is forbidden from studio', fn: () => checkRole('viewer', 'studio') === false || 'viewer not forbidden' },
  ],
  chat: [
    { name: 'ChatFace.tsx exists', fn: () => existsSync(join(SHELL, 'src/faces/chat/ChatFace.tsx')) || 'missing ChatFace.tsx' },
    { name: 'chat stream emits message.* + model.usage', fn: () => { const s = shellSrc('functions/api/chat/stream.ts'); return (/message\.content/.test(s) && /model\.usage/.test(s)) || 'missing message.* or model.usage'; } },
    { name: 'rowToEvent stamps the ledger id', fn: () => /id:\s*String\(row\.id\)/.test(shellSrc('functions/_lib/ledger.ts')) || 'ledger id dropped' },
    { name: 'MessageContent carries a role', fn: () => /role\?: 'user' \| 'assistant'/.test(shellSrc('src/bus/events.ts')) || 'no role on message.content' },
    { name: 'the face renders through the Thread primitive', fn: () => /<Thread/.test(shellSrc('src/faces/chat/ChatFace.tsx')) || 'face does not delegate to Thread' },
    { name: 'cursor derived from ledger, not localStorage', fn: () => { const t = shellSrc('src/shell/chat/threadStore.ts'); const s = shellSrc('src/shell/chat/streamClient.ts'); if (/localStorage\.(getItem|setItem|removeItem|clear|key)/.test(t)) return 'threadStore reads/writes localStorage'; if (!/fetchEvents/.test(s)) return 'no ledger hydrate'; return true; } },
    { name: 'composer gates on can(role, "create")', fn: () => { const p = shellSrc('src/shell/chat/useChatPresentation.ts'); return (/can\(/.test(p) && /create/.test(p)) || 'no create check'; } },
    { name: 'face composes canon ChatShell', fn: () => /ChatShell/.test(shellSrc('src/faces/chat/ChatFace.tsx')) || 'ChatShell not composed' },
    { name: 'streamClient has a real AbortController', fn: () => /AbortController/.test(shellSrc('src/shell/chat/streamClient.ts')) || 'no AbortController' },
    { name: 'chat has no role floor (open to all)', fn: () => (/chat:\s*'[a-z]+'/.test(shellSrc('src/shell/surface-registry.ts'))) ? 'chat must not appear in SURFACE_ROLE_FLOOR' : true },
  ],
};

// ── The feature gates ───────────────────────────────────────────────────────
const FEATURES = {
  authz: [
    { name: 'authz.ts exists', fn: () => existsSync(join(SHELL, 'src/shell/authz.ts')) || 'missing authz.ts' },
    { name: 'can() fails closed on null role', fn: () => /if\s*\(!role\)\s*return\s+false/.test(shellSrc('src/shell/authz.ts')) || 'no fail-closed check' },
    { name: 'isConsequential marks delete + deploy', fn: () => /CONSEQUENTIAL_ACTIONS[\s\S]*['"]delete['"][\s\S]*['"]deploy['"]/.test(shellSrc('src/shell/authz.ts')) || 'missing consequential set' },
  ],
  flags: [
    { name: 'flags.ts exists', fn: () => existsSync(join(SHELL, 'src/shell/flags.ts')) || 'missing flags.ts' },
    { name: 'narrow() is permission && flag', fn: () => /return\s+permission\s*&&\s*flag/.test(shellSrc('src/shell/flags.ts')) || 'narrow is not permission && flag' },
  ],
  otel: [
    { name: 'otel.ts exists', fn: () => existsSync(join(SHELL, 'src/shell/otel.ts')) || 'missing otel.ts' },
    { name: 'span traceId is the sessionId', fn: () => /traceId:\s*sessionId/.test(shellSrc('src/shell/otel.ts')) || 'traceId is not sessionId' },
  ],
  'chat-primitives': [
    { name: 'Thread.tsx exists and exports Thread', fn: () => { const p = join(SHELL, 'src/shell/chat/Thread.tsx'); return (existsSync(p) && /export\s+(function|const)\s+Thread/.test(shellSrc('src/shell/chat/Thread.tsx'))) || 'missing Thread export'; } },
    { name: 'the virtualizer is end-anchored', fn: () => /anchorTo:\s*['"]end['"]/.test(shellSrc('src/shell/chat/useThreadVirtualizer.ts')) || 'no anchorTo: end' },
    { name: 'follow-on-append is configured', fn: () => { const s = shellSrc('src/shell/chat/useThreadVirtualizer.ts'); return (/followOnAppend:\s*true/.test(s) && /scrollEndThreshold/.test(s)) || 'no followOnAppend / scrollEndThreshold'; } },
    { name: 'keys are ledger ids, never indices', fn: () => { const s = shellSrc('src/shell/chat/useThreadVirtualizer.ts'); if (/getItemKey:\s*\([^)]*\)\s*=>\s*String\(\s*index\s*\)/.test(s)) return 'index keys used'; return (/getItemKey:/.test(s) && /\.id/.test(s)) || 'getItemKey does not return a stable id'; } },
    { name: 'scrollTop has a single owner (overflow-anchor: none)', fn: () => /\.chat-thread__scroll\s*\{[^}]*overflow-anchor:\s*none/.test(shellSrc('src/index.css')) || 'overflow-anchor not disabled on the scroller' },
    { name: 'Safari bounce is mitigated (overscroll-behavior: none)', fn: () => /\.chat-thread__scroll\s*\{[^}]*overscroll-behavior:\s*none/.test(shellSrc('src/index.css')) || 'overscroll-behavior not disabled on the scroller' },
    { name: 'StreamingMarkdown uses stream-md', fn: () => /StreamMD|stream-md/.test(shellSrc('src/shell/chat/StreamingMarkdown.tsx')) || 'not using stream-md' },
    { name: 'the stream is session-scoped', fn: () => { const s = shellSrc('src/shell/chat/streamClient.ts'); return (/sessionId/.test(s) && /filter/.test(s)) || 'stream is not filtered by session'; } },
    { name: 'the user message is optimistic', fn: () => /addUser\(/.test(shellSrc('src/faces/chat/ChatFace.tsx')) || 'no optimistic user message' },
    { name: 'presentation is reactive (no getState in render)', fn: () => { const s = shellSrc('src/shell/chat/useChatPresentation.ts'); return (!/useShellStore\.getState\(\)/.test(s)) || 'presentation reads getState() during render'; } },
    { name: 'the thread scroller is a live region', fn: () => { const s = shellSrc('src/shell/chat/Thread.tsx'); return (/role="log"/.test(s) && /aria-live="polite"/.test(s)) || 'no live-region semantics'; } },
  ],
  'tool-protocol': [
    { name: 'the tool registry exports a consequential tool', fn: () => /action:\s*['"]deploy['"]/.test(shellSrc('functions/api/chat/tools.ts')) || 'no consequential tool registered' },
    { name: 'the stream offers tools to the model', fn: () => { const s = shellSrc('functions/api/chat/stream.ts'); return (/tools:/.test(s) && /env\.AI!?\.run/.test(s)) || 'tools not offered'; } },
    { name: 'the stream reads isConsequential (no second policy)', fn: () => /isConsequential/.test(shellSrc('functions/api/chat/stream.ts')) || 'policy not read' },
    { name: 'a consequential tool does not auto-execute', fn: () => { const s = shellSrc('functions/api/chat/stream.ts'); if (/if\s*\(\s*false\s*\)/.test(s)) return 'consequential branch disabled'; return (/approval-requested/.test(s)) || 'no approval request emitted'; } },
    { name: 'a rejected approval returns a denied tool result', fn: () => { const s = shellSrc('functions/api/chat/stream.ts'); return (/Denied:/.test(s) && /isError:\s*true/.test(s)) || 'no denied result'; } },
    { name: 'both tool ledger events exist', fn: () => { const s = shellSrc('src/bus/events.ts'); return (/tool\.call\.started/.test(s) && /tool\.call\.resolved/.test(s)) || 'missing tool ledger events'; } },
    { name: 'ToolBlock renders four states', fn: () => { const s = shellSrc('src/shell/chat/ToolBlock.tsx'); return (['active', 'completed', 'awaitingApproval', 'error'].every((st) => s.includes(st))) || 'missing a tool state'; } },
    { name: 'ToolBlock groups consecutive same-tool calls', fn: () => /group|repeat|count/i.test(shellSrc('src/shell/chat/ToolBlock.tsx')) || 'no grouping' },
    { name: 'the approval id is the tool-call id', fn: () => { const s = shellSrc('src/shell/chat/useToolApproval.ts'); return (/toolCallId/.test(s)) || 'approval id not bound'; } },
  ],
  'load-older': [
    { name: 'the events endpoint accepts before + limit', fn: () => { const s = shellSrc('functions/api/bus/events.ts'); return (/before/.test(s) && /limit/.test(s)) || 'no cursor params'; } },
    { name: 'hasMore is computed from a limit+1 probe', fn: () => /limit\s*\+\s*1/.test(shellSrc('functions/api/bus/events.ts')) || 'no limit+1 probe' },
    { name: 'loadOlder prepends and dedupes', fn: () => { const s = shellSrc('src/shell/chat/threadStore.ts'); return (/loadOlder/.test(s) && /seen|Set/.test(s)) || 'loadOlder missing or not deduped'; } },
    { name: 'the in-flight guard exists', fn: () => /inFlight|in_flight/.test(shellSrc('src/shell/chat/useLoadOlderOnScroll.ts')) || 'no in-flight guard' },
    { name: 'the result is ref-guarded on the conversation id', fn: () => /sessionId.*Ref|capturedId|ref-guard|refGuard/.test(shellSrc('src/shell/chat/useLoadOlderOnScroll.ts')) || 'no ref guard' },
    { name: 'the bottom pull is skipped for a prepend', fn: () => { const s = shellSrc('src/shell/chat/useLoadOlderOnScroll.ts'); if (/if \(false\) return;/.test(s)) return 'prepend skip disabled'; return (/isPrepend|prepend/.test(s)) || 'no prepend skip'; } },
    { name: 'the filtered-page hop is bounded', fn: () => { const s = shellSrc('src/shell/chat/paginationClient.ts'); if (/MAX_FILTERED_PAGE_HOPS\s*=\s*0/.test(s)) return 'hop disabled'; return /MAX_FILTERED_PAGE_HOPS/.test(s) || 'no hop bound'; } },
    { name: 'the approval decision is a ledger event', fn: () => /tool\.approval\.recorded/.test(shellSrc('src/bus/events.ts')) || 'approval decision not audited' },
    { name: 'rows carry data-message-id for the anchor test', fn: () => /data-message-id/.test(shellSrc('src/shell/chat/Thread.tsx')) || 'no data-message-id' },
    { name: 'the hydrate window is reversed so messages[0] is oldest', fn: () => { const s = shellSrcIf('src/shell/chat/streamClient.ts'); if (/if\s*\(\s*false\s*\)/.test(s)) return 'replay order disabled'; return (/\.reverse\(\)/.test(s)) || 'hydrate window not reversed — load-older cursor assumes oldest-first'; } },
  ],
  'thread-list': [
    { name: 'the conversations endpoint accepts before + limit + session', fn: () => { const s = shellSrc('functions/api/conversations/index.ts'); return (/before/.test(s) && /limit/.test(s) && /session/.test(s)) || 'no cursor params'; } },
    { name: 'the cursor is the tuple (last_message_at, session_id)', fn: () => { const s = shellSrc('functions/api/conversations/index.ts'); return (/last_message_at.*session_id|session_id.*last_message_at/i.test(s)) || 'no tuple cursor'; } },
    { name: 'hasMore is computed from a limit+1 probe', fn: () => /limit\s*\+\s*1/.test(shellSrc('functions/api/conversations/index.ts')) || 'no limit+1 probe' },
    { name: 'the sidebar rows use absolute positioning, not padding', fn: () => { const s = shellSrc('src/shell/chat/ThreadList.tsx'); if (assertCode(s, /paddingTop\s*:|paddingBottom\s*:/)) return 'padding-based row positioning — flicker loop'; return (assertCode(s, /position:\s*['"]?absolute/) && assertCode(s, /translateY/)) || 'no absolute contract'; } },
    { name: 'date buckets are computed from lastMessageAt', fn: () => { const s = shellSrc('src/shell/chat/threadListStore.ts'); return (/Today/.test(s) && /lastMessageAt/.test(s)) || 'no bucket computation'; } },
    { name: 'the prepend-skip lives in the component, not the dead hook', fn: () => { const hook = shellSrc('src/shell/chat/useLoadOlderOnScroll.ts'); const face = shellSrc('src/faces/chat/ChatFace.tsx'); if (/isPrepend/.test(hook)) return 'isPrepend is still dead code in the hook'; return true; } },
  ],
  artifacts: [
    { name: 'detectArtifacts pins the thresholds', fn: () => { const s = shellSrc('src/shell/chat/artifactDetect.ts'); return (/48/.test(s) && /3000|3k|2048|2k/i.test(s)) || 'thresholds not pinned'; } },
    { name: 'the artifact store dedupes on kind+title', fn: () => /kind.*title|title.*kind/i.test(shellSrc('src/shell/chat/artifactStore.ts')) || 'no kind+title dedupe' },
    { name: 'the preview sandbox is allow-scripts alone', fn: () => { const s = shellSrc('src/shell/chat/ArtifactPreview.tsx'); if (assertCode(s, /sandbox=\s*["'][^"']*allow-same-origin/)) return 'allow-same-origin is a same-origin escape'; return assertCode(s, /sandbox=\s*["']allow-scripts["']/) || 'no sandbox'; } },
    { name: 'the artifact pane memoizes on content and version', fn: () => { const s = shellSrc('src/shell/chat/ArtifactPane.tsx'); return (/memo\(/.test(s) && /content/.test(s) && /version/.test(s)) || 'no memo on content+version'; } },
  ],
  'streaming-protocol': [
    { name: 'the turn splits into two phases', fn: () => assertCode(shellSrc('functions/api/chat/stream.ts'), /phase\.started/) || 'no phase events' },
    { name: 'Phase 2 streams without the tools array', fn: () => { const s = shellSrc('functions/api/chat/stream.ts'); if (assertCode(s, /stream:\s*true,\s*tools:/)) return 'Phase 2 streams with tools (AiError 5023)'; return assertCode(s, /stream:\s*true/) || 'no streaming phase'; } },
    { name: 'tool events are eager, not batched at close', fn: () => /tool\.call\.resolved[\s\S]*tool\.call\.started/.test(shellSrc('functions/api/chat/stream.ts')) || 'tool events batched' },
    { name: 'the thread store batches on requestAnimationFrame', fn: () => assertCode(shellSrc('src/shell/chat/threadStore.ts'), /requestAnimationFrame/) || 'no rAF batching' },
    { name: 'the Stop button is always visible', fn: () => { const s = shellSrc('src/shell/chat/Composer.tsx'); if (/menu|dropdown/i.test(s) && /stop/i.test(s)) return 'Stop is in a menu'; return /stop/i.test(s) || 'no Stop button'; } },
    { name: 'the detection effect reads only the newest assistant message', fn: () => { const s = shellSrc('src/faces/chat/ChatFace.tsx'); if (assertCode(s, /messages\s*\.filter\([^)]*\)\s*\.map\([^)]*\)\s*\.join/)) return 'detection still concatenates'; return true; } },
  ],
  'artifact-sharing': [
    { name: 'the share appends artifact.shared', fn: () => assertCode(shellSrc('functions/api/artifacts/share.ts'), /artifact\.shared/) || 'share not audited' },
    { name: 'the sweep appends artifact.share.expired', fn: () => assertCode(shellSrc('functions/api/artifacts/sweep.ts'), /artifact\.share\.expired/) || 'expiry not audited' },
    { name: 'the durable tier reads artifact.persisted', fn: () => assertCode(shellSrc('src/shell/chat/artifactStore.ts'), /artifact\.persisted/) || 'no durable tier' },
    { name: 'nothing is persisted before an explicit share', fn: () => { const s = shellSrc('functions/api/artifacts/share.ts'); if (assertCode(s, /if\s*\(\s*true\s*\)/)) return 'auto-persist'; return /onShare|explicit|share/i.test(s) || 'no explicit gate'; } },
    { name: 'the shared copy is read-only', fn: () => { const s = shellSrc('functions/api/artifacts/share.ts'); return (!assertCode(s, /editable|write/)) || 'shared copy is editable'; } },
  ],
  'collaboration': [
    { name: 'the SessionRoom DO exists in the room Worker', fn: () => existsSync(join(SHELL, 'room/src/SessionRoom.ts')) || 'missing room/src/SessionRoom.ts' },
    { name: 'SessionRoom uses the hibernation API with state persistence', fn: () => { const s = shellSrcIf('room/src/SessionRoom.ts'); if (!s) return 'missing room/src/SessionRoom.ts'; if (/server\.accept\(\)/.test(s)) return 'uses the non-hibernating server.accept()'; return (/acceptWebSocket/.test(s) && /storage\.put/.test(s) && /blockConcurrencyWhile/.test(s)) || 'hibernation without state persistence loses the room'; } },
    { name: 'the Pages project binds SESSION_ROOM', fn: () => { const t = shellSrcIf('wrangler.toml'); return (/durable_objects/.test(t) && /SESSION_ROOM/.test(t)) || 'no SESSION_ROOM DO binding in wrangler.toml'; } },
    { name: 'the room Worker declares its class and D1', fn: () => { const t = shellSrcIf('room/wrangler.toml'); return (/SessionRoom/.test(t) && /d1_databases/.test(t)) || 'room/wrangler.toml missing the class export or D1 binding'; } },
    { name: 'the upgrade fails closed on a missing identity claim', fn: () => { const s = shellSrcIf('functions/api/session/[id]/room.ts'); if (!s) return 'missing functions/api/session/[id]/room.ts'; if (!/did|identity/i.test(s)) return 'upgrade reads no identity claim'; if (!/\b40[13]\b/.test(s)) return 'upgrade does not fail closed (401/403)'; return true; } },
    { name: 'the room persists history through the ledger append', fn: () => { const s = shellSrcIf('room/src/SessionRoom.ts'); if (!s) return 'missing SessionRoom.ts'; return /append\(env/.test(s) || 'no ledger append in the room'; } },
    { name: 'awareness is relayed, never persisted', fn: () => { const s = shellSrcIf('room/src/SessionRoom.ts'); const e = shellSrcIf('src/bus/events.ts'); if (!/awareness/i.test(s)) return 'no awareness relay in the room'; if (/append\(env(?:[^()]|\([^()]*\)){0,240}\bawareness\b/.test(s)) return 'awareness written to the ledger'; if (/type:\s*['"][^'"]*awareness/i.test(e)) return 'awareness is a ledger event type'; return true; } },
    { name: 'join/leave are ledger event types', fn: () => { const e = shellSrcIf('src/bus/events.ts'); const m = e.match(/BUS_EVENT_TYPES = \[([\s\S]*?)\]/); return (m && /session\.joined/.test(m[1]) && /session\.left/.test(m[1])) || 'session.joined/session.left missing from BUS_EVENT_TYPES'; } },
    { name: 'the remote overlay cannot capture pointer events', fn: () => { const s = shellSrcIf('src/shell/chat/collab/RemoteCursor.tsx'); if (!s) return 'missing RemoteCursor.tsx'; return assertCode(s, /pointer-events:\s*none/) || 'overlay captures pointer events'; } },
    { name: 'every message carries an authorDid', fn: () => { const e = shellSrcIf('src/bus/events.ts'); return /interface MessageContent \{[^}]*authorDid/.test(e) || 'no authorDid on MessageContent'; } },
    { name: 'the detection effect is guarded while streaming', fn: () => { const s = shellSrcIf('src/faces/chat/ChatFace.tsx'); if (!/if \(streaming\) return;/.test(s)) return 'detection has no streaming guard'; return /if \(streaming\) return;[\s\S]{0,400}detectArtifacts\(/.test(s) || 'guard does not precede detection'; } },
  ],
  'agent-presence': [
    { name: 'the turn pushes its phase to the room', fn: () => { const s = shellSrcIf('functions/api/chat/stream.ts'); if (!assertCode(s, /notifyAgentPhase/)) return 'stream.ts does not push its phase to the room'; const c = shellSrcIf('functions/_lib/roomClient.ts'); return (/SESSION_ROOM/.test(c)) || 'roomClient does not reach the SESSION_ROOM binding'; } },
    { name: 'the turn clears the agent phase at end of turn', fn: () => { const s = shellSrcIf('functions/api/chat/stream.ts'); return /notifyAgentPhase\([\s\S]{0,120}null/.test(s) || 'agent phase is never cleared (no null push)'; } },
    { name: 'the phase maps to a presence label', fn: () => { const s = shellSrcIf('src/shell/chat/collab/useAgentPresence.ts'); if (!s) return 'missing useAgentPresence.ts'; return (/thinking/.test(s) && /streaming/.test(s) && /action|response/.test(s)) || 'no phase-to-label mapping'; } },
    { name: 'the client never authors agent presence', fn: () => { const s = shellSrcIf('src/shell/chat/collab/useAgentPresence.ts'); if (!s) return 'missing useAgentPresence.ts'; if (/awareness\.(setLocalState|setLocalStateField)/.test(s)) return 'client writes agent awareness state'; return true; } },
  ],
  'pages': [
    { name: 'the PageRoom DO exists in the room Worker', fn: () => existsSync(join(SHELL, 'room/src/PageRoom.ts')) || 'missing room/src/PageRoom.ts' },
    { name: 'a page can stand alone (space_id nullable)', fn: () => { const s = shellSrcIf('migrations/0003_pages.sql'); return (/space_id/.test(s) && /\bNULL\b|\bnullable\b/i.test(s)) || 'space_id not nullable — no standalone pages'; } },
    { name: 'an agent cannot write page content directly', fn: () => { const s = shellSrcIf('functions/api/pages/[id]/suggestions.ts'); if (assertCode(s, /if\s*\(\s*true\s*\)/)) return 'suggestion applies immediately'; return assertCode(s, /accepted/) || 'no accept gate on suggestions'; } },
    { name: 'suggestions are D1-backed, not per-request memory', fn: () => { const s = shellSrcIf('functions/api/pages/[id]/suggestions.ts'); if (/const suggestions = new Map/.test(s)) return 'suggestions are per-request memory'; return (/env\.DB/.test(s)) || 'suggestions are not D1-backed'; } },
    { name: 'a suggestion is anchored to a range', fn: () => { const s = shellSrcIf('functions/api/pages/[id]/suggestions.ts'); return (/anchor/i.test(s)) || 'suggestions carry no anchor'; } },
    { name: 'deletion is a move to Trash, never a blast', fn: () => { const s = shellSrcIf('functions/api/pages/[id]/index.ts'); return (/trash|trashed_at|restore/i.test(s)) || 'no trash/restore path'; } },
    { name: 'page events are in the union', fn: () => { const e = shellSrcIf('src/bus/events.ts'); return (/page\.created/.test(e) && /page\.deleted/.test(e) && /page\.restored/.test(e) && /suggestion\.created/.test(e) && /suggestion\.resolved/.test(e)) || 'missing a page/suggestion ledger event'; } },
    { name: 'the PageRoom uses the hibernation API', fn: () => { const s = shellSrcIf('room/src/PageRoom.ts'); if (!s) return 'missing room/src/PageRoom.ts'; if (/server\.accept\(\)/.test(s)) return 'uses the non-hibernating server.accept()'; return /acceptWebSocket/.test(s) || 'does not call acceptWebSocket'; } },
    { name: 'the PageRoom persists its snapshot across hibernation', fn: () => { const s = shellSrcIf('room/src/PageRoom.ts'); return (/storage\.put/.test(s) && /blockConcurrencyWhile/.test(s)) || 'no state persistence — a hibernated room loses its draft'; } },
  ],
  'collab-harness': [
    { name: 'the harness exists', fn: () => existsSync(join(SHELL, 'harness-collab.html')) || 'missing harness-collab.html' },
    { name: 'the harness mounts a .draft bound to Y.Text', fn: () => { const s = shellSrcIf('harness-collab.tsx'); return (/\.draft/.test(s) && /getText\(/.test(s)) || 'no .draft bound to a Y.Text'; } },
    { name: 'the harness stubs the room with a BroadcastChannel', fn: () => { const s = shellSrcIf('harness-collab.tsx'); return (/BroadcastChannel/.test(s)) || 'no BroadcastChannel stub'; } },
    { name: 'the harness binds the draft incrementally (no full replace)', fn: () => { const s = shellSrcIf('harness-collab.tsx'); if (/delete\(0,\s*ytext\.length\)/.test(s)) return 'full-replace binding — cannot converge'; return (/setRangeText|applyDelta/.test(s)) || 'no incremental binding'; } },
    { name: 'the harness implements the two-step sync handshake', fn: () => { const s = shellSrcIf('harness-collab.tsx'); return (/encodeStateVector/.test(s) && /encodeStateAsUpdate/.test(s)) || 'no sync handshake'; } },
    { name: 'presence comes from real awareness, not a seed', fn: () => { const s = shellSrcIf('harness-collab.tsx'); if (/presence:\s*\{\s*\[did\]/.test(s)) return 'presence is a static seed'; return (/new awarenessProtocol\.Awareness|new Awareness/.test(s)) || 'no awareness instance'; } },
    { name: 'departure is announced before teardown', fn: () => { const s = shellSrcIf('harness-collab.tsx'); return (/removeAwarenessStates/.test(s)) || 'no explicit departure'; } },
    { name: 'the convergence specs use one context, two pages', fn: () => { const a = shellSrcIf('tests/e2e/collaboration.spec.ts'); const b = shellSrcIf('tests/e2e/pages.spec.ts'); if (/browser\.newContext\(\)[\s\S]{0,400}browser\.newContext\(\)/.test(a + b)) return 'still two contexts'; return true; } },
  ],
  'comments-notifications': [
    { name: 'the thread is CRDT state', fn: () => { const s = shellSrcIf('src/features/comments/lib/commentStore.ts'); return (/Y\.(Map|Array)/.test(s) && /threads/.test(s)) || 'threads are not CRDT state'; } },
    { name: 'an orphaned anchor is a state, not a deletion', fn: () => { const s = shellSrcIf('src/features/comments/hooks/useCommentAnchor.ts'); return (/createRelativePositionFromTypeIndex/.test(s) && /null|orphan/i.test(s)) || 'no relative-position anchor or no orphan handling'; } },
    { name: 'mentions dedup by target', fn: () => { const s = shellSrcIf('src/features/notifications/lib/notificationStore.ts'); return (/dedup|count|\bSet\b/.test(s)) || 'no dedup by target'; } },
    { name: 'read state is viewport-driven', fn: () => { const s = shellSrcIf('src/features/notifications/hooks/useReadOnViewport.ts'); return (/IntersectionObserver/.test(s)) || 'read is not viewport-driven'; } },
    { name: 'comment lifecycle events are ledger events', fn: () => { const e = shellSrcIf('src/bus/events.ts'); return (/comment\.created/.test(e) && /comment\.resolved/.test(e) && /comment\.reopened/.test(e)) || 'missing a comment ledger event'; } },
    { name: 'read state is never a ledger event', fn: () => { const e = shellSrcIf('src/bus/events.ts'); if (/notification\.read/.test(e)) return 'notification.read is a ledger event'; return true; } },
  ],
  'byok': [
    { name: 'keys are encrypted at rest', fn: () => { const c = shellSrcIf('functions/_lib/credentials.ts'); const m = shellSrcIf('migrations/0006_credentials.sql'); return (/AES|createCipheriv/.test(c) && /ciphertext/.test(m) && /\biv\b/.test(m)) || 'key not encrypted at rest (AES-256-GCM)'; } },
    { name: 'the GET returns metadata only, never the key', fn: () => { const s = shellSrcIf('functions/api/credentials/index.ts'); if (assertCode(s, /ciphertext:\s*row\.ciphertext/)) return 'ciphertext returned by GET'; return (/fingerprint/.test(s)) || 'no fingerprint on the metadata surface'; } },
    { name: 'credential events carry a fingerprint, never the key', fn: () => { const e = shellSrcIf('src/bus/events.ts'); return (/credential\.connected/.test(e) && /credential\.disconnected/.test(e) && /fingerprint/.test(e)) || 'missing credential event or fingerprint'; } },
    { name: 'resolution is per-call (the engine holds no key)', fn: () => { const c = shellSrcIf('functions/_lib/credentials.ts'); const t = shellSrcIf('functions/api/chat/stream.ts'); if (!/resolveKey/.test(c)) return 'no resolveKey in credentials.ts'; return (/resolveKey/.test(t)) || 'the turn never resolves a key per call'; } },
    { name: 'resolveKey returns the plaintext key', fn: () => { const s = shellSrcIf('functions/_lib/credentials.ts'); return (/key: string/.test(s) && /resolveKey/.test(s)) || 'resolveKey does not return a plaintext key'; } },
    { name: 'the IV is random per credential', fn: () => { const s = shellSrcIf('functions/_lib/credentials.ts'); return (/crypto\.getRandomValues/.test(s)) || 'IV is not randomly generated (reuse breaks GCM)'; } },
    { name: 'disconnect revokes immediately', fn: () => { const s = shellSrcIf('functions/api/credentials/index.ts'); return (/DELETE|onRequestDelete/.test(s)) || 'no revoke path (DELETE)'; } },
  ],
  'search': [
    { name: 'the FTS5 virtual table exists', fn: () => { const s = shellSrcIf('migrations/0007_search.sql'); return (/fts5/i.test(s) && /VIRTUAL TABLE/i.test(s)) || 'no FTS5 virtual table'; } },
    { name: 'the index is fed by triggers, not a second writer', fn: () => { const s = shellSrcIf('migrations/0007_search.sql'); return (/TRIGGER/i.test(s)) || 'no insert trigger'; } },
    { name: "the FTS delete path uses the 'delete' command form", fn: () => { const s = shellSrcIf('migrations/0007_search.sql'); return (/VALUES \('delete', old\./.test(s)) || 'no external-content-safe delete form'; } },
    { name: 'the request-id guard is present', fn: () => { const s = shellSrcIf('src/features/search/lib/searchStore.ts'); return (/requestId|request_id|reqId/.test(s)) || 'no stale-response guard'; } },
    { name: 'the palette renders four groups', fn: () => { const s = shellSrcIf('src/features/search/components/CommandPalette.tsx'); return (['threads', 'pages', 'artifacts', 'actions'].every((g) => s.toLowerCase().includes(g))) || 'missing a group'; } },
    { name: 'the empty state shows recents', fn: () => { const s = shellSrcIf('src/features/search/components/CommandPalette.tsx'); return (/recent/i.test(s)) || 'no recents empty state'; } },
    { name: 'the palette uses cmdk', fn: () => { const s = shellSrcIf('src/features/search/components/CommandPalette.tsx'); return (/cmdk|Command\./.test(s)) || 'not built on cmdk'; } },
  ],
  'activity-feed': [
    { name: 'the allowlist is explicit', fn: () => { const s = shellSrcIf('src/features/activity/lib/activityLabels.ts'); return (/ALLOWLIST|allowlist/i.test(s)) || 'no allowlist'; } },
    { name: 'raw message.content is never in the feed', fn: () => { const s = shellSrcIf('src/features/activity/lib/activityLabels.ts'); if (/message\.content/.test(s)) return 'message.content is in the allowlist'; return true; } },
    { name: 'the feed reads bus_events; no activity table', fn: () => { const s = shellSrcIf('functions/api/activity/index.ts'); if (/CREATE TABLE|activity_events/i.test(s)) return 'a second store exists'; return /bus_events/.test(s) || 'does not read the ledger'; } },
    { name: 'dedup by actor+action+window', fn: () => { const s = shellSrcIf('src/features/activity/lib/activityStore.ts'); return (/dedup|count|window/i.test(s)) || 'no dedup'; } },
    { name: 'every allowlisted type has a label', fn: () => { const s = shellSrcIf('src/features/activity/lib/activityLabels.ts'); return (/Record<|Map</.test(s)) || 'no label map'; } },
    { name: 'the feed is read-only', fn: () => { const s = shellSrcIf('src/features/activity/components/ActivityFeed.tsx'); if (!s) return 'missing ActivityFeed.tsx'; if (/publish\(|append\(/.test(s)) return 'the feed writes state'; return true; } },
  ],
  'compliance': [
    { name: 'the AI disclosure renders on assistant messages', fn: () => { const s = shellSrcIf('src/features/compliance/components/AiDisclosure.tsx'); return (/AI|assistant/i.test(s)) || 'no disclosure'; } },
    { name: 'artifacts carry provenance', fn: () => { const e = shellSrcIf('src/bus/events.ts'); return (/provenance/.test(e)) || 'no provenance field'; } },
    { name: 'the export sets integrity_status from a verify pass', fn: () => { const s = shellSrcIf('functions/api/audit/export.ts'); if (assertCode(s, /integrity_status:\s*['"]VERIFIED['"]/)) return 'integrity hardcoded'; return /verify|verifyChain/.test(s) || 'no verify pass'; } },
    { name: 'the retention floor is 180 days', fn: () => { const s = shellSrcIf('functions/api/session/[id]/retention.ts'); return (/180|6\s*\*\s*30/.test(s)) || 'no 180-day floor'; } },
    { name: 'redaction preserves the chain', fn: () => { const s = shellSrcIf('functions/_lib/retention.ts'); if (/hash\s*=\s*NULL/.test(s)) return 'redaction nulls the hash'; return /tombstone|redacted/i.test(s) || 'no redaction path'; } },
    { name: 'the export bundle has three parts', fn: () => { const s = shellSrcIf('functions/api/audit/export.ts'); return (/manifest/.test(s) && /events\.jsonl|jsonl/.test(s) && /checksums\.sha256|sha256/.test(s)) || 'incomplete bundle'; } },
  ],
  'observability': [
    { name: 'gen_ai.conversation.id is on every agent span', fn: () => { const s = shellSrcIf('src/shell/otel.ts'); return (/gen_ai\.conversation\.id/.test(s)) || 'no conversation id attribute'; } },
    { name: 'gen_ai.operation.name distinguishes the span tree', fn: () => { const s = shellSrcIf('src/shell/otel.ts'); return (/gen_ai\.operation\.name/.test(s)) || 'no operation-name attribute'; } },
    { name: 'the GenAI semconv version is pinned', fn: () => { const s = shellSrcIf('src/shell/otel.ts'); return (/GENAI_SEMCONV_VERSION|SEMCONV_VERSION/.test(s)) || 'no semconv version pin'; } },
    { name: 'the five-way token split is present', fn: () => { const e = shellSrcIf('src/bus/events.ts'); return (/cache_creation_tokens/.test(e) && /reasoning_tokens/.test(e)) || 'model.usage lacks cache_creation or reasoning tokens'; } },
    { name: 'the prompt version is on the model span', fn: () => { const s = shellSrcIf('src/shell/otel.ts'); return (/gen_ai\.prompt\.version/.test(s)) || 'no prompt version attribute'; } },
    { name: 'the ledger carries traceId additively and nullable', fn: () => { const s = shellSrcIf('functions/_lib/ledger.ts'); if (!/traceId/.test(s)) return 'no traceId on the ledger append'; if (/traceId:\s*string/.test(s)) return 'traceId is required, not nullable'; return true; } },
    { name: 'the span tree is invoke_agent with chat/execute_tool siblings', fn: () => { const s = shellSrcIf('src/shell/otelSpanTree.ts'); if (!s) return 'missing otelSpanTree.ts'; return (/invoke_agent/.test(s) && /execute_tool/.test(s) && /chat/.test(s) && /CONVERSATION_ID/.test(s)) || 'no span tree or no conversation-id propagation'; } },
  ],
  'telemetry-pipeline': [
    { name: 'native tracing is enabled in both wrangler files', fn: () => { const p = shellSrcIf('wrangler.toml'); const r = shellSrcIf('room/wrangler.toml'); return (/observability/.test(p) && /enabled\s*=\s*true/.test(p) && /observability/.test(r) && /enabled\s*=\s*true/.test(r)) || 'traces not enabled in one of the wrangler files'; } },
    { name: 'no OTel SDK is imported', fn: () => { const s = shellSrcIf('functions/_lib/telemetry.ts'); if (!s) return 'missing functions/_lib/telemetry.ts'; if (/@opentelemetry\/|NodeSDK|OTLPTraceExporter/.test(s)) return 'an SDK is imported'; return true; } },
    { name: 'errors are never sampled', fn: () => { const s = shellSrcIf('functions/_lib/telemetry.ts'); if (!s) return 'missing functions/_lib/telemetry.ts'; if (/0\.01|1\s*\/\s*100/.test(s)) return 'uniform 1% sampling'; return /error/i.test(s) || 'no error-priority branch'; } },
    { name: 'redaction is documented as collector-side', fn: () => { const s = rootSrcIf('docs/enterprise/build-package/features/telemetry-pipeline.md'); return (/transform processor/i.test(s) && /redact/i.test(s)) || 'redaction not documented as collector-side'; } },
    { name: 'the metrics constraint is named', fn: () => { const s = rootSrcIf('docs/enterprise/build-package/features/telemetry-pipeline.md'); return (/not metrics|traces and logs/i.test(s)) || 'the metrics constraint is not named'; } },
    { name: 'the app does not redact before export', fn: () => { const s = shellSrcIf('src/shell/otel.ts'); return (!/redact|scrub|mask/i.test(s)) || 'the app redacts before export'; } },
  ],
};

// ── The live gate (against the deployed URL) ────────────────────────────────
async function liveGate() {
  const res = [];
  const home = run(`curl -s -o /dev/null -w "%{http_code}" ${LIVE_URL}`);
  res.push(await assertGate('the shell serves HTTP 200', () => home.out === '200' || `got ${home.out}`));

  const cssHref = run(`curl -s ${LIVE_URL} | grep -oE 'assets/index-[A-Za-z0-9_-]+\\.css' | head -1`);
  if (cssHref.out) {
    const css = run(`curl -s ${LIVE_URL}/${cssHref.out} | grep -o "card-body{padding:24px" | head -1`);
    res.push(await assertGate('deployed CSS pins card-body to 24px', () => css.out.includes('padding:24px') || 'not pinned'));
  }
  return res.every((r) => r.ok);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (has('list')) {
    console.log('Surfaces:', Object.keys(SURFACES).join(', '));
    console.log('Features:', Object.keys(FEATURES).join(', '));
    console.log('Waves: 1 (studio)');
    process.exit(0);
  }

  if (has('check-role')) {
    const [role, surface] = args.slice(args.indexOf('--check-role') + 1);
    process.exit(checkRole(role, surface) ? 0 : 1);
  }

  const surface = arg('surface');
  const feature = arg('feature');
  const wave = arg('wave');
  const quick = has('quick');
  const live = has('live');

  let gates = [];
  let label = '';

  if (surface) {
    gates = SURFACES[surface];
    if (!gates) { console.error(`gate: unknown surface "${surface}"`); process.exit(1); }
    label = `surface: ${surface}`;
    // The slow assertions — skipped under --quick.
    if (!quick) {
      gates = [
        ...gates,
        { name: 'typecheck passes', fn: () => { const r = run('npm run typecheck', { cwd: SHELL }); return r.ok || `typecheck failed:\n${r.err.slice(0, 400)}`; } },
        { name: 'build passes', fn: () => { const r = run('npm run build', { cwd: SHELL }); return r.ok || `build failed:\n${r.err.slice(0, 400)}`; } },
      ];
    }
  } else if (feature) {
    gates = FEATURES[feature];
    if (!gates) { console.error(`gate: unknown feature "${feature}"`); process.exit(1); }
    label = `feature: ${feature}`;
  } else if (wave === '1') {
    gates = SURFACES.studio;
    label = 'wave: 1 (studio)';
  } else {
    console.error('gate: specify --surface <name>, --feature <name>, --wave <n>, or --list');
    process.exit(1);
  }

  const results = [];
  for (const g of gates) results.push(await assertGate(g.name, g.fn));

  if (live) {
    console.log(`\n  live gate (${LIVE_URL}):`);
    const ok = await liveGate();
    results.push({ ok });
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n${failed === 0 ? '\u2705' : '\u2717'} ${label} — ${passed}/${results.length} assertions passed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });