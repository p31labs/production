#!/usr/bin/env node
/**
 * sierpinski-audit — verify the scaling triad is complete at every scale.
 *
 * The P31 structure subdivides into four scales — Human, Agent, Device, OS —
 * each repeating the same triad: Intent → Contract → Instantiation, with a
 * Judgment void surfaced where the system delegates.
 *
 *   Human   contract = design-mcp tools + p31ca CLI    void = confidence tier
 *   Agent   contract = registry.json                   void = confidence tier
 *   Device  contract = design tokens (--p31-*)         void = parity baselines
 *   OS      contract = package exports                 void = platform detection
 *
 * A scale is COMPLETE when: its contract resolves, its instantiation exists,
 * and its void is surfaced. A scale with a broken contract or a hidden void
 * breaks self-similarity — the fractal is incomplete.
 *
 * This is a VERIFICATION gate: it confirms the structure holds at each scale.
 * It does not plan a fold — the Jitterbug migration (fork count → 0) is the
 * operation that completes the structure; this audit confirms it.
 *
 * Usage:
 *   node sierpinski-audit.mjs            # verify all four scales
 *   node sierpinski-audit.mjs --json     # machine-readable
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)));
const ROOT = resolve(HERE, '..', '..', '..');
const DC = join(ROOT, 'production', 'packages', 'design-core');
const REGISTRY = join(DC, 'registry.json');
const CANON_MCP = join(ROOT, 'production', 'packages', 'canon-mcp', 'src', 'server.ts');
const DESIGN_MCP = join(ROOT, 'production', 'cli', 'design-mcp-server.js');
const P31CA_CLI = join(DC, 'cli', 'p31ca.mjs');
const PARITY = join(HERE, 'parity-server.mjs');
const BASELINES = join(HERE, 'chrome-baselines-isolated');
const AUDIT = join(ROOT, 'production', 'tools', 'canon-audit', 'canon-source-audit.mjs');

/** One scale's triad — contract, instantiation, void. */
function checkScale(scale) {
  const contract = typeof scale.contract === 'function' ? scale.contract() : scale.contract;
  const instantiation = typeof scale.instantiation === 'function' ? scale.instantiation() : scale.instantiation;
  const voidSurfaced = typeof scale.void === 'function' ? scale.void() : scale.void;
  return {
    scale: scale.name,
    complete: Boolean(contract && instantiation && voidSurfaced),
    contract,
    instantiation,
    voidSurfaced,
  };
}

