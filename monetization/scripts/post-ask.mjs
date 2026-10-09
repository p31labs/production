#!/usr/bin/env node
/**
 * post-ask — one-shot social post to Bluesky (+ Twitter best-effort).
 * Dry-run: node scripts/post-ask.mjs --dry
 * Live:    node scripts/post-ask.mjs
 */
import { readFileSync } from 'node:fs';
import { createHmac, randomBytes } from 'node:crypto';

const DRY = process.argv.includes('--dry');
const ENV = '/home/p31/.p31/.env';

const env = Object.fromEntries(
  readFileSync(ENV, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const TEXT = `A complete x402 capital machine is live on Base mainnet (11 MCP tools, hash-chained revenue) but can't afford the $0.02 first settle — every "instant" bootstrap is down or gives internal credits, not USDC. Spare a nickel? 0xe60BeF846eCed560aE276822F3FBe40700aCa221. First-settle credit yours.`;

console.log(`\n=== draft (${TEXT.length} chars) ===\n${TEXT}\n`);
if (TEXT.length > 300) {
  console.error(`❌ Draft is ${TEXT.length} chars — Bluesky allows 300. Trim before posting.`);
  process.exit(1);
}
if (DRY) {
  console.log('--dry: not posting');
  process.exit(0);
}

// ── Bluesky ────────────────────────────────────────────────────────────────
async function postBluesky() {
  const sess = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: env.BLUESKY_HANDLE, password: env.BLUESKY_APP_PASSWORD }),
  });
  if (!sess.ok) throw new Error(`Bluesky login ${sess.status}: ${(await sess.text()).slice(0, 200)}`);
  const { accessJwt, did } = await sess.json();
  const rec = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessJwt}` },
    body: JSON.stringify({
      repo: did,
      collection: 'app.bsky.feed.post',
      record: { $type: 'app.bsky.feed.post', text: TEXT, createdAt: new Date().toISOString() },
    }),
  });
  if (!rec.ok) throw new Error(`Bluesky post ${rec.status}: ${(await rec.text()).slice(0, 200)}`);
  const { uri } = await rec.json();
  const rkey = uri.split('/').pop();
  return `https://bsky.app/profile/${env.BLUESKY_HANDLE}/post/${rkey}`;
}

// ── Twitter v2 (OAuth 1.0a user context) — best effort ────────────────────
function pct(s) {
  return encodeURIComponent(s).replace(/[!*'()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}
function oauthSign(method, url, params, consumerSecret, tokenSecret) {
  const sorted = Object.keys(params).sort().map((k) => `${pct(k)}=${pct(params[k])}`).join('&');
  const base = `${method}&${pct(url)}&${pct(sorted)}`;
  const key = `${pct(consumerSecret)}&${pct(tokenSecret)}`;
  return createHmac('sha1', key).update(base).digest('base64');
}
async function postTwitter() {
  const url = 'https://api.twitter.com/2/tweets';
  const oauth = {
    oauth_consumer_key: env.TWITTER_API_KEY,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: env.TWITTER_ACCESS_TOKEN,
    oauth_version: '1.0',
  };
  oauth.oauth_signature = oauthSign('POST', url, oauth, env.TWITTER_API_SECRET, env.TWITTER_ACCESS_TOKEN_SECRET);
  const header = 'OAuth ' + Object.keys(oauth).sort().map((k) => `${pct(k)}="${pct(oauth[k])}"`).join(', ');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: header, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: TEXT.slice(0, 280) }),
  });
  if (!res.ok) throw new Error(`Twitter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = await res.json();
  return `https://x.com/i/web/status/${d.data.id}`;
}

// ── Run ────────────────────────────────────────────────────────────────────
const results = {};
for (const [name, fn] of [['bluesky', postBluesky], ['twitter', postTwitter]]) {
  try {
    results[name] = await fn();
    console.log(`✅ ${name}: ${results[name]}`);
  } catch (e) {
    results[name] = `FAILED: ${e.message}`;
    console.log(`❌ ${name}: ${e.message}`);
  }
}
console.log('\nSummary:', JSON.stringify(results, null, 2));