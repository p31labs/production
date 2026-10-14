// Lane D scaffolding probe — explore canon token tree (read-only, no output artifact)
import fs from 'node:fs';

const tokens = JSON.parse(fs.readFileSync('/home/p31/production/packages/canon/tokens/tokens.dtc.json', 'utf8'));

function walk(node, path, out) {
  for (const [k, v] of Object.entries(node)) {
    if (k === '$schema' || k === '$extensions') continue;
    const p = path ? `${path}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && ('$type' in v || '$value' in v)) {
      out.push({ path: p, type: v.$type, value: v.$value, deprecated: !!v.$deprecated });
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      walk(v, p, out);
    }
  }
}
const out = [];
walk(tokens, '', out);
console.log('total tokens:', out.length);
console.log('color tokens:', out.filter(t => t.type === 'color').length);
console.log('top-level groups under p31:', Object.keys(tokens.p31).join(', '));

const colors = out.filter(t => t.type === 'color');
const groups = {};
for (const c of colors) {
  const seg = c.path.split('.').slice(1, 2)[0] || '(root)';
  (groups[seg] ||= []).push(c);
}
for (const [g, list] of Object.entries(groups)) {
  console.log(`\n== ${g} (${list.length}) ==`);
  for (const c of list) {
    console.log(`  ${c.path}${c.deprecated ? ' [DEPRECATED]' : ''}`);
  }
}