# P31 Control Server — Runbook Index

**Service**: `music-presence` (Worker + `MusicRoom` DO + `ControlRoom` DO + D1 `music-maker`)
**Surface**: `#/control` on the music-maker SPA
**Owner**: @p31-platform
**Review cadence**: alert-response quarterly · emergency monthly · change after each use
**Last drilled**: — (see Drill Log)
**Standard**: one runbook per failure mode, seven sections in order (Overview,
Symptoms, Impact Assessment, Diagnostic Steps, Fix Steps, Escalation,
Post-Actions). Validated by `scripts/runbook-validate.mjs`.

## How to use this index

An alert fires → find the matching runbook in § Alert Response → run it. If no
runbook matches, that is a gap: open an issue titled `runbook-missing: <alert>`,
and the on-call writes one within 48h.

A runbook covers ONE failure mode. A **playbook** (the § Emergency Procedures)
routes between runbooks. Do not merge them into one document.

The one-page emergency entry point is [`docs/INCIDENT_CARD.md`](../../docs/INCIDENT_CARD.md) —
read it first if the incident is already live.

## Alert Response

| Alert | Severity | Runbook | Last drilled |
|---|---|---|---|
| `ControlRoomDown` | P1 | [alerts/control-room-down.md](alerts/control-room-down.md) | — |
| `HibernationWakeFail` | P1 | [alerts/hibernation-wake-fail.md](alerts/hibernation-wake-fail.md) | — |
| `BackpressureStorm` | P2 | [alerts/backpressure-storm.md](alerts/backpressure-storm.md) | — |
| `LearnArmStuck` | P3 | [alerts/learn-arm-stuck.md](alerts/learn-arm-stuck.md) | — |
| `WledOffline` | P3 | [alerts/wled-offline.md](alerts/wled-offline.md) | — |
| `D1SchemaDrift` | P1 | [alerts/d1-schema-drift.md](alerts/d1-schema-drift.md) | — |

## Standard Operations

| Operation | Runbook | Cadence |
|---|---|---|
| Deploy the Worker | [operations/deploy.md](operations/deploy.md) | per release |
| Apply D1 schema | [operations/schema-apply.md](operations/schema-apply.md) | per migration |
| Rebuild the mapping projections | [operations/projection-rebuild.md](operations/projection-rebuild.md) | after drift |
| Rotate the WLED bridge address | [operations/wled-rotate.md](operations/wled-rotate.md) | on device change |
| Mint / verify forum auth tokens | [workers/docs/FORUM_AUTH.md](../../../../workers/docs/FORUM_AUTH.md) | per identity setup |

## Emergency Procedures

| Procedure | Runbook | Trigger |
|---|---|---|
| Full control-plane outage | [emergency/control-plane-outage.md](emergency/control-plane-outage.md) | SEV-1 |
| Data-integrity incident | [emergency/data-integrity.md](emergency/data-integrity.md) | SEV-1 |
| Runaway agent | [emergency/runaway-agent.md](emergency/runaway-agent.md) | SEV-1 |

## Change Procedures

| Change | Runbook |
|---|---|
| Canon event-kind addition | [changes/canon-event-add.md](changes/canon-event-add.md) |
| DO class addition | [changes/do-class-add.md](changes/do-class-add.md) |

## Policies

- [SLO & Error Budget Policy](policies/slo-error-budget.md)
- [On-Call & AI-First-Responder](policies/oncall.md)
- [Postmortem Template](policies/postmortem-template.md)
- [Production Readiness Review](policies/prr-checklist.md)

## Drill Log

| Date | Runbook | Type | Outcome | Action items |
|---|---|---|---|---|
| — | — | — | — | — |

Drill cadence: P1 runbooks monthly, P2 quarterly, emergency procedures
quarterly, change procedures after each use. A drilled runbook is one that has
been followed against a real or simulated alert; record the outcome here.