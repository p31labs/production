# Mesh — post-family-test go/no-go (deferred)

The spatial music maker is reached from QPJ through the SAME-ORIGIN proxy
(`functions/[[path]].ts` → the music-presence worker). The room is a Cloudflare
Durable Object — a hub-and-spoke WebSocket hub with Hibernation. This is the
authoritative transport for composition and live triggers.

A peer-to-peer WebRTC fallback (so the room works when the DO is unreachable)
was scoped as "full mesh" and is DELIBERATELY DEFERRED. This page records the
decision and the go/no-go criteria.

## What exists today

- **QPJ's presence mesh** (`src/hooks/MeshBridge.tsx` + the K₄ mesh): peerjs
  `HeartbeatMesh`, `MAX_PEERS=3`, ML-DSA-65 verified peers. It's QPJ's own
  presence layer — it does NOT talk to the music maker's room.
- **The music maker's room**: a DO (WebSocket Hibernation), authoritative for
  the composition (committed through the canon gate) and ephemeral triggers.
  Reached same-origin from QPJ via the Pages Function proxy.

## Why defer WebRTC for the instrument

1. **Two presence systems that don't talk.** QPJ's peerjs mesh and the music
   maker's DO are separate. "Full mesh" is not "add WebRTC to the music
   maker" — it's reconciling two presence systems into one, which is a bigger
   framing than the feature.
2. **The DO hub is reliable.** It survives hibernation (verified), answers
   keepalives at the edge, and reconnects with backoff+jitter. A peer-to-peer
   fallback is engineering for a failure mode the family may never hit.
3. **Consistency wins for a family instrument.** Collaborative-music research
   leans hub-and-spoke for score/trigger consistency; a P2P fallback would
   need CRDT-style convergence for the composition, which the log
   architecture deliberately avoids.

## Go/no-go criteria (evaluate after the family test)

- **GO** if: a family session on a shared network shows the DO unreachable /
  laggy enough that the room becomes unplayable, OR the family explicitly
  needs an offline / LAN-only mode.
- **NO-GO (current default)** if: the DO hub performs well in the family test
  (even on a busy home Wi-Fi). Then the WebRTC fallback is a complexity
  the family doesn't need.

## If we GO

- Reuse `packages/spaceship-earth/worker/wsSignaling.ts` (SDP/ICE relay) and
  `packages/sovereign-core/src/mesh.ts` (verified peer presence).
- The DO stays authoritative for the composition; WebRTC is a READ fallback
  (hear + presence) that converges to the DO when it's reachable.
- Signed presence (ML-DSA-65) identifies who's in the room, matching the
  identity posture from the integration scope.

## Status

**Deferred.** The same-origin proxy + DO hub is the production transport for
the family test. Revisit this page after the family test with the criteria
above.