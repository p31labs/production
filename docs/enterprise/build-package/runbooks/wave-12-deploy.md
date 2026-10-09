<!-- P31-HEADER
id: p31_wave_12_deploy_20261007_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-07T00:00:00Z
owner: will
-->

# Wave 12 — First Production Deploy

## Scope note (the honest line)

Waves 1–11 built the shell: 18 feature gates green, a behaviourally-verified
room, vitest 109/109, e2e 15/15. **Nothing has ever deployed.** Every wave's
`deploy` node sits behind an approval that has never been exercised. The package
has built a system it has never shipped.

Wave 12 is the first production deploy. It is the smallest runbook in the
package and the one with the most irreversible failure modes, because a deploy
touches a live database and a live URL.

**Two Wave 11 defects are named, not fixed here:**

1. **BYOK is attribution-only.** `resolveKey` returns the plaintext, but
   `stream.ts` runs the keyless Workers AI binding. Filed as
   `byok-routing-gap.md` (open). The deploy ships the feature as-is.
2. **Phase 0a's tamper-detection HTTP test is unbuilt.** Tamper detection is
   covered at the ledger unit level, not at the export endpoint.

**Explicitly not in this wave:** the BYOK routing seam, the tamper-detection
integration test, alerting/SLOs, and any new feature. This runbook deploys what
exists.

## The hard constraint (read first)

**`portals/shell/**` is untracked.** `git ls-files portals/shell` returns zero
files. Two of the three catastrophic deploy failure modes are therefore
structural:

- **A stale directory deploy.** There is no git commit to diff against, so a
  deploy from the wrong directory produces a production build with no record of
  what it contains.
- **Uncommitted code.** The shell's only backup is the working tree.

**The mitigation: build a manifest before deploying, and verify the deployed
bundle matches it.**

## Phase 0 — pre-flight (abort-fast, deterministic)

```bash
cd /home/p31/production/portals/shell

# 1 — clean-room build from a known tree
npm run gate   # token-conformance → tsc → vitest → vite build
# MUST exit 0. A deploy on a red gate ships a broken bundle.

# 2 — record what is being deployed
node -e "const fs=require('fs'),h=require('crypto').createHash('sha256');
const f=fs.readdirSync('dist/assets').find(x=>x.startsWith('index-')&&x.endsWith('.js'));
console.log('bundle-sha256:', h.update(fs.readFileSync('dist/assets/'+f)).digest('hex').slice(0,16));" | tee /tmp/p31-deploy-manifest.txt

# 3 — the D1 migrations that will apply
npx wrangler d1 migrations list p31-portal-shell --remote

# 4 — the room Worker exists?
npx wrangler deployments list --name p31-portal-shell-room 2>&1 | tail -5
```

Abort if any step fails.

## Phase 1 — apply the D1 migrations

```bash
cd /home/p31/production/portals/shell
npx wrangler d1 migrations apply p31-portal-shell --remote
```

Runs before anything else, because the room Worker binds D1. The migrations are
`0001_bus_ledger` through `0008_trace_id`. **Nothing applies migrations during a
Pages deploy** — this step is manual.

```bash
npx wrangler d1 execute p31-portal-shell --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
# MUST list: bus_events, credentials, notification_reads, page_versions, pages,
#            suggestions, spaces, search_fts, d1_migrations
```

## Phase 2 — deploy the room Worker (first)

```bash
cd /home/p31/production/portals/shell
npx wrangler deploy --config room/wrangler.toml
```

The room Worker deploys before the Pages project because the `SESSION_ROOM` and
`PAGE_ROOM` bindings reference it by `script_name` — "it is mandatory that when
declaring Durable Objects bindings in the config file, the `script_name` is
specified". Verify the classes registered:

```bash
npx wrangler deployments list --name p31-portal-shell-room
```

## Phase 3 — deploy the Pages project

```bash
cd /home/p31/production/portals/shell
npm run deploy
# → npm run deploy:room && wrangler pages deploy dist --project-name p31-portal-shell --commit-dirty=true
```

Record the deployed URL and append it to the manifest.

## Phase 4 — post-deploy smoke tests

