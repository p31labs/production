# fix: Tracks E+F — .dev.vars untrack + agentdiff hook binary-safe (Wave 3, Lane 2)

<!-- P31-HEADER
id: p31ca_trackef_ops_20261014_v1.0
type: fix-plan
component: enterprise-operations
status: open
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

## Scope

Wave 3 Lane 2 (Tracks E+F), per the runbook addendum
`docs/enterprise/design-system/parallel-paths-enterprise-runbook.md` §"Wave 3"
and STATE.md "In Flight". E1: untrack the mcp-registry `.dev.vars` (the only
real `.dev.vars` in the tree) + example file + gitignore. E2: file the
owner-executed rotation steps + history-scrub decision (both NOT done by
this lane — owner-owned). F1: patch the agentdiff hook's
`prepare-ledger.py` to treat staged files as byte streams and skip
binary/undecodable blobs. F2: verify the hook end-to-end on text AND
binary staging.

## E1 — .dev.vars untracked (DONE)

- **Inventory:** `git ls-files | grep -i dev.vars` found exactly three
  tracked files: the real `workers/mcp-registry/.dev.vars` plus two
  pre-existing examples (`apps/counterscale/packages/server/.dev.vars.example`,
  `software/p31-google-bridge/.dev.vars.example`). No `.dev.vars.*`
  variants exist anywhere in the estate (checked `find . -name '.dev.vars*'`
  excluding node_modules/.git). So a bare `.dev.vars` pattern plus an
  example-negation is sufficient.
- **`.gitignore` append** (now `.gitignore:20-22`):

  ```
  # Wrangler local secrets — never track values; keep .dev.vars.example only
  .dev.vars
  !.dev.vars.example
  ```

  Placed under the "Secrets & admin tokens" block (after `secret*`,
  `.gitignore:18` — note that pre-existing catch still silently ignores
  `docs/enterprise/operations/secret-rotation-runbook.md` and
  `secrets-inventory.md` per p31ca-secrets-automation-2026-10-14 D7 item;
  unrelated to this lane).
- **Untrack:** `git rm --cached workers/mcp-registry/.dev.vars`
  (index-only; the on-disk file, 401 bytes, was NOT deleted and remains
  in place — now correctly ignored: `git check-ignore -v` →
  `.gitignore:21:.dev.vars`).
- **Example file:** new `workers/mcp-registry/.dev.vars.example` — SAME
  KEYS, placeholders only, no values:
  `ADMIN_TOKEN`, `REVIEW_SIGNING_KEY`, `REVIEW_SIGNING_KEY_PREV`,
  `INTERNAL_USAGE_KEY`, `ADMIN_SECRET` (all `placeholder-…`).
- **Commit:** `e67bdfb` — `chore: untrack .dev.vars (secrets hygiene) + example file`
  (`.gitignore` +4; `.dev.vars` deleted-from-track, mode 100644; example
  created, 7 lines). Committed WITHOUT `--no-verify` — the hook ran and
  passed (see F2). STATE.md and the runbook's own working-tree edits were
  left unstaged and untouched.
- **Post-state:** zero tracked real `.dev.vars` files; the three tracked
  `dev.vars` paths are all `.example` files.

## E2 — rotation + history scrub: OWNER-EXECUTED, FILED NOT DONE

No credential was rotated and no history was scrubbed (hard rule 6:
owner-executed / owner-decision). Per
`docs/enterprise/operations/secrets-inventory.md` + `secret-rotation-runbook.md`,
the owner queue is:

| Key | Cadence / action |
|---|---|
| `LOVE_AUTH_SECRET` (Secrets Store `33d48162…`, zero-read) | 90d, dual-credential window (default 24h): prepare new value in store, propagate, verify, deactivate old, record |
| `ROTATOR_SHARED_SECRET` (per-worker wrangler secret on `p31-key-rotator`) | 180d, dual-credential; ALSO migrate to the account-level store (runbook migration §: create in store, bind in `workers/p31-key-rotator/wrangler.toml`, read via `env.ROTATOR_SHARED_SECRET.get()`) |
| `ENTITLEMENT_API_TOKEN` (per-worker wrangler secret on `mcp-x402-gateway`) | 90d, dual-credential |
| `CF_ACCESS_APP_AUD` / `CF_ACCESS_TEAM_NAME` (Pages env vars) | provision-once per surface; rotate on compromise |
| `cf-gateway-deploy.token` (`/home/p31/.secrets/`, 0600, IP-locked `p31-gateway-deploy`) | 90d, or immediately on scope/IP change |

Rotation mechanics per the runbook: `node scripts/key-rotate.mjs keygen`
→ `key-rotate.mjs backup <NAME> --worker <W>` → `key-rotate.mjs rotate
<NAME> --worker <W> --value @vault-file --yes [--health <url>]` → verify
window → record; all **owner-executed on the owner's session** (the
rotator worker cannot run `wrangler secret put` by design). Rotations of
the two store-bound secrets use the store dual-credential window instead
of the worker CLI.

