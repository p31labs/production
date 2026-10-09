/**
 * shell/chat/ArtifactPreview.tsx — the sandboxed artifact preview.
 *
 * HTML and SVG execute inside an iframe whose sandbox is `allow-scripts` ALONE.
 * `allow-same-origin` is deliberately absent: adding it would let the artifact
 * escape to the host origin (read cookies/storage, mutate window.parent). The
 * opaque origin is the security boundary. Code renders as plain text.
 */
export interface ArtifactPreviewProps {
  kind: string;
  content: string;
  title: string;
}

export function ArtifactPreview({ kind, content, title }: ArtifactPreviewProps) {
  if (kind === 'html') {
    return (
      <iframe
        className="artifact-preview__frame"
        sandbox="allow-scripts"
        srcDoc={content}
        title={`${title} preview`}
      />
    );
  }
  if (kind === 'svg') {
    const doc = `<!doctype html><html><body>${content}</body></html>`;
    return (
      <iframe
        className="artifact-preview__frame"
        sandbox="allow-scripts"
        srcDoc={doc}
        title={`${title} preview`}
      />
    );
  }
  return <pre className="artifact-preview__text">{content}</pre>;
}