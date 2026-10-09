#!/usr/bin/env node
/**
 * fetch-substack.mjs — the RSS bridge.
 *
 * Pulls https://thegeodesicself.substack.com/feed into the local blog content
 * collection (src/content/blog/<slug>.md) + writes the manifest
 * (src/data/substack-manifest.json). Run before `astro build`.
 *
 * Idempotent: rewrites only changed slugs (compares file content), never
 * touches untouched posts. The feed is a CONVENIENCE, not a dependency — a
 * network failure must not break the build, so wire it as `|| true` in
 * prebuild; the committed .md files carry the last good copy.
 *
 * Register note: imported prose is the author's own voice and stays verbatim.
 * verify-content-consistency.mjs scans src/content/ + src/pages/blog/ and
 * flags any Register-1 AI-trigger word as ADVISORY — imported posts are
 * reviewed, not rewritten.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(here, '..');
const FEED = 'https://thegeodesicself.substack.com/feed';
const OUT = path.join(APP_ROOT, 'src', 'content', 'blog');
const MANIFEST = path.join(APP_ROOT, 'src', 'data', 'substack-manifest.json');

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

/** Strip Substack chrome (subscribe widgets, buttons) but keep the prose. */
const strip = (html) =>
  html
    .replace(/<div class="subscription-widget-wrap[^>]*>[\s\S]*?<\/div>/g, '')
    .replace(/<p class="button-wrapper"[\s\S]*?<\/p>/g, '')
    .replace(/\sdata-(?:component-name|attribution|native|testid)="[^"]*"/g, '');

/** Sanitize imported HTML (Gap 6 — XSS/accident defense): remove script,
 *  iframe, object, embed, form, and any on* event handler attribute. The
 *  source is trusted (the operator's own Substack), but sanitize anyway so a
 *  future feed change can't inject executable content into the blog. */
function sanitize(html) {
  return html
    .replace(/<\s*(script|iframe|object|embed|form|meta|link|style|base)[\s\S]*?(?:>|<\/\s*\1\s*>)/gi, '')
    .replace(/\son[a-z]+\s*=\s*("|')[^"']*\1/gi, '')
    .replace(/javascript:/gi, '');
}

function parseItems(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  return items
    .map((it) => {
      const pick = (re) => (it.match(re) || [])[1] ?? '';
      return {
        title: decode(pick(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)),
        link: pick(/<link>([\s\S]*?)<\/link>/),
        pubDate: pick(/<pubDate>([\s\S]*?)<\/pubDate>/),
        guid: pick(/<guid[^>]*>([\s\S]*?)<\/guid>/),
        body: sanitize(strip(decode(pick(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)))),
        excerpt: decode(pick(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)),
      };
    })
    .filter((p) => p.body && !/^coming soon$/i.test(p.title.trim()));
}

function slugOf(link) {
  const m = link.match(/\/p\/([^/?#]+)/);
  return (m
    ? m[1]
    : createHash('sha256').update(link).digest('hex').slice(0, 12)
  )
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-');
}

const yamlStr = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

async function main() {
  const res = await fetch(FEED, { headers: { 'user-agent': 'p31-canon/1.0 (+https://p31ca.org)' } });
  if (!res.ok) throw new Error(`feed ${res.status}`);
  const posts = parseItems(await res.text());

  await mkdir(OUT, { recursive: true });
  const manifest = [];

  for (const p of posts) {
    const slug = slugOf(p.link);
    const date = new Date(p.pubDate).toISOString().slice(0, 10);
    const fm = [
      '---',
      `title: ${yamlStr(p.title)}`,
      // No `slug` field — Astro's glob loader derives it from the filename and
      // reserves the name. The filename IS the slug.
      // Quoted so YAML parses it as a string, not a Date — Astro's content
      // schema (z.string()) rejects an unquoted ISO date and drops the entry.
      `date: ${yamlStr(date)}`,
      `author: "trimtab.signal"`,
      `excerpt: ${yamlStr(p.excerpt)}`,
      `source: "substack"`,
      `sourceUrl: ${yamlStr(p.link)}`,
      `canonical: "/blog/${slug}"`,
      `guid: ${yamlStr(p.guid)}`,
      '---',
      '',
      p.body,
      '',
    ].join('\n');

    const prev = await readFile(path.join(OUT, `${slug}.md`), 'utf8').catch(() => null);
    if (prev !== fm) await writeFile(path.join(OUT, `${slug}.md`), fm, 'utf8');

    manifest.push({ slug, title: p.title, date, url: `/blog/${slug}`, sourceUrl: p.link });
  }

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`substack bridge: ${manifest.length} post(s) → ${OUT}`);
  for (const m of manifest) console.log(`  ${m.date}  /blog/${m.slug}`);
}

main().catch((err) => {
  console.error('substack bridge failed:', err.message);
  process.exit(1);
});