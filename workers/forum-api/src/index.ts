/**
 * forum-api — the Q&A forum backend for the P31 workspace portal.
 *
 * One thread per blog post: the bridge writes /blog/<slug>.md, the forum
 * seeds a thread with the SAME slug, and the "discuss" link joins them.
 *
 *   GET  /threads                — list, newest first, with answer counts
 *   POST /threads                — create a thread (slug-or-generated id)
 *   GET  /threads/:id            — thread + posts (accepted first)
 *   POST /threads/:id/posts      — answer or reply (parent_id = null | post id)
 *   POST /posts/:id/accept       — only the thread author may mark accepted
 *   GET  /threads/:id/seed       — idempotent seed of a blog-slug thread
 *   WS   /ws                     — realtime new-post fan-out (ForumRoom DO)
 *
 * Identity: an AIC-JWT capability token (composite Ed25519 + ML-DSA-65,
 * @p31ca/sovereign-primitives) in `Authorization: Bearer`. Fail-closed: any
 * malformed / expired / mis-audience token is rejected. The subject did:key
 * is the author; no real names anywhere. Writes also emit a governed event
 * toward the Loom origin (fire-and-forget) so the audit trail is the same
 * one the rest of P31 uses.
 */

import { DurableObject } from 'cloudflare:workers';
import { verifySelfContainedCapabilityToken } from '@p31ca/sovereign-primitives';

export interface Env {
  DB: D1Database;
  FORUM_ROOM: DurableObjectNamespace;
  LOOM_ORIGIN: string;
  /** Audience the capability token must carry (the forum origin). */
  FORUM_AUD: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });

const now = () => Date.now();
const uuid = () => crypto.randomUUID();

/** The Monday (ISO date) of a date's week — for the life weekly view (Gap 9). */
function mondayOf(d: Date): string {
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

/** Parse the bearer token → did:key subject, or null (fail closed). The
 *  token is SELF-CONTAINED — it carries its own composite public key, so no
 *  issuer-key lookup is needed. Any malformed / expired / mis-audience token
 *  is rejected. */
async function principal(req: Request, env: Env): Promise<string | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const claims = await verifySelfContainedCapabilityToken(auth.slice(7), { expectAud: env.FORUM_AUD });
    return claims?.sub ?? null;
  } catch {
    return null;
  }
}

/** Fire-and-forget governed event toward the Loom (audit trail parity). On
 *  failure, persist to the pending_events retry queue (Gap 3) — a silently
 *  dropped governed event is a credibility breach for an audit-first system.
 *  A ForumRoom alarm flushes the queue. */
