#!/usr/bin/env node
/**
 * gen-catalog.mjs — generate the design-system catalog docs page.
 *
 * Reads packages/canon/tokens/tokens.dtc.json (foundations) and
 * packages/design-core/registry.json (components), embeds them into a
 * self-contained HTML page with foundations / components / search. This page is
 * a CONSUMER of the design system — if it can't render the tokens or the
 * registry, that is a finding, not a docs bug.
 *
 * Run: node portals/design/gen-catalog.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const dtcg = JSON.parse(readFileSync(resolve(root, 'packages', 'canon', 'tokens', 'tokens.dtc.json'), 'utf8'));
const registry = JSON.parse(readFileSync(resolve(root, 'packages', 'design-core', 'registry.json'), 'utf8'));

// Flatten the p31 subtree to dotted paths (collapse dual-form by dash key).
const tokens = [];
(function walk(node, path) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && v.$value === undefined) walk(v, [...path, k]);
    else {
      const dotted = [...path, k].join('.');
      const flat = dotted.split('.').join('-');
      if (!tokens.some((t) => t.flat === flat)) {
        tokens.push({ dotted, flat, value: v.$value, type: v.$type, deprecated: v.$deprecated });
      }
    }
  }
})(dtcg.p31, ['p31']);

const payload = JSON.stringify({ tokens, components: registry.items });

const renderer = `
const DATA = ${payload};
const tokEl = document.getElementById('tokgrid');
const compEl = document.getElementById('compgrid');
function fmt(v){ if(v == null) return '-'; if(typeof v === 'object') return JSON.stringify(v); return String(v); }
function tokCard(t){
  var dep = t.deprecated ? ' <span style="color:#e48a80">deprecated</span>' : '';
  return '<div class="card"><div class="tok">' + t.dotted + '</div><div class="tok v">' + fmt(t.value) + '</div><div class="tok">' + (t.type||'') + dep + '</div></div>';
}
function compCard(c){
  var vc = (c.variants && c.variants.length) ? ' <span class="badge">' + c.variants.length + ' variants</span>' : '';
  return '<div class="card"><h3>' + c.name + '</h3><div class="cls">' + c.cssClass + '</div><div class="desc">' + (c.description||'') + '</div><span class="badge tier-' + c.tier + '">' + c.tier + '</span> <span class="badge">' + c.status + '</span>' + vc + '</div>';
}
function renderTokens(list){ tokEl.innerHTML = list.slice(0,200).map(tokCard).join(''); }
function renderComps(list){ compEl.innerHTML = list.map(compCard).join(''); }
renderTokens(DATA.tokens); renderComps(DATA.components);
document.getElementById('q').addEventListener('input', function(e){
  var q = e.target.value.toLowerCase();
  var toks = DATA.tokens.filter(function(t){ return t.dotted.toLowerCase().indexOf(q) !== -1 || fmt(t.value).toLowerCase().indexOf(q) !== -1; });
  var comps = DATA.components.filter(function(c){
    return c.name.toLowerCase().indexOf(q) !== -1
      || (c.description||'').toLowerCase().indexOf(q) !== -1
      || (c.cssClass||'').toLowerCase().indexOf(q) !== -1
      || (c.tokens||[]).some(function(t){ return t.toLowerCase().indexOf(q) !== -1; });
  });
  renderTokens(toks); renderComps(comps);
});
`;

const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>P31 Design System Catalog</title>
<style>
:root{--bg:#0A0A0F;--fg:#F5F5F7;--dim:rgba(245,245,247,.55);--accent:#00F0FF;--card:rgba(255,255,255,.04);--border:rgba(255,255,255,.08)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-family:system-ui,sans-serif}
header{padding:24px 32px;border-bottom:1px solid var(--border);position:sticky;top:0;background:rgba(10,10,15,.85);backdrop-filter:blur(8px)}
h1{font-size:20px;margin:0}h1 span{color:var(--accent)}
input{width:100%;padding:12px 16px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--fg);font-size:15px;margin-top:16px}
input:focus{outline:2px solid var(--accent);border-color:transparent}
main{max-width:1100px;margin:0 auto;padding:32px}
section{margin-bottom:40px}h2{font-size:16px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px}
.card h3{margin:0 0 4px;font-size:15px}.cls{font-family:monospace;color:var(--accent);font-size:12px}
.desc{color:var(--dim);font-size:13px;margin:8px 0}.badge{font-size:11px;padding:2px 8px;border-radius:99px;border:1px solid var(--border)}
.tier-core{color:#7ed99b;border-color:#7ed99b}.tier-experimental{color:#e2b74b;border-color:#e2b74b}.tier-deprecated{color:#e48a80;border-color:#e48a80}
.tok{font-family:monospace;font-size:12px;color:var(--dim);margin:2px 0}.tok.v{color:var(--fg)}
</style></head>
<body>
<header><h1>P31 <span>Design System</span> Catalog</h1><input id="q" placeholder="Search tokens and components — e.g. accent, glass, Button, radius"></header>
<main>
<section id="foundations"><h2>Foundations · ${tokens.length} tokens</h2><div class="grid" id="tokgrid"></div></section>
<section id="components"><h2>Components · ${registry.items.length}</h2><div class="grid" id="compgrid"></div></section>
</main>
<script>${renderer}</script></body></html>`;

writeFileSync(resolve(here, 'catalog.html'), html);
console.log(`wrote portals/design/catalog.html — ${tokens.length} tokens, ${registry.items.length} components`);