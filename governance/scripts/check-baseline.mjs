#!/usr/bin/env node
// node check-baseline.mjs --file r.json --field score --baselines b.json --key slop --record
// node check-baseline.mjs --file r.json --field score --baselines b.json --key slop          (value must be <= baseline)
// node check-baseline.mjs --file r.json --field passed --baselines b.json --key tests --min  (value must be >= baseline)
import fs from 'node:fs';
const a = process.argv.slice(2);
const get = (k, d) => { const i = a.indexOf(`--${k}`); return i < 0 ? d : a[i + 1]; };
const has = (k) => a.includes(`--${k}`);
const file = get('file'), bfile = get('baselines'), key = get('key'), field = get('field', 'score');
if (!file || !bfile || !key) { console.error('missing --file/--baselines/--key'); process.exit(2); }
const dig = (o, p) => p.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
const val = dig(JSON.parse(fs.readFileSync(file, 'utf8')), field);
if (typeof val !== 'number') { console.error(`field "${field}" is not numeric in ${file}`); process.exit(2); }
const base = fs.existsSync(bfile) ? JSON.parse(fs.readFileSync(bfile, 'utf8')) : {};
if (has('record')) { base[key] = val; fs.writeFileSync(bfile, JSON.stringify(base, null, 2) + '\n'); console.log(`recorded ${key}=${val}`); process.exit(0); }
if (!(key in base)) { console.error(`no baseline for "${key}"; run with --record on the pre-change tree`); process.exit(2); }
const ok = has('min') ? val >= base[key] : val <= base[key];
console.log(`${key}: current=${val} baseline=${base[key]} (${has('min') ? 'min' : 'max'}) -> ${ok ? 'OK' : 'REGRESSION'}`);
process.exit(ok ? 0 : 1);
