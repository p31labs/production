/**
 * shell/chat/artifactStore.ts — the per-session artifact registry.
 *
 * The dedupe key is kind + title, NOT content hash: the same kind and title
 * regenerated in a session is ONE artifact with N versions. The content hash
 * identifies a version; the kind+title identifies the artifact.
 */
import { create } from 'zustand';
import type { BusEvent } from '../../bus/events';
import type { DetectedArtifact } from './artifactDetect';
import { loadPersisted } from './artifactShareClient';

export interface ArtifactVersion {
  hash: string;
  content: string;
  createdAt: number;
}

export interface Artifact {
  key: string; // `${kind}:${title}`
  kind: string;
  title: string;
  language: string;
  versions: ArtifactVersion[];
  /** The server holds a read-only copy (the durable tier). */
  persisted?: boolean;
  /** The active share link id, when shared and not yet expired/revoked. */
  shareId?: string | null;
}

export interface ArtifactState {
  artifacts: Artifact[];
  activeKey: string | null;
  ingest(detected: DetectedArtifact[]): void;
  setActive(key: string): void;
  /** The durable tier: hydrate from artifact.persisted, track share lifecycle. */
  apply(ev: BusEvent): void;
  setShare(key: string, shareId: string | null): void;
}

/** A cheap deterministic hash for in-session version identity. */
function contentHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

/** Keys whose stored copy has already been requested this page-load. */
const hydratedKeys = new Set<string>();

export const useArtifactStore = create<ArtifactState>((set, get) => ({
  artifacts: [],
  activeKey: null,

  ingest(detected) {
    const artifacts = [...get().artifacts];
    for (const d of detected) {
      const key = `${d.kind}:${d.title}`;
      const hash = contentHash(d.content);
      const existing = artifacts.find((a) => a.key === key);
      if (existing) {
        if (!existing.versions.some((v) => v.hash === hash)) {
          existing.versions.push({ hash, content: d.content, createdAt: Date.now() });
        }
      } else {
        artifacts.push({
          key,
          kind: d.kind,
          title: d.title,
          language: d.language,
          versions: [{ hash, content: d.content, createdAt: Date.now() }],
        });
      }
    }
    set({ artifacts, activeKey: get().activeKey ?? (artifacts[0]?.key ?? null) });
  },

  setActive(key) {
    set({ activeKey: key });
  },

  setShare(key, shareId) {
    patchArtifact(key, { shareId });
  },

  apply(ev) {
    if (ev.type === 'artifact.persisted') {
      // The durable tier: the ledger audited the hash, the copy has the bytes.
      // Pull them back read-only and ingest — one fetch per key per page.
      const e = ev as unknown as { sessionId?: string; artifactKey?: string };
      const sessionId = e.sessionId ?? '';
      const key = e.artifactKey ?? '';
      if (!sessionId || !key || hydratedKeys.has(key)) return;
      hydratedKeys.add(key);
      void loadPersisted(sessionId, key).then((detected) => {
        if (!detected) { hydratedKeys.delete(key); return; } // transient — retry next replay
        get().ingest([detected]);
        patchArtifact(key, { persisted: true });
      });
      return;
    }
    if (ev.type === 'artifact.shared') {
      const e = ev as unknown as { artifactKey?: string; shareId?: string };
      if (e.artifactKey && e.shareId) patchArtifact(e.artifactKey, { persisted: true, shareId: e.shareId });
      return;
    }
    if (ev.type === 'artifact.share.expired') {
      const e = ev as unknown as { artifactKey?: string; shareId?: string };
      if (!e.artifactKey) return;
      set({
        artifacts: get().artifacts.map((a) =>
          a.key === e.artifactKey && (!e.shareId || a.shareId === e.shareId)
            ? { ...a, shareId: null, persisted: false }
            : a,
        ),
      });
    }
  },
}));

/** Patch one artifact in place; a no-op for an unknown key (no re-render). */
function patchArtifact(key: string, patch: Partial<Artifact>) {
  const artifacts = useArtifactStore.getState().artifacts;
  const idx = artifacts.findIndex((a) => a.key === key);
  if (idx < 0) return;
  const next = [...artifacts];
  next[idx] = { ...next[idx]!, ...patch };
  useArtifactStore.setState({ artifacts: next });
}

/** Resolve the active artifact + its latest version. */
export function activeArtifact(state: ArtifactState): { artifact: Artifact | undefined; content: string; version: number } {
  const artifact = state.artifacts.find((a) => a.key === state.activeKey);
  const version = artifact?.versions.length ?? 0;
  const content = artifact?.versions[version - 1]?.content ?? '';
  return { artifact, content, version };
}