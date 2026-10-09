/**
 * yield-vault — LOVE harvest stats stub. Returns the client `LoveStats`
 * shape so the monetization portal renders non-error.
 */
export interface Env {
  DB?: D1Database;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export default {
  async fetch(): Promise<Response> {
    return json({
      total_love: '0',
      transaction_count: 0,
      last_harvest: null,
    });
  },
};