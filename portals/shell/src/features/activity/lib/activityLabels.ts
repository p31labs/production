/**
 * activityLabels.ts — the activity feed's allowlist and human labels.
 *
 * The feed is read-only over the bus_events ledger: only event types listed
 * here are ever surfaced, and each one maps to a short human-readable label.
 */

export const ACTIVITY_ALLOWLIST: string[] = [
  'page.created',
  'page.deleted',
  'page.restored',
  'comment.created',
  'comment.resolved',
  'comment.reopened',
  'suggestion.created',
  'suggestion.resolved',
  'session.joined',
  'session.left',
  'love.minted',
  'artifact.shared',
  'artifact.persisted',
  'run.started',
  'run.finished',
  'run.error',
  'run.interrupted',
  'run.resumed',
  'gate.verdict',
  'brain.complete',
];

export const ACTIVITY_LABELS: Record<string, string> = {
  'page.created': 'Created a page',
  'page.deleted': 'Deleted a page',
  'page.restored': 'Restored a page',
  'comment.created': 'Commented',
  'comment.resolved': 'Resolved a thread',
  'comment.reopened': 'Reopened a thread',
  'suggestion.created': 'Suggested an edit',
  'suggestion.resolved': 'Resolved a suggestion',
  'session.joined': 'Joined the session',
  'session.left': 'Left the session',
  'love.minted': 'Minted LOVE',
  'artifact.shared': 'Shared an artifact',
  'artifact.persisted': 'Persisted an artifact',
  'run.started': 'Started a run',
  'run.finished': 'Finished a run',
  'run.error': 'Run errored',
  'run.interrupted': 'Interrupted a run',
  'run.resumed': 'Resumed a run',
  'gate.verdict': 'Gate verdict',
  'brain.complete': 'Completed a brain dump',
};