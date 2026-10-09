# Postmortem: <incident title>

**Incident ID**: <id>
**Date**: <YYYY-MM-DD>
**Severity**: SEV-1 / SEV-2 / SEV-3
**Authors**: <names>
**Status**: draft | in review | final
**Reviewers**: <names>

## Blameless policy

This postmortem identifies systemic causes, not individuals. "Human error"
is the *start* of the investigation, not the end. Action items target
processes, tooling, and runbook gaps — never a person.

## Summary

One paragraph. What happened, when, who was affected, what the impact was.
Written for someone who was not there.

## Impact

- **Duration**: <start> → <end> (<total>)
- **Affected users**: <scope>
- **User-visible symptoms**: <what they saw>
- **Business impact**: <revenue, reputation, compliance>
- **Data loss**: <none | description>
- **SLO budget consumed**: <X% of the 30-day budget>

## Timeline (UTC)

| Time | Event | Source |
|---|---|---|
| HH:MM | deploy merged | GitHub |
| HH:MM | first alert fired | PagerDuty (not yet wired — use manual check) |
| HH:MM | on-call acknowledged | Slack |
| HH:MM | agent posted SITREP #1 | incident channel |
| HH:MM | root cause identified | SITREP #3 |
| HH:MM | mitigation applied | deploy log |
| HH:MM | monitoring confirmed recovery | Grafana (not yet wired — use wrangler tail) |
| HH:MM | incident closed | Slack |

## Detection

How did we find out? How long between the first bad event and the first
alert? Was there a user report before the alert? Would a better SLI have
caught it sooner?

- **MTTD** (mean time to detect): <duration>
- **MTTR** (mean time to resolve): <duration>
- **Detection gap**: <if any>

## Root cause (5 Whys)

1. Why did the control plane go down? — <answer>
2. Why did that happen? — <answer>
3. Why did that happen? — <answer>
4. Why did that happen? — <answer>
5. Why did that happen? — <root cause>

The root cause is a systemic property, not a person's mistake.

## What went well

- <e.g. the agent's first SITREP arrived in 8 minutes and named the route gap>
- <e.g. the rollback was one command and worked first try>

## What went badly

- <e.g. the runbook had no entry for this alert; the on-call improvised>
- <e.g. the smoke test's hibernation step is not in CI>

## Action items

| # | Action | Owner | Priority | Tracking |
|---|---|---|---|---|
| 1 | Add `ControlRoomDown` runbook | @p31-platform | P1 | #123 |
| 2 | Add the hibernation smoke step to CI | @p31-platform | P1 | #124 |
| 3 | Add an SLI for `ws_connected → snapshot_sent` latency | @p31-platform | P2 | #125 |

Action items are tracked like any other work. A postmortem with untracked
action items is a document, not a fix.

## Lessons learned

Append to `runbooks/agent-skills/lessons.md` so the on-call agent reads it
on the next incident. One paragraph, written for the agent.

## Related

- Incident channel: #<channel>
- SITREP log: <link>
- Runbook used: <link>
- SLO dashboard: <link>