```bash
cd /home/p31/production
P31_SHELL_URL="<deployed-url>" node scripts/gate.mjs --surface chat --live
```

The live gate asserts the shell serves HTTP 200 and the deployed CSS pins
`.card-body` to 24px. Then the DO round-trip the gate cannot make:

```bash
# The room Worker answers.
curl -s "https://p31-portal-shell-room.<account>.workers.dev/health" | grep -q ok && echo "room: ok"

# The Pages Function reaches the DO binding — 401 (fail-closed on the missing
# x-p31-did), NOT 503 (binding missing) and NOT 500.
curl -s -o /dev/null -w "%{http_code}\n" "<deployed-url>/api/session/smoke/room"
# MUST be 401.
```

The 401-vs-503 distinction is the whole smoke test: a 401 means the Function
reached the binding and refused an anonymous room; a 503 means the binding did
not resolve — the deploy shipped a Pages project that cannot reach its DO.

## Phase 5 — rollback plan (written before it is needed)

```bash
npx wrangler rollback --name p31-portal-shell-room
npx wrangler pages deploy dist --project-name p31-portal-shell --commit-dirty=true
```

D1 migrations do not roll back; a schema change is forward-only.

## The gate

```bash
node scripts/gate.mjs --surface chat --live
```

Plus the two manual assertions the gate cannot make: the room Worker answers
`/health`, and the room endpoint returns 401, not 503.

## The evidence

- `/tmp/p31-deploy-manifest.txt` — the bundle sha, the migration list, the URL.
- The `--live` gate output.
- The room `/health` response.
- The room endpoint's status code (401).
- The Pages deploy output (the URL).

## The negative control

The two failure modes that matter here are not greps — they are the pre-flight
gates. Prove each aborts:

```bash
# 1 — a red gate blocks the deploy (plant a token violation)
cp portals/shell/src/index.css /tmp/opencode/nc/index.css.bak
echo '.x { color: #ff0000; }' >> portals/shell/src/index.css
(cd portals/shell && npm run gate) && echo "FAILED TO BITE" || echo "red gate bites"
cp /tmp/opencode/nc/index.css.bak portals/shell/src/index.css

# 2 — an unapplied migration is visible before the deploy
npx wrangler d1 migrations list p31-portal-shell --remote
# MUST list the unapplied set, or the operator cannot know what the deploy runs.
```

## Decision log

| Decision | Basis | Recorded in |
|---|---|---|
| Migrations first, then room Worker, then Pages | the room Worker binds D1; Pages binds the DO by `script_name` | Phases 1–3 |
| The room Worker deploys before the Pages project | Pages cannot deploy a DO; `script_name` must resolve | Phase 2 |
| A bundle manifest is recorded before deploying | `portals/shell/**` is untracked; no git diff | Phase 0 |
| The smoke test checks 401, not 200 | 401 = the binding resolved; 503 = it did not | Phase 4 |
| D1 migrations are forward-only | a schema change is not a revertible artifact | Phase 5 |

## Three review questions, answered

1. **Does the first deploy go to preview or straight to production?** Preview
   first — `wrangler pages deploy` without `--branch main` produces a preview
   URL, and the preview shares the production D1 unless `preview_database_id` is
   set. The first run should be the one that can fail without consequence.
2. **Is the bundle manifest enough of a record for an untracked tree?** The
   manifest should record the `dist/` file list and the `wrangler` version too,
   so a rollback can reproduce the exact bundle. A single sha identifies the
   deploy; it does not let you rebuild it.
3. **Does the live gate cover the DO, or only the Pages project?** Only the
   Pages project (`P31_SHELL_URL` → HTML + CSS). The two manual Phase 4
   assertions — `/health` and the 401-vs-503 — are the DO coverage the gate
   lacks. If they are not run, the deploy can succeed with an unreachable room,
   and chat silently degrades to hydrate-only.

## Explicitly not in this wave

The BYOK routing seam (filed); the tamper-detection HTTP test (named); OTel
alerting and SLOs; the search/activity/compliance behavioural harnesses; any
new feature. This runbook deploys what exists.