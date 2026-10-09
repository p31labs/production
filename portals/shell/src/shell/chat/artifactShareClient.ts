/**
 * shell/chat/artifactShareClient.ts — the client half of artifact sharing.
 *
 * `shareArtifact()` is the ONLY path that persists: it always posts
 * explicitShare: true (the server refuses anything else), so a copy is created
 * by a deliberate act — never by an automatic sync.
 *
 * `loadPersisted()` is the durable tier's read path: given a session and an
 * artifact key it pulls the stored copy back after the session is gone.
 */
import type { DetectedArtifact } from './artifactDetect';

export interface ShareResult {
  shareId: string;
  expiresAt: number;
  contentHash: string;
}

export interface ShareRequest {
  sessionId: string;
  artifactKey: string;
  artifact: DetectedArtifact;
  authorDid?: string;
  retentionSecs?: number;
}

/** Create a read-only copy + its ledger audit. Returns null on refusal/failure. */
export async function shareArtifact(req: ShareRequest): Promise<ShareResult | null> {
  try {
    const res = await fetch('/api/artifacts/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: req.sessionId,
        artifactKey: req.artifactKey,
        kind: req.artifact.kind,
        title: req.artifact.title,
        content: req.artifact.content,
        authorDid: req.authorDid,
        retentionSecs: req.retentionSecs,
        explicitShare: true,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ShareResult;
  } catch {
    return null;
  }
}

/** End a share ahead of its retention window (audited as expired). */
export async function revokeShare(shareId: string, sessionId?: string): Promise<boolean> {
  try {
    const res = await fetch('/api/artifacts/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shareId, sessionId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** The link to a stored copy — it resolves to the read-only copy, nothing else. */
export function shareLink(shareId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/api/artifacts/share?shareId=${encodeURIComponent(shareId)}`;
}

/** Put the share link on the clipboard. Returns false when it cannot. */
export async function copyShareLink(shareId: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(shareLink(shareId));
    return true;
  } catch {
    return false;
  }
}

/** Read a stored copy back (the durable tier's rehydrate path). */
export async function loadPersisted(sessionId: string, artifactKey: string): Promise<DetectedArtifact | null> {
  try {
    const qs = new URLSearchParams({ session: sessionId, key: artifactKey });
    const res = await fetch(`/api/artifacts/share?${qs.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { kind?: string; title?: string; content?: string };
    if (typeof data.content !== 'string') return null;
    const kind = data.kind === 'html' || data.kind === 'svg' ? data.kind : 'code';
    return {
      kind,
      title: data.title ?? artifactKey,
      language: kind === 'code' ? 'code' : kind,
      content: data.content,
    };
  } catch {
    return null;
  }
}
