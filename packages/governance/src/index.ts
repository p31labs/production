/**
 * @file @p31ca/governance — governance components facade.
 * Re-exports the audit/agent-layer components from @p31ca/design-core so
 * consumers get a dedicated entry point. The implementation lives in
 * design-core (single source of truth; tokens ship from there); this package
 * provides the enterprise-facing distribution surface.
 */

export {
  ChainTimeline,
  VerifyButton,
  EnforcementGauge,
  RefusalFeed,
  ProposalQueue,
  SovereignBadge,
  LumiIdentityCard,
} from '@p31ca/design-core/governance';

export type {
  ChainEvent,
  ChainTimelineProps,
  VerifyResult,
  VerifyButtonProps,
  EnforcementMode,
  EnforcementGaugeProps,
  Refusal,
  RefusalReason,
  RefusalFeedProps,
  Proposal,
  ProposalQueueProps,
  SyncState,
  SovereignBadgeProps,
  LumiScope,
  LumiIdentityCardProps,
} from '@p31ca/design-core/governance';

export { GOVERNANCE, DENSITY, densityForSpoons } from '@p31ca/design-core/tokens';
export type { DensityLevel } from '@p31ca/design-core/tokens';