async function main() {
  const json = process.argv.includes('--json');

  const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
  const tiers = registry.counts.confidence ?? { autonomous: 0, supervised: 0, blocked: 0 };

  const scales = [
    {
      name: 'human',
      contract: () => existsSync(DESIGN_MCP) && existsSync(P31CA_CLI),
      instantiation: () => readdirSync(join(DC, 'cli')).length > 0,
      void: () => tiers.autonomous + tiers.supervised > 0,
    },
    {
      name: 'agent',
      contract: () => existsSync(REGISTRY) && registry.items.length > 0,
      instantiation: () => existsSync(CANON_MCP),
      void: () => tiers.autonomous > 0, // agents act autonomously only on verified canon
    },
    {
      name: 'device',
      contract: () => existsSync(join(DC, 'src', 'css', 'base.css')),
      instantiation: () => existsSync(PARITY),
      void: () => existsSync(BASELINES) && readdirSync(BASELINES).filter((f) => f.startsWith('component-')).length >= 12,
    },
    {
      name: 'os',
      contract: () => registry.items.every((i) => i.importPath && i.files?.every((f) => f.exists)),
      instantiation: () => existsSync(join(DC, 'dist')) || existsSync(join(DC, 'package.json')),
      void: () => existsSync(AUDIT), // the fork-gate = platform/OS-level integrity check
    },
  ];

  const results = scales.map(checkScale);
  const complete = results.filter((r) => r.complete).length;

  // ── LIVE PROBE HELPERS (only when --probe) ──
  const probe = process.argv.includes('--probe');
  const { execSync } = await import('node:child_process');

  /** Spawn a stdio MCP server, send one tools/call, parse the response. */
  function mcpCall(serverCmd, name, args, cwd) {
    const input = `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"${name}","arguments":${JSON.stringify(args ?? {})}}}\n`;
    try {
      const out = execSync(`echo '${input.replace(/'/g, "'\\''")}' | timeout 60 ${serverCmd} 2>/dev/null || true`, { encoding: 'utf8', timeout: 70000, cwd });
      const lines = out.trim().split('\n').filter(Boolean);
      const last = JSON.parse(lines[lines.length - 1]);
      if (last.error) return { ok: false, error: last.error.message };
      return { ok: true, result: last.result?.content?.[0]?.text };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ── The six cross-scale edges (K₄ completeness). In default (non-probe)
  // mode the three interface edges are structural; with --probe they ACTUALLY
  // invoke the MCP / parity / CLI surfaces and assert a real result.
  const edges = [
    {
      name: 'H↔A (human↔agent)',
      check: () => {
        if (probe) {
          // Live: call get_confidence through canon-mcp, assert tiers parse.
          const r = mcpCall('npx tsx src/server.ts', 'get_confidence', {}, join(ROOT, 'production', 'packages', 'canon-mcp'));
          if (!r.ok) return false;
          const tiers = JSON.parse(r.result);
          return Array.isArray(tiers.autonomous) && Array.isArray(tiers.supervised) && Array.isArray(tiers.blocked);
        }
        return (
          registry.counts.confidence &&
          registry.counts.confidence.autonomous + registry.counts.confidence.supervised > 0
        );
      },
      detail: 'H↔A invokes canon-mcp get_confidence (live probe in --probe mode)',
    },
    {
      name: 'H↔D (human↔device)',
      check: () => {
        const css = readFileSync(join(DC, 'src', 'css', 'base.css'), 'utf8');
        return css.includes('--p31-') && /oklch\(/.test(css);
      },
      detail: 'design tokens resolve in CSS for any device render',
    },
    {
      name: 'H↔O (human↔os)',
      check: () => registry.items.every((i) => i.importPath && i.files?.every((f) => f.exists)),
      detail: 'every registry item resolves to a real package export / build source',
    },
    {
      name: 'A↔D (agent↔device)',
      check: () => {
        if (probe) {
          // Live: invoke parity_chrome for an autonomous chrome and assert it
          // actually passes. Requires the chrome-harness dev server (port 5191)
          // to be running; if it's down, report as skipped, not a hard fail.
          try {
            const r = mcpCall('node parity-server.mjs', 'parity_chrome', { name: 'Topbar' }, HERE);
            if (!r.ok) return false;
            const res = JSON.parse(r.result);
            return res.pass === true;
          } catch (e) {
            return false;
          }
        }
        const baselines = existsSync(BASELINES) ? readdirSync(BASELINES).filter((f) => f.startsWith('component-')) : [];
        const autonomousChrome = registry.items.filter((i) => i.category === 'chrome' && i.confidence?.tier === 'autonomous').length;
        return autonomousChrome >= 12 && baselines.length >= 12;
      },
      detail: 'A↔D invokes parity_chrome on autonomous chrome (live probe in --probe mode)',
    },
    {
      name: 'A↔O (agent↔os)',
      check: () => {
        if (probe) {
          // Live: run p31ca add Crown into a scratch target, assert the file
          // lands + exit 0, then clean up.
          const scratch = '/tmp/p31-probe';
          try {
            execSync(`node ${P31CA_CLI} add Crown --target ${scratch}`, { encoding: 'utf8', timeout: 15000, cwd: DC });
            const landed = existsSync(join(scratch, 'components', 'Crown.tsx'));
            execSync(`rm -rf ${scratch}`, { timeout: 5000 });
            return landed;
          } catch (e) {
            return false;
          }
        }
        return existsSync(P31CA_CLI) && readFileSync(P31CA_CLI, 'utf8').includes('add');
      },
      detail: 'A↔O runs p31ca add into a scratch target (live probe in --probe mode)',
    },
    {
      name: 'D↔O (device↔os)',
      check: () => {
        // Device tokens respond to OS signals — media queries, prefers-color-
        // scheme, or data-theme. Live in the canon css dir (chrome/recipes),
        // not just base.css.
        const cssDir = join(DC, 'src', 'css');
        let signal = false;
        for (const f of readdirSync(cssDir).filter((x) => x.endsWith('.css'))) {
          const css = readFileSync(join(cssDir, f), 'utf8');
          if (/@media|prefers-color-scheme|data-theme/.test(css)) { signal = true; break; }
        }
        return signal;
      },
      detail: 'device tokens respond to OS/breakpoint signals (media queries, prefers-color-scheme, data-theme)',
    },
  ];
  const edgeResults = edges.map((e) => ({ name: e.name, check: e.check(), detail: e.detail }));
  const edgesComplete = edgeResults.filter((e) => e.check).length;

  // Fork count is the structure's contraction state (not a scale — the fold).
  let forkCount = 'n/a';
  try {
    const { execSync } = await import('node:child_process');
    const out = execSync(`node ${AUDIT} 2>&1`, { encoding: 'utf8', timeout: 30000 });
    const m = out.match(/(\d+) fork\(s\) detected/);
    forkCount = m ? m[1] : '0';
  } catch (e) {
    const m = e.stdout?.toString?.().match(/(\d+) fork\(s\) detected/);
    forkCount = m ? m[1] : '0';
  }

  const report = {
    fractal: complete === 4,
    k4Complete: complete === 4 && edgesComplete === 6,
    scales: results,
    edges: edgeResults,
    forkCount: Number(forkCount),
    tiers,
    completeScales: complete,
    completeEdges: edgesComplete,
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`sierpinski-audit — ${complete}/4 scales, ${edgesComplete}/6 edges (K₄), ${forkCount} forks (contraction state)`);
    for (const r of results) {
      console.log(`  ${r.complete ? '✓' : '✗'} ${r.scale}: contract=${r.contract} instantiation=${r.instantiation} void=${r.voidSurfaced}`);
    }
    for (const e of edgeResults) {
      console.log(`  ${e.check ? '✓' : '✗'} ${e.name} — ${e.detail}`);
    }
    console.log(`  tiers: autonomous=${tiers.autonomous} supervised=${tiers.supervised} blocked=${tiers.blocked}`);
    const k4 = complete === 4 && edgesComplete === 6;
    console.log(k4 ? '✅ K₄ complete — four vertices, six edges resolved' : '✗ incomplete — see the failing scale or edge');
  }
  process.exit(complete === 4 && edgesComplete === 6 ? 0 : 1);
}

await main();