/**
 * exportDoc.ts — the self-contained doc generation system.
 *
 * Produces a SINGLE, portable HTML document from a forged artifact. The file
 * is fully self-contained: it inlines the app's compiled CSS (read from the
 * live document.styleSheets at export time) and the rendered component tree
 * as static markup — no CDN links, no external references, opens offline.
 *
 * The design portal is the visual reference (canon data-brand/data-theme,
 * OKLCH tokens); this export is the artifact's portable documentation —
 * "a forged surface becomes a document."
 *
 * Self-contained rule: the export must render legibly even when the live
 * stylesheets can't be read (cross-origin or empty). When gatherCss() returns
 * nothing, a minimal warm fallback (the family theme's seven essential tokens
 * as literals) is inlined instead — never an unstyled page.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { TreeRenderer } from '../renderer/TreeRenderer';
import type { TreeNode } from '../renderer/registry';

interface ExportInput {
  title: string;
  artifact: TreeNode | null;
  gate: { status: string; collapsedAxes?: string[]; degradedAxes?: string[] } | null;
  nextGate: Array<{ axis: string; action: string; severity: string }>;
  logs?: { groundedFacts?: number; gaps?: number; candidates?: number; admissible?: number; survivors?: number };
}

/** Gather the compiled CSS from the live stylesheets (self-contained). */
function gatherCss(): string {
  const seen = new Set<string>();
  let css = '';
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        const text = rule.cssText;
        if (text && !seen.has(text)) { seen.add(text); css += text + '\n'; }
      }
    } catch { /* cross-origin sheet — skip */ }
  }
  return css;
}

/** Minimal warm fallback — the family theme's essential tokens as literals.
 *  Guarantees a legible export even when the live stylesheets can't be read. */
const FALLBACK_CSS = `
  :root {
    color-scheme: dark;
    --p31-bg: oklch(17% 0.03 55);
    --p31-surface: oklch(23% 0.04 55);
    --p31-surface2: oklch(29% 0.045 55);
    --p31-accent: oklch(80% 0.16 75);
    --p31-accent-green: oklch(72% 0.16 145);
    --p31-accent-red: oklch(68% 0.16 25);
    --p31-text-primary: oklch(97% 0.02 70);
    --p31-text-secondary: oklch(82% 0.03 70);
    --p31-text-tertiary: oklch(60% 0.03 65);
    --p31-radius-lg: 20px;
    --p31-radius-full: 9999px;
    --p31-font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  }
  body { margin: 0; padding: 0; background: var(--p31-bg); color: var(--p31-text-primary); font-family: var(--p31-font-sans); }
  .doc-wrap { padding: 1.5rem; }
  .doc-head { display: flex; align-items: baseline; gap: 0.75rem; border-bottom: 1px solid var(--p31-text-tertiary); padding-bottom: 0.5rem; margin-bottom: 1rem; }
  .doc-title { font-weight: 700; font-size: 1.1rem; }
  .doc-sub { color: var(--p31-text-secondary); font-size: 0.85rem; }
  .doc-gate { display: inline-block; padding: 0.3rem 0.6rem; border-radius: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .doc-logs { color: var(--p31-text-tertiary); font-size: 0.78rem; margin-top: 0.5rem; }
  .doc-forest { max-width: 720px; }
  .doc-forest ul { color: var(--p31-text-secondary); font-size: 0.85rem; }
  .doc-empty { color: var(--p31-text-secondary); font-size: 0.95rem; line-height: 1.55; padding: 1rem; border: 1px solid var(--p31-text-tertiary); border-radius: var(--p31-radius-lg); }
  .doc-meta { color: var(--p31-text-secondary); font-size: 0.85rem; }
  .doc-meta strong { color: var(--p31-text-primary); }
`;

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const GATE_TONE: Record<string, string> = {
  pass: '#7ed99b', incomplete: '#e2b74b', 'needs-revision': '#e48a80', 'needs-review': '#e2b74b', unknown: '#a8a29a',
};

/** Build the standalone self-contained HTML document. Always renders legibly:
 *  the rendered tree when an artifact exists, a warm summary record otherwise. */
export function buildDocHtml(input: ExportInput): string {
  const css = gatherCss() || FALLBACK_CSS;
  const treeMarkup = input.artifact
    ? renderToStaticMarkup(React.createElement(TreeRenderer, { node: input.artifact }))
    : `<div class="doc-empty">No surface was produced this time. Here is the record of what the brief asked for and what the compiler reported.</div>`;
  const gate = input.gate;
  const gateColor = GATE_TONE[gate?.status ?? 'unknown'] ?? '#a8a29a';
  const gateLabel = gate?.status ?? 'n/a';

  const nextGateList = input.nextGate?.length
    ? `<ul>${input.nextGate.map((n) => `<li><strong>${esc(n.axis)}</strong> — ${esc(n.action)} <em>(${esc(n.severity)})</em></li>`).join('')}</ul>`
    : gate?.status === 'pass' ? '<p>All four axes report.</p>' : '';

  const logs = input.logs
    ? `<p class="doc-logs">facts ${input.logs.groundedFacts ?? 0} · gaps ${input.logs.gaps ?? 0} · candidates ${input.logs.candidates ?? 0} · admissible ${input.logs.admissible ?? 0} · survivors ${input.logs.survivors ?? 0}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" data-brand="p31ca" data-theme="family" data-spoons="3">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(input.title)} — P31 UI Forge</title>
<style>${css}</style>
</head>
<body>
<div class="doc-wrap">
  <div class="doc-head">
    <span class="doc-title">${esc(input.title)}</span>
    <span class="doc-sub">P31 UI Forge · generated doc</span>
    <span class="doc-gate" style="background:${gateColor}22;color:${gateColor}">GATE: ${esc(gateLabel)}</span>
  </div>
  ${gate?.collapsedAxes?.length ? `<p class="doc-logs">collapsed: ${esc(gate.collapsedAxes.join(', '))}</p>` : ''}
  ${gate?.degradedAxes?.length ? `<p class="doc-logs">degraded: ${esc(gate.degradedAxes.join(', '))}</p>` : ''}
  <div class="doc-forest" data-surface="forge">${treeMarkup}</div>
  <div class="doc-forest">${nextGateList}</div>
  ${logs}
</div>
</body>
</html>`;
}