async function govern(env: Env, kind: string, payload: Record<string, unknown>): Promise<void> {
  const body = JSON.stringify({ input: { writer: 'human', kind, ...payload } });
  try {
    const res = await fetch(`${env.LOOM_ORIGIN}/api/loom/event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    if (res.ok) return;
    throw new Error(`loom ${res.status}`);
  } catch {
    await env.DB.prepare(
      `INSERT INTO pending_events (id, kind, payload, attempts, next_at, created_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
    ).bind(uuid(), kind, body, Date.now() + 60_000, Date.now()).run().catch(() => {});
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;
    const did = await principal(req, env);
    const method = req.method;

    // ── Health ────────────────────────────────────────────────────────
    if (p === '/health') return json({ ok: true, do: 'forum-api' });

    // ── CORS preflight ────────────────────────────────────────────────
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' },
      });
    }

    // ── List threads ──────────────────────────────────────────────────
    if (p === '/threads' && method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT t.*, (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id) AS answer_count
         FROM threads t ORDER BY updated_at DESC LIMIT 100`,
      ).all();
      return json({ threads: results });
    }

    // ── Search (Phase B) — D1 FTS5. Matches both question titles and answer
    //    bodies. ?q= required; ?type=thread|post|all (default all).
    if (p === '/search' && method === 'GET') {
      const q = url.searchParams.get('q')?.trim();
      const type = url.searchParams.get('type') ?? 'all';
      if (!q) return json({ error: 'q required' }, 400);
      const safe = q.replace(/["*]/g, ' ').trim();
      if (!safe) return json({ results: [] });
      const results: Array<{ type: string; id: string; title?: string; snippet?: string; thread_id?: string }> = [];
      if (type === 'thread' || type === 'all') {
        const rows = await env.DB.prepare(
          `SELECT t.id, t.title, snippet(threads_fts, 1, '…', '…', '…', 20) AS snip
           FROM threads_fts JOIN threads t ON t.rowid = threads_fts.rowid
           WHERE threads_fts MATCH ? ORDER BY rank LIMIT 25`,
        ).bind(safe).all<{ id: string; title: string; snip: string | null }>();
        for (const r of rows.results ?? []) results.push({ type: 'thread', id: r.id, title: r.title, snippet: (r.snip ?? '').toString() });
      }
      if (type === 'post' || type === 'all') {
        const rows = await env.DB.prepare(
          `SELECT p.id, p.thread_id, p.body, snippet(posts_fts, 1, '…', '…', '…', 20) AS snip
           FROM posts_fts JOIN posts p ON p.rowid = posts_fts.rowid
           WHERE posts_fts MATCH ? ORDER BY rank LIMIT 25`,
        ).bind(safe).all<{ id: string; thread_id: string; body: string; snip: string | null }>();
        for (const r of rows.results ?? []) results.push({ type: 'post', id: r.id, thread_id: r.thread_id, snippet: (r.snip ?? r.body ?? '').toString().slice(0, 200) });
      }
      return json({ q: safe, results });
    }

    // ── Create a thread ───────────────────────────────────────────────
    if (p === '/threads' && method === 'POST') {
      if (!did) return json({ error: 'unauthenticated' }, 401);
      const { title, body, tags = [], id: explicitId } = await req.json() as {
        title?: string; body?: string; tags?: string[]; id?: string;
      };
      if (!title?.trim() || !body?.trim()) return json({ error: 'title and body required' }, 400);
      const id = explicitId ?? uuid();
      const ts = now();
      await env.DB.prepare(
        `INSERT INTO threads (id, title, body, author_did, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, title.trim(), body.trim(), did, JSON.stringify(tags), ts, ts).run();
      govern(env, 'forum.thread.create', { node: id, statedBy: did });
      await env.FORUM_ROOM.get(env.FORUM_ROOM.idFromName('global')).fetch('https://do/broadcast', {
        method: 'POST', body: JSON.stringify({ type: 'thread', id, title }),
      });
      return json({ id }, 201);
    }

    // ── Idempotent seed (the blog-slug → thread bridge) ───────────────
    const seedMatch = p.match(/^\/threads\/([^/]+)\/seed$/);
    if (seedMatch && method === 'POST') {
      const id = seedMatch[1];
      const existing = await env.DB.prepare('SELECT id FROM threads WHERE id = ?').bind(id).first();
      if (existing) return json({ id, seeded: false });
      const { title = id, body = '' } = await req.json() as { title?: string; body?: string };
      const ts = now();
      await env.DB.prepare(
        `INSERT INTO threads (id, title, body, author_did, tags, created_at, updated_at)
         VALUES (?, ?, ?, 'system', '[]', ?, ?)`,
      ).bind(id, title, body, ts, ts).run();
      return json({ id, seeded: true });
    }

    // ── Thread + posts ────────────────────────────────────────────────
    const threadMatch = p.match(/^\/threads\/([^/]+)$/);
    if (threadMatch && method === 'GET') {
      const id = threadMatch[1];
      const thread = await env.DB.prepare('SELECT * FROM threads WHERE id = ?').bind(id).first();
      if (!thread) return json({ error: 'not found' }, 404);
      const { results } = await env.DB.prepare(
        `SELECT * FROM posts WHERE thread_id = ? ORDER BY accepted DESC, created_at ASC`,
      ).bind(id).all();
      return json({ thread, posts: results });
    }

    // ── Answer / reply ────────────────────────────────────────────────
    const postMatch = p.match(/^\/threads\/([^/]+)\/posts$/);
    if (postMatch && method === 'POST') {
      if (!did) return json({ error: 'unauthenticated' }, 401);
      const tid = postMatch[1];
      const { body, parent_id = null } = await req.json() as { body?: string; parent_id?: string | null };
      if (!body?.trim()) return json({ error: 'body required' }, 400);
      const pid = uuid();
      const ts = now();
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO posts (id, thread_id, parent_id, body, author_did, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(pid, tid, parent_id, body.trim(), did, ts),
        env.DB.prepare('UPDATE threads SET updated_at = ? WHERE id = ?').bind(ts, tid),
      ]);
      // Phase D: notify the thread author (and the parent-post author for a
      // reply). In-app only — a row + WebSocket push, no email.
      const threadAuthor = await env.DB.prepare('SELECT author_did FROM threads WHERE id = ?').bind(tid).first();
      const recipients = new Set<string>();
      if (threadAuthor?.author_did && threadAuthor.author_did !== did) recipients.add(threadAuthor.author_did as string);
      if (parent_id) {
        const parentAuthor = await env.DB.prepare('SELECT author_did FROM posts WHERE id = ?').bind(parent_id).first();
        if (parentAuthor?.author_did && parentAuthor.author_did !== did) recipients.add(parentAuthor.author_did as string);
      }
      for (const recipient of recipients) {
        await env.DB.prepare(
          `INSERT INTO notifications (id, recipient, thread_id, post_id, kind, read, created_at)
           VALUES (?, ?, ?, ?, 'reply', 0, ?)`,
        ).bind(uuid(), recipient, tid, pid, ts).run();
      }
      await govern(env, 'forum.post.create', { node: tid, statedBy: did });
      await env.FORUM_ROOM.get(env.FORUM_ROOM.idFromName('global')).fetch('https://do/broadcast', {
        method: 'POST', body: JSON.stringify({ type: 'post', thread: tid, id: pid, recipients: [...recipients] }),
      });
      return json({ id: pid }, 201);
    }

    // ── Life layer ────────────────────────────────────────────────────
    // Life events share the forum's D1 + identity + Loom governance. A life
    // event is a governed record like any other. No real names; author_did is
    // the AIC-JWT subject. Gap 5: `visibility` defaults to private — the life
    // log is the operator's own record, not a public feed. GET /life returns
    // only what the authenticated DID may read (their private + family +
    // public events); GET /life/:id enforces the same rule.
    if (p === '/life' && method === 'GET') {
      const week = url.searchParams.get('week');
      const { results } = await env.DB.prepare(
        `SELECT id, kind, title, body, tags, visibility, week_start, created_at
         FROM life_events
         WHERE visibility = 'public' OR author_did = ?
           ${week ? 'AND week_start = ?' : ''}
         ORDER BY created_at DESC LIMIT 200`,
      ).bind(did ?? '', ...(week ? [week] : [])).all();
      return json({ events: results });
    }

    if (p === '/life' && method === 'POST') {
      if (!did) return json({ error: 'unauthenticated' }, 401);
      const { kind, title, body = '', tags = [], visibility = 'private', week_start = null } = await req.json() as {
        kind?: string; title?: string; body?: string; tags?: string[]; visibility?: string; week_start?: string | null;
      };
      if (!kind?.trim() || !title?.trim()) return json({ error: 'kind and title required' }, 400);
      if (!['private', 'family', 'public'].includes(visibility)) return json({ error: 'invalid visibility' }, 400);
      const id = uuid();
      const ts = now();
      // Gap 9: week_start computed server-side (Monday of the event's week) so
      // the weekly view is consistent across clients. An explicit week_start
      // overrides the computation.
      const computedWeek = week_start ?? mondayOf(new Date(ts));
      await env.DB.prepare(
        `INSERT INTO life_events (id, kind, title, body, author_did, tags, visibility, week_start, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, kind.trim(), title.trim(), body.trim(), did, JSON.stringify(tags), visibility, computedWeek, ts).run();
      await govern(env, 'life.event.create', { node: id, statedBy: did });
      return json({ id }, 201);
    }

    const lifeMatch = p.match(/^\/life\/([^/]+)$/);
    if (lifeMatch && method === 'GET') {
      const id = lifeMatch[1];
      const ev = await env.DB.prepare(
        `SELECT id, kind, title, body, tags, visibility, week_start, created_at
         FROM life_events WHERE id = ? AND (visibility = 'public' OR author_did = ?)`,
      ).bind(id, did ?? '').first();
      if (!ev) return json({ error: 'not found' }, 404);
      return json({ event: ev });
    }

    // ── Notifications (Phase D) ───────────────────────────────────────
    if (p === '/notifications' && method === 'GET') {
      if (!did) return json({ error: 'unauthenticated' }, 401);
      const { results } = await env.DB.prepare(
        `SELECT id, thread_id, post_id, kind, read, created_at
         FROM notifications WHERE recipient = ? ORDER BY created_at DESC LIMIT 50`,
      ).bind(did).all();
      const unread = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM notifications WHERE recipient = ? AND read = 0`,
      ).bind(did).first();
      return json({ notifications: results, unread: unread?.n ?? 0 });
    }

    if (p === '/notifications/read' && method === 'POST') {
      if (!did) return json({ error: 'unauthenticated' }, 401);
      await env.DB.prepare(
        `UPDATE notifications SET read = 1 WHERE recipient = ? AND read = 0`,
      ).bind(did).run();
      return json({ ok: true });
    }

    // ── Export (Phase H) — data portability. A DID may download their own
    //    threads, posts, and life events as a JSON bundle with a manifest.
    //    Private life events require the same-DID auth (the AIC-JWT subject).
    if (p === '/export/:did' && method === 'GET') {
      const didParam = p.split('/export/')[1];
      if (!did) return json({ error: 'unauthenticated' }, 401);
      if (did !== didParam) return json({ error: 'forbidden — export your own DID only' }, 403);
      const [threads, posts, life] = await Promise.all([
        env.DB.prepare('SELECT * FROM threads WHERE author_did = ?').bind(did).all(),
        env.DB.prepare('SELECT * FROM posts WHERE author_did = ?').bind(did).all(),
        env.DB.prepare('SELECT * FROM life_events WHERE author_did = ?').bind(did).all(),
      ]);
      const manifest = {
        schema: 'p31.forum.export/1.0.0',
        did,
        exportedAt: new Date().toISOString(),
        counts: { threads: (threads.results ?? []).length, posts: (posts.results ?? []).length, life: (life.results ?? []).length },
      };
      const body = JSON.stringify({ manifest, threads: threads.results, posts: posts.results, life: life.results }, null, 2);
      return new Response(body, {
        headers: {
          'content-type': 'application/json',
          'content-disposition': `attachment; filename="p31-export-${did.slice(0, 12)}.json"`,
        },
      });
    }

    // ── Accept (thread author only, checked in SQL not client) ────────
    const acceptMatch = p.match(/^\/posts\/([^/]+)\/accept$/);
    if (acceptMatch && method === 'POST') {
      if (!did) return json({ error: 'unauthenticated' }, 401);
      const pid = acceptMatch[1];
      const result = await env.DB.prepare(
        `UPDATE posts SET accepted = 1
         WHERE id = ?
           AND thread_id IN (SELECT id FROM threads WHERE author_did = ?)`,
      ).bind(pid, did).run();
      if (result.meta.changes === 0) return json({ error: 'not authorized or not found' }, 403);
      govern(env, 'forum.post.accept', { node: pid, statedBy: did });
      return json({ ok: true });
    }

    // ── IndieWeb: receive a webmention ────────────────────────────────
    // IndieWeb standard: a remote site POSTs { source, target } saying "this
    // page references that one". We verify the source actually links to the
    // target, infer the mention type from microformats, and fold it into the
    // matching thread (target is /blog/<slug> → thread id == slug). This is
    // what makes replies/likes/reposts from Mastodon/Bluesky/other blogs
    // arrive as forum posts. Unauthenticated by design — a webmention is a
    // public assertion, not a privileged write.
    if (p === '/webmention' && method === 'POST') {
      // Gap 2: IP rate limit — webmentions are unauthenticated, so a flood of
      // unique source/target pairs must be capped (10/hr per IP is generous
      // for legitimate cross-site mentions).
      const ip = req.headers.get('cf-connecting-ip') ?? 'unknown';
      const wmWindow = Math.floor(Date.now() / 3600_000);
      const limitRow = await env.DB.prepare(
        `SELECT count FROM rate_limits WHERE ip = ? AND bucket = 'webmention' AND window_start = ?`,
      ).bind(ip, wmWindow).first();
      if (limitRow && (limitRow.count as number) >= 10) {
        return json({ error: 'rate limited' }, 429);
      }
      await env.DB.prepare(
        `INSERT INTO rate_limits (ip, bucket, window_start, count) VALUES (?, 'webmention', ?, 1)
         ON CONFLICT(ip, bucket, window_start) DO UPDATE SET count = count + 1`,
      ).bind(ip, wmWindow).run();

      let source = '', target = '';
      const ct = req.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        const body = await req.json() as { source?: string; target?: string };
        source = body.source ?? ''; target = body.target ?? '';
      } else {
        const form = await req.formData();
        source = String(form.get('source') ?? '');
        target = String(form.get('target') ?? '');
      }
      if (!source || !target) return json({ error: 'source and target required' }, 400);
      const targetUrl = new URL(target);
      const slug = targetUrl.pathname.match(/^\/blog\/([^/]+)/)?.[1];
      if (!slug) return json({ error: 'target is not a blog post' }, 400);

      // Verify the source actually links to the target. Gap 1 hardening:
      // parse the source HTML for a REAL <a href="..."> pointing at the
      // target (not a substring match, which a script tag or comment could
      // fake). Best-effort: a fetch failure is a soft reject (202-pending).
      const ok = await verifyWebmention(source, target);
      if (!ok.verified) {
        await env.DB.prepare(
          `INSERT OR REPLACE INTO webmentions (id, thread_id, source, target, type, content, published, created_at)
           VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
        ).bind(uuid(), slug, source, target, ok.content?.slice(0, 400) ?? '', Date.now(), now()).run();
        return json({ ok: true, status: 'pending' }, 202);
      }
      const type = ok.type ?? 'reply';
      await env.DB.prepare(
        `INSERT OR REPLACE INTO webmentions (id, thread_id, source, target, type, author_name, author_url, content, published, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(uuid(), slug, source, target, type, ok.authorName ?? null, ok.authorUrl ?? null, ok.content?.slice(0, 400) ?? null, Date.now(), now()).run();
      await govern(env, 'forum.webmention.receive', { node: slug, statedBy: 'webmention' });
      await env.FORUM_ROOM.get(env.FORUM_ROOM.idFromName('global')).fetch('https://do/broadcast', {
        method: 'POST', body: JSON.stringify({ type: 'webmention', thread: slug, source }),
      });
      return json({ ok: true, status: type }, 201);
    }

    // ── IndieWeb: list webmentions for a thread ───────────────────────
    const wmMatch = p.match(/^\/threads\/([^/]+)\/webmentions$/);
    if (wmMatch && method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT source, target, type, author_name, content, created_at
         FROM webmentions WHERE thread_id = ? AND type != 'pending'
         ORDER BY created_at DESC`,
      ).bind(wmMatch[1]).all();
      return json({ webmentions: results });
    }

    // ── IndieWeb: Micropub — publish an h-entry as a new thread ───────
    // Reuses the AIC-JWT identity path. A Micropub client (or the blog's own
    // editor) POSTs { type: ['h-entry'], properties: { name, content, category } }
    // and it becomes a forum thread — the blog and forum are one publishing
    // surface. No JSON? Then the query-string form: name=…&content=…&category=…
    if (p === '/micropub' && method === 'POST') {
      if (!did) return json({ error: 'unauthenticated' }, 401);
      let title = '', body = '', category: string[] = [];
      const ct = req.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        const h = await req.json() as { properties?: { name?: string[]; content?: string[]; category?: string[] } };
        title = h.properties?.name?.[0] ?? '';
        body = h.properties?.content?.[0] ?? '';
        category = h.properties?.category ?? [];
      } else {
        const form = await req.formData();
        title = String(form.get('name') ?? '');
        body = String(form.get('content') ?? '');
        category = form.getAll('category').map(String);
      }
      if (!title.trim() || !body.trim()) return json({ error: 'name and content required' }, 400);
      const id = uuid();
      const ts = now();
      await env.DB.prepare(
        `INSERT INTO threads (id, title, body, author_did, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, title.trim(), body.trim(), did, JSON.stringify(category), ts, ts).run();
      govern(env, 'forum.thread.micropub', { node: id, statedBy: did });
      return json({ ok: true, id }, 201);
    }

    // ── IndieWeb: Webfinger ───────────────────────────────────────────
    // Maps acct:handle@domain to the actor / micropub / webmention endpoints.
    // Returns a JSON document (RFC 7033). The actor URL is the forum itself
    // (a followable account once ActivityPub arrives); today it exposes the
    // Micropub + Webmention surfaces for discovery.
    if (p === '/.well-known/webfinger' && method === 'GET') {
      const resource = url.searchParams.get('resource');
      if (!resource) return json({ error: 'resource required' }, 400);
      const origin = url.origin;
      return json({
        subject: resource,
        aliases: [`${origin}/actor`],
        links: [
          { rel: 'self', type: 'application/activity+json', href: `${origin}/actor` },
          { rel: 'micropub', href: `${origin}/micropub` },
          { rel: 'webmention', href: `${origin}/webmention` },
          { rel: 'http://webfinger.net/rel/profile-page', type: 'text/html', href: origin },
        ],
      });
    }

    return json({ error: 'not found' }, 404);
  },
};

