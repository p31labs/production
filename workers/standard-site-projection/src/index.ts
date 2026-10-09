/**
 * standard-site-projection — AT Protocol / Standard.site projection worker.
 *
 * Exposes P31's blog + forum as `site.standard.document` records — the shared
 * Lexicon for long-form content in the ATmosphere (Bluesky). This is the
 * federation path that runs on Cloudflare Workers: the same edge-native stack
 * as the rest of P31, no separate runtime.
 *
 *   GET /site.standard.document/:slug   → the record (JSON, Bluesky-compatible)
 *   GET /records                        → list all published records
 *   POST /publish                       → re-pull blog RSS + write a record
 *   GET /.well-known/atproto/feed.json  → atproto feed discovery
 *
 * The record shape mirrors what Standard.site apps (Leaflet, pckt.blog,
 * Offprint) agreed on: title, content (markdown), created/modified, and an
 * optional link out to the canonical HTTP URL. When a Cirrus PDS is deployed,
 * a `PDS_ORIGIN` + `PDS_DID` env pair makes this worker also WRITE the record
 * to the PDS (the reference implementation is the Discourse → Standard.site
 * plugin). Without PDS_ORIGIN, it serves the read-only projection — which is
 * already enough for Bluesky's Standard.site card unfurls.
 */

export interface Env {
  /** The blog's RSS feed — where this worker pulls posts from. */
  BLOG_RSS: string;
  /** Optional Cirrus PDS origin + DID. When both are set, /publish writes the
   *  record to the PDS; otherwise this worker is the read-only projection. */
  PDS_ORIGIN?: string;
  PDS_DID?: string;
  /** An admin token so /publish is not open to the world. */
  PUBLISH_TOKEN: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });

/** A single Standard.site document record. */
export interface StandardDocument {
  title: string;
  content: string;            // markdown
  created: string;            // ISO
  modified: string;           // ISO
  url?: string;               // canonical link out (blog page)
  slug: string;
  author: { did: string; handle: string };
}

/** Parse the blog RSS feed into Standard.site documents. */
async function pullBlog(feedUrl: string): Promise<StandardDocument[]> {
  const res = await fetch(feedUrl, { headers: { 'user-agent': 'p31-standard-site/1.0 (+https://p31ca.org)' } });
  if (!res.ok) throw new Error(`rss ${res.status}`);
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  return items.map((it) => {
    const pick = (re: RegExp) => (it.match(re) ?? [])[1] ?? '';
    const link = pick(/<link>([\s\S]*?)<\/link>/);
    const slug = link.match(/\/blog\/([^/]+)/)?.[1] ?? link;
    return {
      title: pick(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/),
      content: pick(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/),
      created: new Date(pick(/<pubDate>([\s\S]*?)<\/pubDate>/)).toISOString(),
      modified: new Date(pick(/<pubDate>([\s\S]*?)<\/pubDate>/)).toISOString(),
      url: link,
      slug,
      author: { did: 'did:web:p31ca.org', handle: 'p31ca.org' },
    };
  });
}

/** Minimal CID-like deterministic hash for the record URI (not ATProto's real
 *  CID — a stable id for the read projection; the PDS assigns the real rkey). */
function recordRkey(slug: string): string {
  let h = 2166136261 >>> 0;
  for (const c of slug) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return `3l${(h >>> 0).toString(16).padStart(8, '0')}`;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;
    const method = req.method;

    // ── Health ────────────────────────────────────────────────────────
    if (p === '/health') return json({ ok: true, do: 'standard-site-projection' });

    // ── atproto feed discovery (RFC 9080-style) ────────────────────────
    if (p === '/.well-known/atproto/feed.json') {
      return json({
        contexts: [`did:${env.PDS_DID ?? 'web:p31ca.org'}`],
        feed: [{ uri: `at://${env.PDS_DID ?? 'did:web:p31ca.org'}/site.standard.document/*`, name: 'P31 blog' }],
      });
    }

    // ── Standard.site publication verification (Phase G) ───────────────
    // Returns the AT-URI of this site's publication — one half of the
    // verification loop. The blog pages emit the matching <link> tag (the
    // other half). Without both, Bluesky won't render rich article cards.
    if (p === '/.well-known/site.standard.publication') {
      return json({
        uri: `at://${env.PDS_DID ?? 'did:web:p31ca.org'}/site.standard.publication/self`,
        context: `https://${url.hostname}/`,
        name: 'P31 Labs — Blog',
      });
    }

    // ── List published records ────────────────────────────────────────
    if (p === '/records' && method === 'GET') {
      const docs = await pullBlog(env.BLOG_RSS);
      return json({
        records: docs.map((d) => ({ uri: `at://${d.author.did}/site.standard.document/${recordRkey(d.slug)}`, ...d })),
      });
    }

    // ── Single record ─────────────────────────────────────────────────
    const recMatch = p.match(/^\/site\.standard\.document\/([^/]+)$/);
    if (recMatch && method === 'GET') {
      const slug = recMatch[1];
      const docs = await pullBlog(env.BLOG_RSS);
      const doc = docs.find((d) => d.slug === slug || recordRkey(d.slug) === slug);
      if (!doc) return json({ error: 'not found' }, 404);
      return json(doc);
    }

    // ── Publish (write records to the PDS when configured) ────────────
    if (p === '/publish' && method === 'POST') {
      const auth = req.headers.get('authorization');
      if (auth !== `Bearer ${env.PUBLISH_TOKEN}`) return json({ error: 'forbidden' }, 403);
      const docs = await pullBlog(env.BLOG_RSS);
      if (env.PDS_ORIGIN && env.PDS_DID) {
        // Write each record to the Cirrus PDS. This is the ATProto "post a
        // record" path: PUT {pds}/xrpc/com.atproto.repo.putRecord with the
        // standard.site document as the record value.
        const written: string[] = [];
        for (const d of docs) {
          const rkey = recordRkey(d.slug);
          const res = await fetch(`${env.PDS_ORIGIN}/xrpc/com.atproto.repo.putRecord`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${env.PUBLISH_TOKEN}` },
            body: JSON.stringify({
              repo: env.PDS_DID,
              collection: 'site.standard.document',
              rkey,
              record: {
                $type: 'site.standard.document',
                title: d.title,
                content: d.content,
                created: d.created,
                modified: d.modified,
                url: d.url,
              },
            }),
          });
          if (res.ok) written.push(rkey);
        }
        return json({ ok: true, written, total: docs.length });
      }
      // Read-only mode: the projection is served; nothing is written.
      return json({ ok: true, projected: docs.length, pds: null, note: 'PDS_ORIGIN unset — read-only projection' });
    }

    return json({ error: 'not found' }, 404);
  },
};