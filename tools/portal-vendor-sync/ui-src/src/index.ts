export { initStarfield, mountStarfield } from '@p31ca/design-core/starfield';
export type { StarfieldConfig, StarfieldOptions, StarfieldInstance } from '@p31ca/design-core/starfield';
export { trackUiEvent, trackComponentUsage } from './telemetry';
export { AdaptiveLayout } from './layout/AdaptiveLayout';
export type { AdaptiveLayoutProps } from './layout/AdaptiveLayout';
export { EphemeralProvider } from './providers/EphemeralProvider';
export type { EphemeralProviderProps } from './providers/EphemeralProvider';
export { useSurfaceManager } from './hooks/useSurfaceManager';
export type { SurfaceManager, SurfaceFocusState } from './hooks/useSurfaceManager';
export { LandingShell } from './layout/LandingShell';
export type { LandingShellProps } from './layout/LandingShell';
export { WorkspaceShell } from './layout/WorkspaceShell';
export type { WorkspaceShellProps } from './layout/WorkspaceShell';
export { ConversationShell } from './layout/ConversationShell';
export type { ConversationShellProps } from './layout/ConversationShell';
export { ChatWidget } from './chat';
export type { ChatWidgetProps } from './chat';
export { mountJitterbugStarfield } from './portal/jitterbug-starfield';
export type { JitterbugStarfieldInstance, VertexData, BrightStarData, EdgeData } from './portal/jitterbug-starfield';
export {
  tetrahedronVertices, tetrahedronEdges, wyeToDelta,
  triangularBipyramidVertices, triangularBipyramidEdges,
  sicPovmProjection, computeCurvature, computeSymmetry, isRigid,
} from './portal/tetrahedron';
export type { TetraState, Vec3, Edge, NodeData } from './portal/tetrahedron';
export {
  remember, recall, listMemories, splitSentences,
  crisisCheck, taskBreakdown, timeEstimate, scheduleChunk,
  simplify, chunkText, grounding54321, meltdownPlan,
  shutdownRoutine, nextAction, memoryRemind, spacedRepetition,
  memoryEncoding, progressTrack, summarize, prioritize,
  decisionTree, motionReduce, contrastScale, deadlineGuard,
  timebox, rhythmDetect, waitEstimate, dependencyMap,
  energyMatch, habitStack, stallDiagnose, fontTune,
  noiseProfile, lightAdvice, densityScale, outline, glossary,
  questionReframe, toneShift, draftReply, meetingNotes,
  assertiveReframe, statusUpdate, supportPing, recallPrompt,
  chunkRecall, retrievalPractice, memoryCue, forgetTrack,
} from './portal/cognitive';
export type { CrisisSignal } from './portal/cognitive';
export { useWorkerHealth } from './portal/hooks/useWorkerHealth';
export type { WorkerHealthStatus, WorkerHealthEntry } from './portal/hooks/useWorkerHealth';
export { default as RestOverlay } from './portal/components/RestOverlay';
export { default as NotificationScreen } from './portal/components/NotificationScreen';