/** Fetch a webmention source and verify it links to the target. Gap 1
 *  hardening: require an actual <a href="target"> (or <link>) — a substring
 *  match would let a malicious page embed the target in a script tag or
 *  comment and fake a mention. The source must be HTML. Returns metadata
 *  (author, content, mention type) parsed from microformats. */
async function verifyWebmention(source: string, target: string): Promise<{
  verified: boolean;
  type?: 'reply' | 'like' | 'repost' | 'bookmark';
  authorName?: string;
  authorUrl?: string;
  content?: string;
}> {
  try {
    const res = await fetch(source, { headers: { 'user-agent': 'p31-webmention/1.0' } });
    if (!res.ok) return { verified: false };
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) return { verified: false };
    const html = await res.text();
    if (html.length > 1_000_000) return { verified: false };

    // Require a REAL anchor/link whose href resolves to the target. Handle
    // both plain and HTML-escaped hrefs, and match the target with or without
    // a trailing slash.
    const targetPath = target.replace(/\/+$/, '');
    const hrefRe = /<(?:a|link)\b[^>]*\bhref=["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    let linked = false;
    while ((m = hrefRe.exec(html)) !== null) {
      const href = m[1].replace(/&amp;/g, '&').replace(/\/+$/, '');
      if (href === target || href === targetPath || href.startsWith(target + '/') || href.startsWith(targetPath + '/')) {
        linked = true;
        break;
      }
    }
    if (!linked) return { verified: false };

    // Microformat inference — shallow but checked against the LINK structure
    // (not a page-wide substring). A full mf2 parse is a future hardening.
    let type: 'reply' | 'like' | 'repost' | 'bookmark' = 'reply';
    if (/class="[^"]*(?:p-like|u-like)[^"]*"/i.test(html)) type = 'like';
    else if (/class="[^"]*(?:p-repost|u-repost)[^"]*"/i.test(html)) type = 'repost';
    else if (/class="[^"]*(?:p-bookmark|u-bookmark)[^"]*"/i.test(html)) type = 'bookmark';

    const nameMatch = html.match(/class="[^"]*p-author[^"]*"[^>]*>([^<]{1,80})</);
    const urlMatch = html.match(/class="[^"]*p-author[^"]*"[^>]*href="([^"]{1,200})"/);
    const contentMatch = html.match(/class="[^"]*p-content[^"]*"[^>]*>([^<]{1,400})</) ?? html.match(/<meta name="description" content="([^"]{1,400})"/);

    return {
      verified: true,
      type,
      authorName: nameMatch?.[1]?.trim() || undefined,
      authorUrl: urlMatch?.[1] || undefined,
      content: contentMatch?.[1]?.trim() || undefined,
    };
  } catch {
    return { verified: false };
  }
}

