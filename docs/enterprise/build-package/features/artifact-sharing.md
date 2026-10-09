<!-- P31-HEADER
id: p31_feature_artifact_sharing_20261006_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Feature: Artifact Sharing

## The invariant

An artifact can be shared as a read-only link; the share stores a server-side
copy and appends an `artifact.shared` event to the ledger; the copy is revoked
by a retention sweep that is itself a ledger event; and an artifact survives the
session it was created in.

## The boundary

This feature does **not** own:

- **Detection** — Wave 6's `detectArtifacts` owns what becomes an artifact.
- **The viewer** — Wave 6's `ArtifactPane` owns the preview and source toggle.
- **Collaborative editing** — a shared copy is read-only. Multi-player editing
  is a later wave and a different feature.
- **Authentication** — the share link's access is the workspace membership.

Four rules this feature owns outright:

1. **Nothing is persisted unless the author shares it.** A share is an explicit
   action, not an automatic sync.
2. **The share is a ledger event.** `artifact.shared` carries the artifact key,
   the share id, the author's did, and the retention window.
3. **The retention window is enforced by a logged sweep.** The copy's life is
   bounded; the sweep appends `artifact.share.expired` before it deletes.
4. **The durable tier is the ledger, not a new store.** An artifact that
   survives its session is a `artifact.persisted` event carrying the content
   hash. The bytes are not in the event payload — the event audits the hash; a
   separate row holds the content.

## The implementation

| File | What it provides |
|---|---|
| `functions/api/artifacts/share.ts` | `POST` a share; appends `artifact.shared`, stores a read-only copy |
| `functions/api/artifacts/sweep.ts` | the retention sweep; appends `artifact.share.expired` |
| `src/shell/chat/artifactShareClient.ts` | the client: share, revoke, copy-link |
| `src/bus/events.ts` | *(modified)* `artifact.shared`, `artifact.share.expired`, `artifact.persisted` |
| `src/shell/chat/artifactStore.ts` | *(modified)* the durable tier: hydrate from `artifact.persisted` |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| explicit share | nothing persisted until Share is clicked | auto-sync → every artifact durable |
| ledger event | a share appends `artifact.shared` with the author did | no event → unauditable share |
| retention sweep | copy deleted at the window; `artifact.share.expired` appended | copy outlives the window |
| durable tier | session ends; artifact rehydrates from `artifact.persisted` | artifact gone |
| read-only | shared copy renders in the viewer, not an editor | copy editable |

## The gate

```bash
node scripts/gate.mjs --feature artifact-sharing
```

## The escalation

When this feature blocks a surface, the surface does not ship with sharing. A
share that is not audited is a data leak with a URL.