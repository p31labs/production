<!-- P31-HEADER
id: p31_agent_runbook_part7_deployed_button_20261004_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
owner: will
supersedes: p31_deployed_button_runbook_20261004_v1.0
-->

# AGENT-RUNBOOK-PART7 — Deployed Button

**Authority:** Extends `AGENT-RUNBOOK-PART6-DEPLOYED-WIRING.md`. If a chat
instruction conflicts, the runbook wins.

---

## Part 0 — The Gap

Everything works locally. The deployed button has never been tested since the AI
binding was added. That is the entire scope of this runbook.

| Layer | Local | Deployed |
|---|---|---|
| Engine | ✅ works | ✅ (same code) |
| Provider | ✅ router | ⚠️ binding (unverified) |
| Binding | n/a | ⚠️ `[ai]` in wrangler.toml |
| Button | n/a | ❓ never clicked in production |

---

## Part 1 — Deploy

```bash
cd /home/p31/production/portals/shell

# Confirm the binding is in wrangler.toml
grep -A2 '\[ai\]' wrangler.toml

# Typecheck (the gap PART6's work did not close)
npm run typecheck

# Build + deploy
npm run build
npm run deploy
```

**Pass:** deploy succeeds, URL printed.
**Fail (typecheck):** the `AI: Ai` type or the declaration is wrong — fix before deploying.
**Fail (deploy):** the `[ai]` block rejected — check wrangler version.

---

## Part 2 — Verify (headless button click)

```bash
curl -N -X POST https://p31-portal-shell.pages.dev/api/forge/stream \
  -H 'Content-Type: application/json' \
  -d '{"title":"Smoke","entities":[{"name":"spoon","fields":[{"name":"level","type":"number"}]}],"actions":[{"name":"log"}]}' \
  --max-time 90 2>&1 | grep -E '^event: (artifact|gate|stream)'
```

**Pass** — the button clicks:
```
event: artifact.final
event: gate.verdict
event: stream.end
```

**Fail A — `AI is not defined`:** binding not picked up. Fix: dashboard →
Pages → `p31-portal-shell` → Settings → Bindings → Workers AI → `AI`. Redeploy.

**Fail B — timeout:** Dreamer hung on `env.AI.run()`. Tail the Function logs:
```bash
npx wrangler pages deployment tail --project-name p31-portal-shell
```

**Fail C — `stream.end` with `reason: error`:** engine crashed. The catalog-walk
fallback should have caught it; if not, read the Function's exception text.

**Fail D — `stream.end` only, no `artifact.final`:** provider returned empty and
the walk didn't fire. Add `console.log('AI:', !!env.AI)` to confirm the binding.

---

## Part 3 — The Manual Click (real proof)

Open `https://p31-portal-shell.pages.dev/` → Studio face → type a brief → click
**Build my surface**. Success: `agent.start` rows appear in order
(Grounder → Dreamer → Shaper → Governor), trace collapses to a summary, an
artifact renders, the gate shows `pass`.

---

## Part 4 — The Neuron Note

Free tier: 10,000 neurons/day, account-wide. `mistral-small-3.1-24b-instruct`
costs ~20 neurons per Dreamer call — ~400 calls/day of headroom. Only a concern
if the reasoning-model router runs concurrently. Monitor: dashboard → Workers &
Pages → Workers AI → Usage.

---

## Part 5 — The One Rule

No new runbook until this one is closed. The session has produced seven runbooks;
the button has not clicked in production. Close the loop: deploy, verify, click.
If it works, the design system is proven end-to-end (offline smoke → live router →
deployed binding). Option B (catalog-driven selection in the Function) is the
follow-up, not now.

*End of runbook. One command: run the curl.*