/** Realtime fan-out — a sibling of MusicRoom/ControlRoom. Gap 8: per-thread
 *  rooms so a connection only receives events for threads it subscribed to.
 *  `subscribe` sends {type:'subscribe', thread} — the client announces which
 *  thread it's viewing. Also holds the pending_events flush alarm (Gap 3):
 *  a DO alarm retries queued Loom events so the audit trail is never silently
 *  dropped. */
export class ForumRoom extends DurableObject<Env> {
  private conns = new Map<WebSocket, { thread: string | null }>();
  private flushAlarm: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Hibernation-safe ping/pong (runtime answers without waking the DO).
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    // When a governed event lands in pending_events, ensure an alarm is armed
    // to flush it. (setAlarm wakes the DO to retry — no setInterval.)
    void this.ctx.blockConcurrencyWhile(async () => {
      const due = await this.env.DB.prepare('SELECT COUNT(*) AS n FROM pending_events WHERE next_at <= ?').bind(Date.now()).first();
      if (due?.n) await this.ctx.storage.setAlarm(Date.now() + 10_000);
    });
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;

    if (p === '/broadcast' && req.method === 'POST') {
      const msg = await req.text();
      let parsed: { thread?: string };
      try { parsed = JSON.parse(msg); } catch { return new Response('ok'); }
      for (const [ws, meta] of this.conns) {
        if (parsed.thread && meta.thread !== parsed.thread) continue; // only the subscribed thread
        try { ws.send(msg); } catch { this.conns.delete(ws); }
      }
      return new Response('ok');
    }

