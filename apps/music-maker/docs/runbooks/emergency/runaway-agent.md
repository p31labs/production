# Emergency Procedure: Runaway Agent

**Trigger**: SEV-1 — an on-call agent is acting beyond its granted autonomy
level, making unauthorized mutations, or not responding to the kill switch.

## Phase 1 — Kill it

1. The first action is the human override, not an investigation:

   ```
   /agent halt
   ```

   The agent must stop all mutating actions, post a final SITREP, and hand
   off. If it does not respond to the override within 60 seconds, escalate:

2. Set `AGENT_AUTONOMY_MAX=L0`:

   ```bash
   cd apps/music-maker/worker
   npx wrangler secret put AGENT_AUTONOMY_MAX
   # value: L0
   ```

   This gates every agent action to read-only. It is rotatable without a
   deploy.

3. If the agent holds a session the override cannot reach: revoke the
   agent's access token / close its session from the console.

## Phase 2 — Assess damage

- Check the DO logs for writes the agent made outside its level
  (`ws_committed` with an unexpected source, or a patch.set the agent
  initiated).
- Check the D1 `events` tail for unexpected rows.
- Check the audit trail (the DO's hash chain) — a compensating event is
  itself an audit entry.

## Phase 3 — Roll back

If the agent's actions caused a regression, roll back the last deploy:

```bash
cd apps/music-maker/worker && npx wrangler rollback
```

If the agent mutated data (patches, mappings), those are committed events —
they are in the log by design. Roll them back by committing the inverse
(mapping.clear, or a patch.set to the previous values), NOT by deleting rows.

## Phase 4 — Determine why autonomy was exceeded

- Was `AGENT_AUTONOMY_MAX` unset (the kill switch never existed)?
- Was the routing table's level wrong for this alert class?
- Did the agent ignore the `guardrails.md` standing instruction?

Each is a different systemic cause. The postmortem must name it.

## Phase 5 — Postmortem (mandatory)

Use `policies/postmortem-template.md`. The action items MUST include a
verifiable kill-switch test:

- [ ] `AGENT_AUTONOMY_MAX=L0` demonstrably stops a mitigation (tested monthly)
- [ ] `guardrails.md` updated with the failure mode
- [ ] Routing table reviewed for the alert class that let the agent act

## Authority

Any human can issue `/agent halt`. The IC can rotate the kill switch,
revoke the agent's session, and order the rollback. Restoring the agent to a
higher autonomy level requires the DRI + a passed kill-switch test.