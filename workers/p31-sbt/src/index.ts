interface Env {
  SBT_DB: D1Database;
  LOOM_ANCHOR_URL: string;
  SBT_ISSUE_TOKEN?: string;
}

interface SbtRow {
  id: string;
  type: string;
  did: string;
  metadata: string | null;
  tetrahedron_hash: string | null;
  prev_hash: string | null;
  hash: string | null;
  loom_anchor_hash: string | null;
  anchored: number;
  issued_at: number;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Issue-Token",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseBody(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

// Loom anchoring is best-effort; track the last attempt so /anchor/status and
// the /issue response can surface retry/degraded states without blocking issuance.
const ANCHOR_FAILURE_THRESHOLD = 3;
let lastAnchorAttempt: number | null = null;
let lastAnchorOk: boolean | null = null;
let anchorFailures = 0;

function truncate(msg: string, max = 80): string {
  return msg.length > max ? `${msg.slice(0, max - 1)}…` : msg;
}

function anchorStatus(): "ok" | "retrying" | "degraded" | "skipped" {
  if (anchorFailures === 0) return "ok";
  return anchorFailures >= ANCHOR_FAILURE_THRESHOLD ? "degraded" : "retrying";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (path === "/health" && request.method === "GET") {
      return jsonResponse({ status: "ok", service: "p31-sbt" });
    }

    if (path === "/issue" && request.method === "POST") {
      const token = request.headers.get("X-Issue-Token");
      if (!env.SBT_ISSUE_TOKEN || token !== env.SBT_ISSUE_TOKEN) {
        return jsonResponse({ ok: false, error: "unauthorized" }, 401);
      }

      const body = parseBody(await request.text());
      if (!body) {
        return jsonResponse({ ok: false, error: "invalid JSON body" }, 400);
      }

      const did = typeof body.did === "string" && body.did.length > 0 ? body.did : null;
      const type = typeof body.type === "string" && body.type.length > 0 ? body.type : null;
      const metadata =
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : {};

      if (!did || !type) {
        return jsonResponse({ ok: false, error: "did and type are required strings" }, 400);
      }

      const id = `sbt-${crypto.randomUUID()}`;
      const issuedAt = Date.now();

      const prevResult = await env.SBT_DB.prepare(
        "SELECT hash FROM sbt_registry WHERE did = ? ORDER BY issued_at DESC LIMIT 1"
      )
        .bind(did)
        .first<{ hash: string | null }>();
      const prevHash = prevResult?.hash || "";

      const metadataJson = JSON.stringify(metadata);
      const hash = await sha256Hex(`${prevHash}|${did}|${type}|${issuedAt}|${metadataJson}`);

      await env.SBT_DB.prepare(
        `INSERT INTO sbt_registry (id, type, did, metadata, prev_hash, hash, anchored, issued_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
      )
        .bind(id, type, did, metadataJson, prevHash, hash, issuedAt)
        .run();

      let anchored = 0;
      let loomAnchorHash: string | null = null;
      let anchorError: string | null = null;

      if (env.LOOM_ANCHOR_URL) {
        lastAnchorAttempt = Date.now();
        try {
          const countResult = await env.SBT_DB.prepare(
            "SELECT COUNT(*) as count FROM sbt_registry WHERE did = ?"
          )
            .bind(did)
            .first<{ count: number }>();
          const blockNumber = (countResult?.count ?? 0) + 1;

          const anchorRes = await fetch(env.LOOM_ANCHOR_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              did,
              block: {
                blockNumber,
                prevHash: prevHash || "",
                hash,
                metadata: { ...metadata, type, id },
              },
            }),
          });

          if (anchorRes.ok) {
            const anchorBody = (await anchorRes
              .json()
              .catch(() => null)) as { block?: { hash?: string } } | null;
            const blockHash = anchorBody?.block?.hash;
            if (blockHash) {
              anchored = 1;
              loomAnchorHash = blockHash;
              lastAnchorOk = true;
              anchorFailures = 0;
              await env.SBT_DB.prepare(
                "UPDATE sbt_registry SET anchored = 1, loom_anchor_hash = ? WHERE id = ?"
              )
                .bind(loomAnchorHash, id)
                .run();
            } else {
              lastAnchorOk = false;
              anchorFailures += 1;
              anchorError = "loom anchor response missing block.hash";
            }
          } else {
            lastAnchorOk = false;
            anchorFailures += 1;
            anchorError = `loom anchor HTTP ${anchorRes.status}`;
          }
        } catch (err) {
          lastAnchorOk = false;
          anchorFailures += 1;
          anchorError =
            err instanceof Error ? err.message : "loom anchor request failed";
        }
      }

      const response: Record<string, unknown> = {
        ok: true,
        id,
        type,
        did,
        hash,
        prev_hash: prevHash,
        anchored,
        loom_anchor_hash: loomAnchorHash,
        anchor_status: env.LOOM_ANCHOR_URL ? anchorStatus() : "skipped",
      };
      if (anchorError) {
        response.anchor_error = truncate(anchorError);
      }
      return jsonResponse(response);
    }

    if (path === "/anchor/status" && request.method === "GET") {
      return jsonResponse({
        anchor_url: env.LOOM_ANCHOR_URL,
        reachable: lastAnchorOk === true,
        failures: anchorFailures,
        last_attempt: lastAnchorAttempt
          ? new Date(lastAnchorAttempt).toISOString()
          : null,
      });
    }

    if (path === "/list" && request.method === "GET") {
      const did = url.searchParams.get("did");
      if (!did) {
        return jsonResponse({ error: "did query param required" }, 400);
      }
      const rows = await env.SBT_DB.prepare(
        "SELECT * FROM sbt_registry WHERE did = ? ORDER BY issued_at DESC"
      )
        .bind(did)
        .all<SbtRow>();
      return jsonResponse({ sbts: rows.results });
    }

    if (path === "/verify" && request.method === "GET") {
      const hash = url.searchParams.get("hash");
      if (!hash) {
        return jsonResponse({ error: "hash query param required" }, 400);
      }
      const sbt = await env.SBT_DB.prepare(
        "SELECT * FROM sbt_registry WHERE hash = ? LIMIT 1"
      )
        .bind(hash)
        .first<SbtRow>();
      return jsonResponse({
        found: sbt !== null,
        sbt: sbt ?? null,
        anchored: sbt ? sbt.anchored === 1 : false,
      });
    }

    return jsonResponse({ error: "not found" }, 404);
  },
};