**History scrub — owner decision, NOT done.** If the owner ever decides
the tracked `.dev.vars` values must leave history: `git filter-repo
--invert-paths --path workers/mcp-registry/.dev.vars` (or `--replace-text`
for value-level redaction), which REWRITES all commit hashes and requires
a coordinated `git push --force` + re-clone across every clone, plus
rotating every secret that ever appeared in history anyway (scrub is
cosmetic once rotation happened). Recommendation to the owner: rotation
(item above) is the real mitigation; scrub only if a compliance surface
requires it.

## F1 — prepare-ledger.py binary-safe patch (DONE)

**Backup:** `cp -p ~/.p31/.agentdiff/scripts/prepare-ledger.py
~/.p31/.agentdiff/scripts/prepare-ledger.py.bak-2026-10-14` (15,723 bytes,
mtime preserved).

**Crash site:** `prepare-ledger.py:19` (old) — `subprocess.run(..., text=True,
capture_output=True)` strictly UTF-8-decodes `git diff --cached --unified=0`
output. A staged file git classifies as TEXT with non-UTF-8 bytes (the
Wave-3 PDFs/tgz: `docs/grants/payloads/Paper_XII_v2.pdf` has zero NUL in
its first 8000 bytes, so git prints its raw bytes) raises
`UnicodeDecodeError: byte 0x93`, and the hook's `set -e` blocks the commit.

**Exact diff** (three minimal edits; full `diff -u` against the backup):

1. `run()` — capture bytes, decode `utf-8` with `errors="replace"` for
   stdout/stderr (never raises; replacement chars never enter the ledger
   because only `diff --git`/`@@` lines are parsed).
2. New `staged_binary_files(repo_root)` — `git diff --cached --numstat`
   (`-`/`-` ⇒ binary; numstat never prints blob content, decode-safe).
3. New `staged_blob_decodes(repo_root, path)` — `git show :<path>` (raw
   bytes) + strict UTF-8 try/except; catches the git-as-text class
   (NUL-free PDFs) that numstat misses. Deleted paths (not in index)
   return True.
4. In `parse_staged_changes`, skip any path that is numstat-binary OR
   whose staged blob does not strictly decode: `if path in binaries or
   not staged_blob_decodes(repo_root, path): continue` (line ~102).

```
@@ run():
-    return subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
+    proc = subprocess.run(cmd, cwd=cwd, capture_output=True)
+    return subprocess.CompletedProcess(
+        proc.args, proc.returncode,
+        proc.stdout.decode("utf-8", errors="replace") if proc.stdout else "",
+        proc.stderr.decode("utf-8", errors="replace") if proc.stderr else "")
+
+def staged_binary_files(repo_root) -> set:        # numstat '-' ⇒ binary
+def staged_blob_decodes(repo_root, path) -> bool: # git show :path, strict UTF-8
+
@@ parse_staged_changes:
+    binaries = staged_binary_files(repo_root)
@@ out-loop:
+        if path in binaries or not staged_blob_decodes(repo_root, path):
+            continue
```

`python3 -m py_compile` green. The `.git/hooks/pre-commit` ("DO NOT
EDIT") is untouched — the script-level fix is the right layer.

## F2 — hook verification (DONE, both directions)

**Text path — real repo, real hook, no `--no-verify`:** the E1 commit
`e67bdfb` was made with the hook active; exit 0 (commit landed). The full
pipeline ran: pre-commit `prepare-ledger.py` wrote
`.git/agentdiff/pending-ledger.json`, and the existing post-commit hook
(`finalize-ledger.py`) consumed it and appended an AgentTrace record to
`.git/agentdiff/traces/main.jsonl` (that file is the durable ledger —
`pending-*.json` removal after finalize is by design, finalize lines
298/309). Trace record id `3e5c77da-22fd-426e-a49c-95c43825d072` lists
exactly the staged text files: `.gitignore` (lines 20-23, the appended
block) and `workers/mcp-registry/.dev.vars.example` (lines 1-7); the
deleted `.dev.vars` correctly contributes no lines.

**Binary path — scratch repo in `/tmp/opencode`** (temp repo, created +
cleaned up by this lane; never committed, never in the estate tree):
staged `paper.pdf` (copy of `docs/grants/payloads/Paper_XII_v2.pdf` —
the NUL-free crash class) + `bundle.tgz` (copy of
`portals/children/vendor/p31-design-core-2.2.0.tgz` — numstat-binary
class) + text files.

- **Negative control (backup script):** exact D7 failure reproduced —
  `UnicodeDecodeError: 'utf-8' codec can't decode byte 0x93 in position
  398: invalid start byte`, exit 1.
- **Fixed script:** exit 0, no traceback; ledger written with
  `files_touched: ['note.txt', 'other.txt']` — both binary classes
  skipped, text attribution intact (verified twice: binaries-only and
  binaries+text staging).

## Open items (owner)

1. Rotate the five secrets per the E2 table (dual-credential window) —
   the tracked-and-now-untracked `.dev.vars` values should be assumed
   exposed to anyone with repo history access.
2. Decide on history scrub (`git filter-repo` + force-push coordination)
   — recommended only if a compliance surface requires it; rotation is
   the real mitigation.
3. No other failure modes were observed in the hook; if a future commit
   with unusual staging (renames of binary files, submodule paths) trips
   the ledger, file it with the traceback per the Ownership Contract.