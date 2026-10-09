# API Reference — `/vision` and `/models`

Base URL: `https://phos-ai-proxy.trimtab-signal.workers.dev`
Verified live: 2026-10-02. This is the measurement tetrahedron's HTTP surface.

## `POST /vision`

Runs a vision review against a screenshot. Two modes: `critique` (default,
anti-slop rubric scores) and `detect` (Moondream element location).

### Request

```json
{
  "image": "<base64 PNG or data: URL — required>",
  "model": "llama-3.2-11b",     // optional, key from /models catalog
  "mode": "critique",           // optional, "critique" | "detect"
  "prompt": "<custom user prompt>",  // optional; falls back to DEFAULT_RUBRIC on failure
  "rubric": "<custom system rubric>", // optional
  "median": 3,                  // optional, median-of-N scoring
  "noCache": false,             // optional, bypass the content cache
  "target": "<object to locate>"     // detect mode only
}
```

### Response — critique mode (HTTP 200)

```json
{
  "layout_novelty": 4,
  "visual_identity_distinctiveness": 3,
  "component_pattern_novelty": 2,
  "evidence": { "layout_novelty": "…", "visual_identity_distinctiveness": "…", "component_pattern_novelty": "…" },
  "verdict": "fail",            // "pass" | "fail" | "unmeasured"
  "critique": "…",
  "mean": 3.0,                  // average of the three rubric scores
  "runs": [3, 2, 4],            // median-of-N individual means
  "model": "@cf/meta/llama-3.2-11b-vision-instruct",
  "modelKey": "llama-3.2-11b",
  "modelLabel": "Llama 3.2 11B Vision",
  "degraded": true              // present when a fallback model/rubric was used
}
```

### Neutral failure (still HTTP 200, not 502)

When every model in the fallback chain fails, the endpoint returns a neutral
score so the gate can distinguish "platform down" from "measured and
collapsed":

```json
{ "error": "all vision models failed", "mean": 5, "verdict": "unmeasured", "degraded": true }
```

The `X-P31-Degraded: true` response header is set whenever a fallback was
used (mirrors Cloudflare AI Gateway's `cf-aig-step`).

### Errors

| HTTP | Body | Meaning |
|---|---|---|
| 400 | `{"error":"Missing image"}` | No `image` field |
| 400 | `{"error":"Invalid JSON"}` | Malformed request body |

### Reliability contract

- **Fallback chain**: requested model → gemma-4-26b → qwen-3-27b →
  DEFAULT_RUBRIC. A custom `prompt`/`rubric` failure degrades to the default.
- **Validate-before-cache**: a result is only cached when `mean` is a number
  in `[0,10]` and `verdict` is present.
- **Cache key**: `sha256(image|rubric|model)` — a default-rubric request and a
  custom-rubric request for the same image never collide.

## `GET /models`

Returns the routable model catalog. Verified live:

```json
{
  "critique": {
    "default": "llama-3.2-11b",
    "options": [
      { "key": "gemma-4-26b",  "id": "@cf/google/gemma-4-26b-a4b-it",           "label": "Gemma 4 26B A4B",        "quality": "high",    "context": 256000 },
      { "key": "llama-3.2-11b","id": "@cf/meta/llama-3.2-11b-vision-instruct",  "label": "Llama 3.2 11B Vision",   "quality": "standard", "context": 128000 },
      { "key": "qwen-3-27b",   "id": "@cf/qwen/qwen3.8-27b",                    "label": "Qwen 3.8 27B",           "quality": "premium",  "context": 262144 }
    ]
  },
  "detect": {
    "default": "moondream-3.1",
    "options": [ { "key": "moondream-3.1", "id": "@cf/moondream/moondream3.1-9B-A2B", "label": "Moondream 3.1", "quality": "high" } ]
  }
}
```

## Other routes

| Route | Method | Purpose |
|---|---|---|
| `/health` | GET | `{"status":"ok","service":"phos-ai-proxy"}` |
| `/` | POST | Chat completion (Workers AI), `{ messages, model, max_tokens, temperature }` |
| `/transcribe` | POST | Whisper audio transcription |

## Swarm routing

`POST https://mesh.p31ca.org/api/vision/<anything>` rewrites to exactly
`/vision` on `phos-ai-proxy` (the handler matches an exact pathname, not a
prefix). All swarm `/api/vision/*` calls must use the service binding, never
public worker-to-worker DNS (error 1042).