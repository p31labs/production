#!/usr/bin/env node
/**
 * publish-article — publish an article from CONTENT-ARTICLES.md to Dev.to.
 * Usage: node scripts/publish-article.mjs [--article 1] [--dry]
 * Reads the article's Title + Tags bullets from the section; strips metadata.
 */
import { readFileSync } from 'node:fs';

const DRY = process.argv.includes('--dry');
const N = process.argv.includes('--article')
  ? Number(process.argv[process.argv.indexOf('--article') + 1] || 1)
  : 1;
const MD = '/home/p31/production/monetization/docs/CONTENT-ARTICLES.md';

const env = Object.fromEntries(
  readFileSync('/home/p31/.p31/.env', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const md = readFileSync(MD, 'utf8');
const next = N + 1;
const m = md.match(new RegExp(`### Article ${N}[\\s\\S]*?(?=\\n### Article ${next}|$)`));
if (!m) {
  console.error(`Article ${N} section not found in CONTENT-ARTICLES.md`);
  process.exit(1);
}

const section = m[0];
const title = (section.match(/\*\*Title:\*\*\s*(.+)/)?.[1] ?? `Article ${N}`).trim();
const tags = (section.match(/\*\*Tags:\*\*\s*(.+)/)?.[1] ?? '')
  .replace(/`/g, '')
  .split(',')
  .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
  .filter(Boolean)
  .slice(0, 4);

const body = section
  .replace(/^### Article \d+[^\n]*\n/, '')
  .replace(/^- \*\*(Title|Primary platform|Target keyword|Tags):\*\*.*\n/gm, '')
  .replace(/\n---\s*$/, '')
  .trim();

if (!body) {
  console.error(`Article ${N} body is empty after extraction.`);
  process.exit(1);
}

if (DRY) {
  console.log(`Article ${N} — "${title}"`);
  console.log('Tags:', tags.join(', ') || '(none)');
  console.log('Body length:', body.length, 'chars');
  console.log('\n--- first 1200 chars ---\n');
  console.log(body.slice(0, 1200));
  process.exit(0);
}

const payload = {
  article: { title, body_markdown: body, published: true, tags: tags.length ? tags : ['webdev'] },
};

const res = await fetch('https://dev.to/api/articles', {
  method: 'POST',
  headers: { 'api-key': env.DEVTO_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
if (!res.ok) {
  console.error(`❌ Dev.to ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
const d = await res.json();
console.log(`✅ Published: ${d.url}`);