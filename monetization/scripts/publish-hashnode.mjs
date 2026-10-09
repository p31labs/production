#!/usr/bin/env node
/**
 * publish-hashnode — publish Article #2 (hash-chained revenue) to Hashnode.
 * Resolves the publication by host + tag IDs by slug at runtime, then calls
 * the publishPost mutation.
 * Dry-run: node scripts/publish-hashnode.mjs --dry
 * Live:    node scripts/publish-hashnode.mjs
 */
import { readFileSync } from 'node:fs';

const DRY = process.argv.includes('--dry');
const GQL = 'https://api.hashnode.com/graphql';

const env = Object.fromEntries(
  readFileSync('/home/p31/.p31/.env', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

async function gql(query, variables = {}, authToken = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = authToken;
  const res = await fetch(GQL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; }
  if (!res.ok) throw new Error(`Hashnode HTTP ${res.status}: ${text.slice(0, 200)}`);
  if (data.errors) throw new Error(`Hashnode errors: ${JSON.stringify(data.errors).slice(0, 300)}`);
  return data.data;
}

// Resolve publication + tags.
const pub = await gql(`query { publication(host: "p31.hashnode.dev") { id title } }`);
const publicationId = pub?.publication?.id;
if (!publicationId) {
  console.error('❌ Could not resolve publication p31.hashnode.dev');
  process.exit(1);
}

const tagSlugs = ['blockchain', 'web-development', 'ai'];
const tagIds = [];
for (const slug of tagSlugs) {
  try {
    const r = await gql(`query($s: String!) { tag(slug: $s) { _id name slug } }`, { s: slug });
    if (r?.tag?._id) tagIds.push(r.tag._id);
  } catch (e) {
    console.log(`  (tag ${slug} unresolved: ${String(e.message).slice(0, 60)})`);
  }
}
console.log(`Publication: ${pub.publication.title} (${publicationId})`);
console.log(`Tags resolved: ${tagIds.length}/3`);

// Extract Article #2 body.
const md = readFileSync('/home/p31/production/monetization/docs/CONTENT-ARTICLES.md', 'utf8');
const m = md.match(/### Article 2[\s\S]*?(?=\n### Article 3)/);
if (!m) { console.error('Article 2 section not found'); process.exit(1); }
const body = m[0]
  .replace(/^### Article 2[^\n]*\n/, '')
  .replace(/^- \*\*(Title|Primary platform|Target keyword|Tags):\*\*.*\n/gm, '')
  .replace(/\n---\s*$/, '')
  .trim();

if (DRY) {
  console.log('\nTitle: Hash-chained revenue: why your agent payments need provenance');
  console.log('Body length:', body.length, 'chars');
  console.log('Tag IDs:', tagIds);
  process.exit(0);
}

const input = {
  title: 'Hash-chained revenue: why your agent payments need provenance',
  contentMarkdown: body,
  publicationId,
  tags: tagIds.map((_id) => ({ _id })),
};

// Auth: try raw API key first, then Bearer.
const mutation = `mutation Publish($input: PublishPostInput!) {
  publishPost(input: $input) { post { url } }
}`;

let result;
for (const auth of [env.HASHNODE_TOKEN, `Bearer ${env.HASHNODE_TOKEN}`]) {
  try {
    const data = await gql(mutation, { input }, auth);
    result = data;
    break;
  } catch (e) {
    console.log(`  auth variant failed: ${String(e.message).slice(0, 120)}`);
  }
}
if (!result?.publishPost?.post?.url) {
  console.error('❌ Publish did not return a URL (see errors above).');
  process.exit(1);
}
console.log(`✅ Published: ${result.publishPost.post.url}`);