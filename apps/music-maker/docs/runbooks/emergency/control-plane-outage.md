# Emergency Procedure: Control-Plane Outage

**Trigger**: SEV-1 — the control plane is down for all users, or a
data-integrity incident is suspected.
**Duration**: until resolved or downgraded.
**IC required**: yes.

This is a PLAYBOOK — it routes to the alert runbooks. It does not replace
them.

## Phase 1 — Declare (0–5 min)

1. Declare the incident in `#p31-incidents`:
   `!ic declare SEV-1 control-plane-outage`
2. The incident commander (IC) is the first responder until relieved. The IC
   does not debug — the IC coordinates.
3. Open the incident channel (the bot provisions it) and pin the SITREP log.
4. Assign roles: **Comms Lead** (stakeholder updates), **Ops Lead** (runs the
   runbooks), **Scribe** (timeline).

## Phase 2 — Triage (5–15 min)

Route by symptom, in this order:

| Symptom | Go to |
|---|---|
| `/health` non-200 | `alerts/control-room-down.md` Scenario C |
| `/control/health` 404 | `alerts/control-room-down.md` Scenario A |
| `/control/health` 500 | `alerts/hibernation-wake-fail.md` |
| D1 errors in logs | `alerts/d1-schema-drift.md` |
| Data loss suspected | `emergency/data-integrity.md` |
| Agent acting unexpectedly | `emergency/runaway-agent.md` |

The IC reads the matched runbook's **Fix Steps** aloud. The Ops Lead runs
them. One person types; everyone else watches.

## Phase 3 — Mitigate (15–60 min)

Prefer the fastest reversible action:

1. **Roll back the last deploy** — `wrangler rollback`. This is the default
   mitigation for any regression.
2. **Toggle a feature flag** if the failure is isolated to one bridge
   (WLED, OSC).
3. **Scale or restart** only if rollback is not possible.

Do **not** attempt a schema migration during an incident unless the incident
*is* the schema. Migrations are a change procedure, not an emergency fix.

## Phase 4 — Communicate

The Comms Lead posts to `#p31-status` every **30 minutes** for SEV-1:

```
[SEV-1 update HH:MM] <status>: <one sentence on impact>. Next update HH:MM.
```

Structured updates, predictable intervals. If the plan changes, update
immediately — do not wait for the interval.

## Phase 5 — Recover

1. Confirm the SLIs are back in budget (not just "the alert cleared").
2. Run the smoke test against the deployed URL: `pnpm smoke`.
3. Run the E2E suite: `pnpm test:e2e:deployed`.
4. Post the final SITREP, then close the incident.

## Phase 6 — Postmortem

Within 72h. Use `policies/postmortem-template.md`. The postmortem is
mandatory for SEV-1, optional for SEV-2, and skipped only for SEV-3 with no
user impact.

## Authority

The IC can:
- Declare and downgrade severity.
- Order a rollback without further approval.
- Pause all deploys (a soft freeze).
- Request executive stakeholder engagement.

The IC cannot:
- Authorize a data migration under incident pressure.
- Override the error-budget policy.
- Grant an agent L4 autonomy.