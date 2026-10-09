# @p31ca/governance

Governance components for the P31 audit/agent layer — the visual vocabulary of
a hash-chained, PQC-identified, co-presence-enforced agent runtime.

## Components

| Component | Purpose |
|---|---|
| `ChainTimeline` | Scrollable hash-chained event timeline; broken chain shows the exact divergence point |
| `VerifyButton` | One-click chain verification → "Chain intact across N events" |
| `EnforcementGauge` | observe vs enforce state + would-refuse counter |
| `RefusalFeed` | Every refused/observed agent action with reason (scope / session-cap / no-token) |
| `ProposalQueue` | Lumi's "proposes, never acts" proposals with Accept/Reject |
| `SovereignBadge` | Local-first / Yjs sync / PQC key status ("all data local" when offline) |
| `LumiIdentityCard` | DID, capability-scope checklist, 15-min token countdown, ML-DSA-65 badge |

## Usage

```tsx
import { ChainTimeline, VerifyButton } from '@p31ca/governance'
import { GOVERNANCE } from '@p31ca/governance/math'
```

## Installation

```bash
npm install @p31ca/governance @p31ca/design-core react react-dom
```

The implementation ships from `@p31ca/design-core/governance` (single source of
truth); this package is the enterprise-facing distribution surface.