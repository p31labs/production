<!-- P31-HEADER
id: p31_fix_plan_plain_language_standard_20261012_v1.0
type: fix-plan
component: portals/mcp-marketplace
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: plain-language-standard (resolved with the standard documented)

**Discovered by:** agent:subagent:marketplace-humanization
**Discovered at:** 2026-10-12T00:00:00Z
**Severity:** medium
**Status:** resolved — the standard below is now gate-enforced; keep this
file as the canonical description for future agents.

## The 5th-grade standard

Every user-visible string in the marketplace portal is written for a
5th-grade reader:

- **Short sentences** — at most ~10 words each. Break long thoughts into
  two sentences.
- **Everyday words** — use "address" not "endpoint", "helper" not "backend",
  "check" not "probe", "file" not "manifest", "server" not "governed
  catalog". Say what the thing does, not what it is called internally.
- **No unexplained acronyms or protocol jargon** — RFC, OAuth, OIDC,
  `did:`, JSON-RPC, Streamable-HTTP, liveness, transport, shim, aud are
  banned from visible text. Technical detail stays behind a
  "Show technical details" disclosure (closed by default).
- **Errors are human sentences** — "We couldn't reach that server. Check
  the address and try again.", never "probe failed: …".
- **Locked wording** (from the plan) — Try a server (was: Inspect any URL),
  Sign in (was: claim did:key), Energy right now (was: spoon dots),
  Reduce motion (was: Calm pill), Admin view (was: governed/public lens,
  hidden unless elevated), Payment confirmed (was: LOVE settled),
  The helper isn't connected right now (was: backend unreachable).
- Keyboard hints like Ctrl+K appear only in title tooltips, never as
  visible text.

## The gate

```
node /home/p31/production/scripts/plain-language-scan.mjs
```

Scans `portals/mcp-marketplace/src/**/*.{tsx,ts}` and extracts
user-visible string literals:

1. JSX text between tags, quoted JSX text (`>{'…'}<`, `{'…'}`),
2. `title`, `aria-label`, `placeholder` prop literals,
3. error-message literals (`new Error(…)`, `errors.push(…)`,
   `setError(…)`-style setters, `error:`/`detail:` object fields).

For each string it applies:

- **Readability score** = `avg letters/word + avg words/sentence`
  (sentences split on `. ! ? …`; a string with no sentence punctuation
  counts as one sentence). Score > 13 fails. Tag-span matches carrying code
  tokens (newlines, `=>`, `=`, `(`, `)`, `{`, `}`, `useState`, `return`,
  `const`, `function`, `;`) are rejected as code, not prose.
- **Jargon blocklist** — any extracted string containing a token from:
  `rfc oauth oidc did: didkey aud probe shim governed endpoint transport
  backend manifest schema json-rpc jsonrpc liveness` fails, plus the
  standalone token `mcp`, plus a visible `Ctrl+K` outside a title tooltip.
  The product filename `.p31-mcp.json` is normalized out before matching
  (locked by the plan's wording mapping). Data rendered at runtime
  (server descriptions, tool names, URLs) is outside the extraction scope
  by design — the gate enforces the strings the portal authors, not the
  strings the network supplies.

`--self-test` proves the detector: a fixture containing planted jargon
must fail the scan, a clean fixture must pass, and the real portal must
pass. Any violated expectation exits 1.

## How to add new UI text

1. Write the sentence like you would say it to a 10-year-old.
2. Run the scan. If it flags your string, shorten the sentence or swap the
   jargon word for an everyday one.
3. If you must show technical content (request/response bodies, config
   files), put it behind a closed `<details>` labeled
   "Show technical details".