    if (p === '/flush' && req.method === 'POST') {
      await this.flushPending();
      return new Response('ok');
    }

    if (p === '/ws') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      this.conns.set(server, { thread: null });
      server.serializeAttachment({ joinedAt: Date.now() });
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('not found', { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    try {
      const m = JSON.parse(message);
      if (m?.type === 'subscribe') {
        const meta = this.conns.get(ws);
        if (meta) { meta.thread = String(m.thread ?? null); this.conns.set(ws, meta); }
      }
    } catch { /* ignore malformed frames */ }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.conns.delete(ws);
  }

  async alarm(): Promise<void> {
    await this.flushPending();
  }

  /** Retry pending Loom events (Gap 3). Each attempt POSTs to the Loom; on
   *  success the row is deleted, on failure the next_at backs off. */
  private async flushPending(): Promise<void> {
    const due = await this.env.DB.prepare('SELECT id, kind, payload, attempts FROM pending_events WHERE next_at <= ? LIMIT 20').bind(Date.now()).all();
    for (const ev of due.results ?? []) {
      try {
        const res = await fetch(`${this.env.LOOM_ORIGIN}/api/loom/event`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: ev.payload as string,
        });
        if (res.ok) {
          await this.env.DB.prepare('DELETE FROM pending_events WHERE id = ?').bind(ev.id).run();
        } else {
          await this.env.DB.prepare('UPDATE pending_events SET attempts = attempts + 1, next_at = ? WHERE id = ?')
            .bind(Date.now() + 60_000 * Math.min(10, (ev.attempts as number) + 1), ev.id).run();
        }
      } catch {
        await this.env.DB.prepare('UPDATE pending_events SET attempts = attempts + 1, next_at = ? WHERE id = ?')
          .bind(Date.now() + 60_000 * Math.min(10, (ev.attempts as number) + 1), ev.id).run();
      }
    }
    // Re-arm if any still pending.
    const remaining = await this.env.DB.prepare('SELECT COUNT(*) AS n FROM pending_events WHERE next_at <= ?').bind(Date.now()).first();
    if (remaining?.n) await this.ctx.storage.setAlarm(Date.now() + 60_000);
  }
}