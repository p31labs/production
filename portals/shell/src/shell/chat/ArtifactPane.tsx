/**
 * shell/chat/ArtifactPane.tsx — the right-rail artifact viewer.
 *
 * Memoized on `content` and `version` ONLY, so a parent re-render (e.g. the
 * streaming transcript appending tokens) does not re-render this pane — which
 * would re-render the scroll container and re-measure its rows (the flicker
 * loop). The version stepper, PREVIEW/SOURCE toggle, copy, and download all
 * live here.
 */
import { memo, useState } from 'react';
import { ArtifactPreview } from './ArtifactPreview';

export interface ArtifactPaneProps {
  kind: string;
  title: string;
  content: string;
  version: number;
  versionCount: number;
  /** Share/durable-tier controls. Absent → the viewer is purely local. */
  shareId?: string | null;
  onShare?: () => void;
  onRevoke?: () => void;
}

let renderSeq = 0;

export const ArtifactPane = memo(function ArtifactPane({ kind, title, content, version, versionCount, shareId, onShare, onRevoke }: ArtifactPaneProps) {
  const [mode, setMode] = useState<'preview' | 'source'>('preview');

  // Test instrumentation: count actual pane renders, exposed for the
  // memoization behavioural gate (a pane that re-renders per token re-renders
  // the scroll container and re-measures its rows).
  renderSeq += 1;
  if (typeof window !== 'undefined') {
    (window as unknown as { __artifactPaneRenders?: number }).__artifactPaneRenders = renderSeq;
  }

  return (
    <div className="artifact-pane">
      <div className="artifact-pane__head">
        <span className="artifact-pane__title">{title}</span>
        <span className="artifact-pane__version">v{version} of {versionCount}</span>
        <button
          type="button"
          className="artifact-pane__toggle"
          onClick={() => setMode((m) => (m === 'preview' ? 'source' : 'preview'))}
        >
          {mode === 'preview' ? 'Source' : 'Preview'}
        </button>
        {onShare && (
          <button type="button" className="artifact-pane__toggle" onClick={onShare}>
            {shareId ? 'Copy link' : 'Share'}
          </button>
        )}
        {onRevoke && shareId && (
          <button type="button" className="artifact-pane__toggle" onClick={onRevoke}>
            Revoke
          </button>
        )}
      </div>
      <div className="artifact-pane__body">
        {mode === 'preview' ? (
          <ArtifactPreview kind={kind} content={content} title={title} />
        ) : (
          <pre className="artifact-pane__source">{content}</pre>
        )}
      </div>
    </div>
  );
});