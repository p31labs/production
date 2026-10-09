#!/usr/bin/env node
/**
 * frontmatter.mjs — the V1 CAPTURE header/footer contract.
 *
 * Every significant file carries a P31-HEADER (id, type, component, status,
 * retention, created, owner) and may carry a P31-FOOTER (checksum, related).
 * The header is written at CAPTURE; the footer is written at SHAPE (when the
 * retention policy is applied).
 *
 * This script VALIDATES that authored files with a header are well-formed,
 * and INJECTS a header into new authored files that lack one (when the name
 * matches the convention). It is the V1 sensor.
 *
 * Usage:
 *   node scripts/frontmatter.mjs --check [dir]   validate headers
 *   node scripts/frontmatter.mjs --inject <file> add a header if missing
 */
import { readdirSync, readFileSync, writeFileSync, lstatSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const VALID_TYPES = ['spec', 'plan', 'runbook', 'state', 'inbox', 'history', 'archive', 'snapshot', 'research', 'fix-plan'];
const VALID_STATUS = ['live', 'reference', 'archived', 'stale', 'open', 'resolved'];
const VALID_RETENTION = ['keep-forever', 'archive-90d', 'delete-30d', 'stale'];

function parseHeader(content) {
  const m = content.match(/<!-- P31-HEADER\n([\s\S]*?)-->/);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

function validate(fields, file) {
  const problems = [];
  if (!fields.id) problems.push('id missing');
  if (!fields.type || !VALID_TYPES.includes(fields.type)) problems.push(`type invalid: ${fields.type}`);
  if (!fields.status || !VALID_STATUS.includes(fields.status)) problems.push(`status invalid: ${fields.status}`);
  if (!fields.retention || !VALID_RETENTION.includes(fields.retention)) problems.push(`retention invalid: ${fields.retention}`);
  if (!fields.created) problems.push('created missing');
  if (!fields.owner) problems.push('owner missing');
  if (problems.length) {
    console.error(`${file}: header problems — ${problems.join(', ')}`);
    return false;
  }
  return true;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = lstatSync(p);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'vendor') continue;
      walk(p, out);
    } else if (/\.(md|json|yaml|yml)$/.test(p)) {
      out.push(p);
    }
  }
  return out;
}

const args = process.argv.slice(2);
const mode = args[0];

if (mode === '--inject' && args[1]) {
  const file = args[1];
  const content = readFileSync(file, 'utf8');
  if (!content.includes('P31-HEADER')) {
    const name = basename(file);
    const header = `<!-- P31-HEADER\nid: p31_${name.replace(/\./g, '_').replace(/-/g, '_')}\ntype: spec\ncomponent: workspace\nstatus: live\nretention: keep-forever\ncreated: ${new Date().toISOString().slice(0, 19)}Z\nowner: will\n-->\n\n`;
    writeFileSync(file, header + content);
    console.log(`injected header into ${file}`);
  } else {
    console.log(`${file} already has a header`);
  }
  process.exit(0);
}

if (mode === '--check') {
  const dir = args[1] ? join(ROOT, args[1]) : ROOT;
  const files = walk(dir);
  let violations = 0;
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    if (!content.includes('P31-HEADER')) continue; // files without headers are the namecheck's job
    const fields = parseHeader(content);
    if (!fields) {
      console.error(`${file}: malformed P31-HEADER`);
      violations++;
      continue;
    }
    if (!validate(fields, file)) violations++;
  }
  if (violations > 0) {
    console.error(`\n${violations} header violations. Fix before commit.`);
    process.exit(1);
  }
  console.log(`frontmatter: clean (${files.length} files checked)`);
  process.exit(0);
}

console.error('usage: node scripts/frontmatter.mjs --check [dir] | --inject <file>');
process.exit(1);