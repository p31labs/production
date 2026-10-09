/**
 * shell/chat/ArtifactCard.tsx — the transcript card for a promoted artifact.
 *
 * A compact, clickable card: icon, title, kind, version badge. Clicking opens
 * the artifact in the right-rail ArtifactPane. Rendered in the transcript above
 * the assistant message that produced it.
 */
export interface ArtifactCardProps {
  kind: string;
  title: string;
  version: number;
  onClick?: () => void;
}

const KIND_ICON: Record<string, string> = { html: '🌐', svg: '🖼️', code: '📄' };

export function ArtifactCard({ kind, title, version, onClick }: ArtifactCardProps) {
  return (
    <button type="button" className="artifact-card" onClick={onClick} aria-label={`Open artifact ${title}`}>
      <span className="artifact-card__icon" aria-hidden="true">{KIND_ICON[kind] ?? '📄'}</span>
      <span className="artifact-card__title">{title}</span>
      <span className="artifact-card__meta">{kind} · v{version}</span>
    </button>
  );
}