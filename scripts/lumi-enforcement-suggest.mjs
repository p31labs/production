#!/usr/bin/env node
/**
 * lumi-enforcement-suggest — the observe→enforce transition gate (SRE
 * canary protocol for a policy on existing traffic).
 *
 * Reads the refusals sidecar (a JSON file from GET /api/loom/refusals, or the
 * URL) and suggests the next LUMI_ENFORCEMENT state per the runbook in
 * docs/GOVERNANCE.md:
 *
 *   observe → enforce   when: observe ≥ 72h, would-refuse rate < 2% of agent
 *                        events, and NO observation has an 'unknown reason'
 *                        (that signals a guard bug, not a family pattern)
 *   enforce → observe   when: the enforced-refusal rate spikes > 3x the
 *                        observe-mode baseline (rollback, don't page a human)
 *   else                keep observing
 *
 * Usage:
 *   node scripts/lumi-enforcement-suggest.mjs <refusals.json|url> [--total <agentEvents>] [--baseline-start-ts <ISO>]
 *
 * --baseline-start-ts excludes pre-window records (e.g. deploy test data) from
 * the observation window; --total is then interpreted as agent events SINCE the
 * baseline.
 *
 * Caveat: the per-window stability check is meaningful at higher observation
 * density. For sparse family traffic (~1 observation/week) the per-window mean
 * is ~1 and the spike test rarely fires — rely on the aggregate <2% rate and
 * the unknown-reasons check at that density.
 */
import { readFileSync } from 'node:fs';

const REFUSE_THRESHOLD = 0.02;      // 2% of agent events would-be-refused
const ROLLBACK_MULTIPLIER = 3;      // enforce spikes >3x observe baseline
const MIN_OBSERVE_HOURS = 72;
const WINDOW_SPIKE_MULTIPLIER = 2;  // a single window >2x the mean = unstable
const STABLE_WINDOWS = 3;           // promote only if the last N windows are calm
const MIN_EVENTS = 20;              // an empty window is NOT a clean window

function loadRefusals(input) {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return null; // fetch is async; handled in main()
  }
  const text = readFileSync(input, 'utf8');
  const parsed = JSON.parse(text);
  return parsed.refusals ?? parsed;
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('usage: lumi-enforcement-suggest.mjs <refusals.json|url> [--total <agentEvents>]');
    process.exit(2);
  }
  const totalArg = process.argv.indexOf('--total');
  const totalEvents = totalArg !== -1 ? Number(process.argv[totalArg + 1]) : 0;
  const baseArg = process.argv.indexOf('--baseline-start-ts');
  const baselineTs = baseArg !== -1 ? new Date(process.argv[baseArg + 1]).getTime() : 0;

  let refusals;
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const res = await fetch(input);
    const parsed = (await res.json());
    refusals = parsed.refusals ?? [];
  } else {
    refusals = loadRefusals(input);
  }

  // Exclude pre-baseline records so deploy/test contamination can't skew the
  // window. --total is then the agent events count SINCE the baseline.
  const inWindow = refusals.filter((r) => new Date(r.ts).getTime() >= baselineTs);
  const enforce = inWindow.filter((r) => r.mode === 'enforce');
  const observe = inWindow.filter((r) => r.mode === 'observe');
  const unknownReasons = observe.filter((r) => !r.reason || /unknown|scope violation|undefined/i.test(r.reason));

  const total = totalEvents || observe.length + enforce.length;
  const observeRate = total > 0 ? observe.length / total : 0;
  const baseline = observe.length || 1;
  const enforceSpike = enforce.length / baseline;

  const firstObserve = observe.reduce((acc, r) => (acc ? Math.min(acc, r.ts) : r.ts), null);
  // The window starts at the later of the baseline and the first in-window
  // observation — pre-baseline records don't count toward the 72h.
  const windowStart = Math.max(baselineTs, firstObserve ? new Date(firstObserve).getTime() : 0);
  const hoursObserving = windowStart ? (Date.now() - windowStart) / 3_600_000 : 0;

  // Per-window stability: bucket observations into fixed windows and require
  // that NO recent window spikes above ~2x the mean — an aggregate <2% hides a
  // weekday spike that a daily average washes out.
  const windowHours = Number(process.argv[process.argv.indexOf('--window-hours') + 1] ?? 24) || 24;
  const bucket = (ts) => Math.floor((new Date(ts).getTime() - windowStart) / (windowHours * 3_600_000));
  const counts = new Map();
  for (const o of observe) {
    const b = bucket(o.ts);
    if (b >= 0) counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  const windows = [...counts.keys()].sort((a, b) => a - b);
  const meanPerWindow = windows.length ? observe.length / windows.length : 0;
  const spikedWindow = windows.find((b) => counts.get(b) > WINDOW_SPIKE_MULTIPLIER * Math.max(meanPerWindow, 1));
  const recentCalm = windows.slice(-STABLE_WINDOWS).every((b) => counts.get(b) <= WINDOW_SPIKE_MULTIPLIER * Math.max(meanPerWindow, 1));

  console.log(`observations: ${observe.length} · refusals: ${enforce.length} · would-refuse rate: ${(observeRate * 100).toFixed(2)}%${totalEvents ? ` of ${totalEvents} agent events` : ''}`);
  console.log(`observe window: ${hoursObserving.toFixed(1)}h (need ≥ ${MIN_OBSERVE_HOURS}h) · unknown reasons: ${unknownReasons.length} · enforce/observe spike: ${enforceSpike.toFixed(2)}x`);
  console.log(`per-window (${windowHours}h) counts: ${windows.map((b) => `${b}:${counts.get(b)}`).join(' ') || 'none'}${spikedWindow !== undefined ? ` — SPIKE at window ${spikedWindow}` : ''}`);

  let suggestion = 'KEEP OBSERVING';
  let reasons = [];
  const minEvents = Number(process.argv[process.argv.indexOf('--min-events') + 1] ?? MIN_EVENTS) || MIN_EVENTS;
  if (hoursObserving < MIN_OBSERVE_HOURS) reasons.push(`observe window ${hoursObserving.toFixed(1)}h < ${MIN_OBSERVE_HOURS}h`);
  if (total < minEvents) reasons.push(`only ${total} agent events since baseline — an empty window is NOT a clean window (need ≥ ${minEvents})`);
  if (observeRate >= REFUSE_THRESHOLD) reasons.push(`would-refuse rate ${(observeRate * 100).toFixed(2)}% ≥ ${REFUSE_THRESHOLD * 100}%`);
  if (unknownReasons.length) reasons.push(`${unknownReasons.length} observation(s) with an unknown reason (guard bug signal)`);
  if (!recentCalm) reasons.push(`recent windows are not stable (a window exceeds ${WINDOW_SPIKE_MULTIPLIER}x the mean)`);
  if (enforceSpike > ROLLBACK_MULTIPLIER && enforce.length > 5) {
    suggestion = 'ROLLBACK enforce → observe';
    reasons = [`enforced-refusal rate ${enforceSpike.toFixed(2)}x the observe baseline (spike ≥ ${ROLLBACK_MULTIPLIER}x)`];
  } else if (reasons.length === 0 && observe.length > 0) {
    suggestion = 'PROMOTE observe → enforce';
  } else if (observe.length === 0 && enforce.length === 0) {
    suggestion = 'NO DATA — start in observe';
    reasons = ['the sidecar is empty; do not jump straight to enforce on existing traffic'];
  }
  console.log(`\nsuggestion: ${suggestion}`);
  for (const r of reasons) console.log(`  · ${r}`);
}

main().catch((e) => { console.error(e); process.exit(1); });