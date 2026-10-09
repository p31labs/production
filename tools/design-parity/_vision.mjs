import { readFileSync } from 'node:fs';
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CF_API_TOKEN;
if (!accountId || !token) { console.error('env missing'); process.exit(2); }
const MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';
const PROMPT = `You are a strict UI inspector. Look at this screenshot of a web application. Answer in STRICT JSON only with these exact keys:
{
  "main_content_visible": true or false,
  "main_content_description": "one sentence: what is visible in the main content area (right of sidebar, below topbar)",
  "background": "subtle translucent dome | opaque full-page dome | solid | other",
  "background_occludes_content": true or false,
  "visible_cards": true or false,
  "route_name_guess": "what page this looks like",
  "notes": "any anomaly"
}
The main content area is the region right of the sidebar, below the topbar. Focus on what a user would see there.`;

async function ask(path, route) {
  const b64 = readFileSync(path).toString('base64');
  const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [
      { role: 'system', content: PROMPT },
      { role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
        { type: 'text', text: `Route: ${route}` },
      ]},
    ]}),
    signal: AbortSignal.timeout(90000),
  });
  const j = await resp.json();
  const out = j.result?.response ?? JSON.stringify(j).slice(0,200);
  try { return JSON.parse(out); } catch { return { raw: String(out).slice(0,300) }; }
}

for (const route of ['_', '_marketplace', '_catalog', '_tokens']) {
  console.log(`\n=== ${route} ===`);
  const ref = await ask(`/tmp/opencode/diag/ref${route}.png`, route);
  const cur = await ask(`/tmp/opencode/diag/cur${route}.png`, route);
  console.log('REF:', JSON.stringify(ref));
  console.log('CUR:', JSON.stringify(cur));
}
