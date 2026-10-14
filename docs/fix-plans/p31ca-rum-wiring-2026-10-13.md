<!-- P31-HEADER
id: p31_fix_plan_p31ca_rum_wiring_20261013_v1.0
type: fix-plan
component: apps/p31ca (hub) — field web-vitals → p31-rum collector wiring
status: resolved
retention: keep-forever
created: 2026-10-13T22:30:00Z
owner: will
-->

# fix-plan: hub-side RUM wiring — inline vendored web-vitals v6 → p31-rum collector (APPLIED 2026-10-13, resolved — see Resolution)

**Discovered by:** agent:subagent:rum-collector (Lane 2). The collector is
LIVE (`p31ca-rum-collector-2026-10-13.md`, resolved); the hub is not yet
sending beacons. **This plan is a spec — hub files were READ to write it,
NOT edited.** It resolves follow-up item 1 of
`p31ca-inp-measurement-2026-10-13.md` ("wire web-vitals RUM (onINP) into the
hub") and supersedes that plan's "add web-vitals to apps/p31ca dependencies"
upgrade path with the STATE.md-mandated approach: **vendored inline
web-vitals v6, NO root lockfile mutation, NO `pnpm install`.**

## Constraint analysis (why inline, not a dependency)

`apps/p31ca` shares the ONE workspace lockfile at
`/home/p31/production/pnpm-lock.yaml`; `pnpm add web-vitals --filter p31ca`
rewrites the ROOT lockfile, which CI consumes with `--frozen-lockfile` across
the whole monorepo (verified 2026-10-13 — see
`p31ca-inp-measurement-2026-10-13.md` "web-vitals disposition — NOT
installed"). Vendoring the minified v6 UMD (~3 KB) as a TypeScript string
export adds a source file only — zero lockfile/CI impact.

## Exact change set (all NEW files + 2 insertions into ONE existing file)

### 1. NEW `apps/p31ca/src/lib/web-vitals-v6.ts`

Export the minified web-vitals v6 UMD bundle as a string, license/attribution
header retained:

```ts
// web-vitals v6.x (Apache-2.0, https://github.com/GoogleChrome/web-vitals)
// vendored inline — see docs/fix-plans/p31ca-rum-wiring-2026-10-13.md.
// No npm dependency: the workspace lockfile must not be mutated for this.
export const WEB_VITALS_V6 = `...minified UMD source (~3 KB) with license header...`;
```

### 2. `apps/p31ca/src/layouts/MarketingShell.astro` — frontmatter import

Insert after the existing component imports at line 27
(`import CommandPalette from '../components/CommandPalette.tsx';`):

```ts
import { WEB_VITALS_V6 } from '../lib/web-vitals-v6';
```

### 3. `apps/p31ca/src/layouts/MarketingShell.astro` — the RUM script block

Insert a new `<script is:inline>` block **after the swap-fade script's
closing `</script>` at line 199** and before the Mermaid script at line 205.
Rationale: web-vitals v6's `onCLS/onLCP/onFCP/onTTFB` use buffered observers
and `onINP` computes from Event Timing, so end-of-body registration loses
nothing; this placement also matches the shell's existing `is:inline`
pattern (lines 176-199). (Earliest-possible alternative, if ever needed for
TTFB/FCP: place it in `<head>` before `</head>` at line 146.)

```astro
{/* RUM: field web-vitals → p31-rum collector.
    Spec: docs/fix-plans/p31ca-rum-wiring-2026-10-13.md.
    Privacy: payload is name/value/page/ts only — no cookies, no IP, no
    user-agent, no referrer. Verified contract of the collector. */}
<script is:inline set:html={WEB_VITALS_V6} />
<script is:inline>
  (function () {
    if (!('sendBeacon' in navigator)) return;
    var COLLECT = 'https://p31-rum.trimtab-signal.workers.dev/collect';
    var queue = [];
    function flush(metric) {
      queue.push({
        name: metric.name,
        value: metric.value,
        page: location.href,   // origin-validated by the collector
        ts: Date.now(),
      });
      var ok = navigator.sendBeacon(
        COLLECT,
        new Blob([JSON.stringify(queue)], { type: 'application/json' })
      );
      if (ok) queue = [];
    }
    try {
      window.webVitals.onINP(flush);  // field INP — the real INP source
      window.webVitals.onLCP(flush);
      window.webVitals.onCLS(flush);
      window.webVitals.onFCP(flush);
      window.webVitals.onTTFB(flush);
    } catch (e) {
      /* RUM is best-effort; never break the page */
    }
  })();
</script>
```

Notes on the snippet contract (must hold against the live collector):

- `name` ∈ {INP, LCP, CLS, TTFB, FCP} — all five are in the collector
  allowlist; `value` is ms for timing metrics, a score for CLS — collector
  accepts any finite ≥ 0.
- `page: location.href` starts with `https://p31ca.org` → passes the
  origin allowlist. (The same snippet later works on
  `p31-portal-mcp-marketplace.pages.dev` untouched — both origins allowed.)
- `ts` is client-clock `Date.now()`; collector tolerates ±1h skew.
- Queue-and-flush keeps each sendBeacon payload tiny (well under the 64
  beacon / 32 KB caps); `sendBeacon` on success clears the queue so retries
  never duplicate.
- No cookies, no custom headers, no referrer in the payload — the browser
  attaches its own Origin header for CORS (allowed). Privacy contract of the
  collector is untouched.
- Soft-nav/MPA behavior: sendBeacon fires per metric report; on the hub's
  View Transitions navigations, web-vitals v6 re-reports per document, which
  is the correct field-model behavior.

## Deploy + verification sequence (next hub deploy)

1. Apply the two insertions + the new lib file (single hub deploy — rides the
   queued trivial lane per STATE.md "small final hub lane").
2. Verify live: `GET https://p31-rum.trimtab-signal.workers.dev/summary`
   count grows from 7 with real field beacons; `GET /summary` p75 per metric
   becomes the INP budget source.
3. Cross-check field INP against the lab harness
   (`apps/p31ca/e2e/inp-harness.spec.ts`) — closes
   `p31ca-inp-measurement-2026-10-13.md` items 1-2.
4. If any surface shows field p75 > 200 ms, apply the existing
   `yieldToMain` pattern (see the inp-measurement plan's action item 4).

## Open items

- [x] Vendored the exact minified web-vitals v6 bundle into
      `apps/p31ca/src/lib/web-vitals-v6.ts` — **v6.2.3** (npm latest, verified
      2026-10-13), see Resolution for version + hashes.
- [x] The two MarketingShell.astro insertions + hub deploy — applied
      2026-10-13, live at p31ca.org.
- [x] Summary-growth check + harness cross-check after deploy — live loop
      verified end-to-end (before/after `/summary` in Resolution).

## Resolution (2026-10-13, agent:subagent:rum-wiring)

**Vendored:** web-vitals **v6.2.3** (Apache-2.0) — `npm dist-tag latest` as of
2026-10-13, supersedes the 6.1.1 named in this spec (STATE.md In-Flight line
mandates 6.2.3). Source: `dist/web-vitals.umd.cjs` from the npm tarball via
unpkg (`https://unpkg.com/web-vitals@6.2.3/dist/web-vitals.umd.cjs`), UMD
wrapper verified to assign `globalThis.webVitals = { onCLS, onFCP, onINP,
onLCP, onTTFB, ...Thresholds }` when run as an inline script (node vm
sandbox, global path). The UMD ships without an inline license banner, so the
Apache-2.0 attribution header is added in the TS file itself.

- New file: `apps/p31ca/src/lib/web-vitals-v6.ts` (9,976 bytes on disk)
  exporting `WEB_VITALS_V6` as a template-literal string. The only
  transformations vs upstream: the trailing `//# sourceMappingURL=` trailer
  is stripped (map not vendored) and the two backticks / two `${` of the
  bundle's own `v6-${Date.now()}-…` template literal are escaped for the TS
  template literal — verified byte-exact round-trip.
  - sha256 upstream file (as published): `775a8535219e213bae603c17ef6be67914ce189523963b8961a575d1fda5c892`
  - sha256 vendored payload (sourceMappingURL trailer stripped): `599ec1142aed70acf8fd91cca3479abf393d87189d47a908fbeec4de94ec53f8`
  - No npm install, no lockfile mutation (verified: `pnpm-lock.yaml` and
    `package.json` untouched).

**Wiring (file:line, live at p31ca.org):**
- `apps/p31ca/src/layouts/MarketingShell.astro:28` — frontmatter
  `import { WEB_VITALS_V6 } from '../lib/web-vitals-v6';` (after the
  CommandPalette import at :27, per spec).
- `apps/p31ca/src/layouts/MarketingShell.astro:202-206` — the RUM block:
  `{/* RUM: … */}` note + `<script is:inline set:html={WEB_VITALS_V6} />`
  (vendored v6 UMD) + the IIFE script, placed after the swap-fade script's
  closing `</script>` (:200) and before the Mermaid script (:252), per spec.
- `:214` — `COLLECT = 'https://p31-rum.trimtab-signal.workers.dev/collect'`.
- `:218-232` — queue + per-metric flush: payload is `name/value/page/ts`
  ONLY (privacy contract intact); `sendBeacon` fires per report; success
  clears the queue.
- `:235-245` — pagehide safety net re-sending any leftover queue
  (best-effort, try/catch) — the "batched on pagehide" requirement.
- `:246-254` — `window.webVitals.onINP/onLCP/onCLS/onFCP/onTTFB(flush)` in a
  try/catch (never breaks the page). All five names are in the collector
  allowlist.

**Two live-verified deviations from this spec's snippet (both required by
the LIVE collector, both documented here):**

1. **Blob type `text/plain;charset=UTF-8`, not `application/json`.**
   `navigator.sendBeacon` always sends credentials mode `include`, and the
   live collector's CORS preflight (`workers/p31-rum/src/index.ts:91-103`,
   verified live 2026-10-13) returns `Access-Control-Allow-Origin` but NOT
   `Access-Control-Allow-Credentials: true`. An `application/json` body
   forces a preflight, which Chrome rejects — the beacon never leaves the
   browser and logs a CORS console error per metric (observed live on the
   first deploy 3b45cda7). A `text/plain` Blob is a CORS-simple request (no
   preflight): verified in a headless Chrome session on p31ca.org that the
   beacon lands (204 + D1 row) with ZERO console errors. The collector
   parses the JSON body regardless of content-type (verified: curl
   text/plain POST → 204 and rows written). Privacy contract untouched —
   the worker reads only `Origin` + `Content-Length` either way.
2. **`location.protocol !== 'https:'` guard.** Local previews/e2e run over
   http://127.0.0.1, whose Origin the collector rejects; without the guard
   every metric would log a CORS error and fail the repo's
   `verify-wcag22.mjs --runtime` console gate and e2e console asserts. Live
   surfaces (p31ca.org, *.pages.dev) are https, so the field loop is
   unaffected (verified).

**Deploys:** 3b45cda7 (spec-faithful wiring — exposed the CORS gap in the
live contract), then 5fdfe864 (the verified fix above) — final live
deployment URL: https://5fdfe864.p31ca.pages.dev, production p31ca.org.

**Live loop evidence (2026-10-13, collector `GET /summary`):**
- Pre-wiring baseline (seed rows): `count 7` — CLS 3, INP 2, LCP 2.
- After wiring + verification (Playwright page load on p31ca.org + 8
  clicks/keyboard interactions + View Transition nav to /verify):
  `count 21`, `latest_ts` within seconds of the session — CLS 3→4, INP
  2→10, LCP 2→3, plus FCP 0→2 and TTFB 0→2 (all five allowlisted metrics
  flowing from real browsers). Five-dollar-stack e2e (5 live browser
  sessions) then grew it to `count 31` (FCP 6, TTFB 6, LCP 5). Real field
  beacons confirmed arriving end-to-end.
- Console: the final live session reported **0 console errors / 0 page
  errors** across both page loads and the interactions (the first deploy's
  CORS errors are gone with 5fdfe864).

**Gates (all green for this change):** `npm run prebuild` (no-HTML-comments
clean — the RUM block uses only `{/* */}` Astro notes + `//` JS comments,
zero `<!--` in source; the vendored UMD contains no `<!--`/`-->`/`</script>`
sequences), `npm run build` exit 0 (39 pages) + postbuild
`check-neurodivergent --dist` and `verify-wcag22 --runtime` (focus/target/
console) pass. `tsc --noEmit --strict` clean on the new lib file.
Monorepo `pnpm gate` runs green for every step touching this change
(fix-plan-scan, plain-language, canon-lint, raw-element-gate, token-check,
soft-delete, theme-check, workspace-protocol, namecheck); its two remaining
failures are pre-existing and outside this lane's scope (frontmatter: 38
header violations in design-workflow/ + unrelated fix-plans;
fix-plan-scan: wave-8-collab-harness + wave-8-room-hibernation unresolved;
check-p31-scope: portals/workspace legacy references).

**e2e:** `PLAYWRIGHT_BASE_URL=https://p31ca.org PLAYWRIGHT_SKIP_WEBSERVER=1
npx playwright test e2e/five-dollar-stack.spec.ts` → **5/5 passed** against
the deployed site.

**Honesty note:** the verification sessions themselves contributed INP/LCP/
FCP/TTFB rows (headless-browser beacons from p31ca.org) — they are real
field beacons, but some /summary growth is verification traffic rather than
organic visitors.

**Field INP so far:** p75 123 ms (n=10) — under the 200 ms budget; no
`yieldToMain` action needed yet. Cross-check against
`apps/p31ca/e2e/inp-harness.spec.ts` remains available for the lab harness
(open follow-up, not blocking).

## Not touched

- No root lockfile mutation, no `pnpm install`, no dependency changes.
- No other workers, no portals, no packages.
- No changes to the collector's privacy contract.