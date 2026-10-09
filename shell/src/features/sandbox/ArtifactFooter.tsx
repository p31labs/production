import type { Artifact } from './sandboxStore';
import type { MonitorStatus } from './ArtifactPane';

interface ArtifactFooterProps {
  artifact: Artifact;
  activeVersion: number;
  onVersionClick: (index: number) => void;
  onDeploy: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onExportZip: () => void;
  onPopOut: () => void;
  monitorStatus: MonitorStatus;
  deploying: boolean;
}

export default function ArtifactFooter({
  artifact,
  activeVersion,
  onVersionClick,
  onDeploy,
  onCopy,
  onDownload,
  onExportZip,
  onPopOut,
  monitorStatus,
  deploying,
}: ArtifactFooterProps) {
  const m = artifact.monitor;
  const totalVersions = artifact.versions.length;
  const maxVersion = Math.max(0, totalVersions - 1);

  return (
    <div className="artifact-footer">
      <div className="artifact-footer-strip">
        {monitorStatus === 'running' && (
          <span className="monitor-status">
            <span className="status-dot" aria-hidden="true" /> Analyzing…
          </span>
        )}
        {monitorStatus === 'error' && (
          <span style={{ color: 'var(--p31-status-warning)' }}>Monitor unavailable</span>
        )}
        {monitorStatus !== 'running' && monitorStatus !== 'error' && m && (
          <>
            <span>Score: {m.score ?? '-'}</span>
            <span>Dup: {m.duplication_pct != null ? `${m.duplication_pct}%` : '-'}</span>
            <span style={{ color: m.valid ? 'var(--p31-status-online)' : 'var(--p31-status-error)' }}>
              {m.valid ? '\u2713 Valid' : '\u2717 Invalid'}
            </span>
          </>
        )}
        {monitorStatus !== 'running' && monitorStatus !== 'error' && !m && (
          <span style={{ color: 'var(--p31-text-tertiary)' }}>No monitor data</span>
        )}
      </div>

      <div className="artifact-footer-versions">
        <label htmlFor="version-slider" style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>
          v{activeVersion + 1} / {totalVersions}
        </label>
        <input
          id="version-slider"
          type="range"
          min={0}
          max={maxVersion}
          value={activeVersion}
          onChange={(e) => onVersionClick(Number(e.target.value))}
        />
      </div>

      <div className="artifact-footer-actions">
        <button type="button" className="btn ghost" style={{ padding: '4px 10px', fontSize: 'var(--p31-scale-xs)', minHeight: 28 }} onClick={onDeploy} disabled={deploying}>
          {deploying ? 'Deploying…' : 'Deploy'}
        </button>
        <button type="button" className="btn ghost" style={{ padding: '4px 10px', fontSize: 'var(--p31-scale-xs)', minHeight: 28 }} onClick={onCopy}>Copy</button>
        <button type="button" className="btn ghost" style={{ padding: '4px 10px', fontSize: 'var(--p31-scale-xs)', minHeight: 28 }} onClick={onDownload}>Download</button>
        <button type="button" className="btn ghost" style={{ padding: '4px 10px', fontSize: 'var(--p31-scale-xs)', minHeight: 28 }} onClick={onExportZip}>Export ZIP</button>
        <button type="button" className="btn ghost" style={{ padding: '4px 10px', fontSize: 'var(--p31-scale-xs)', minHeight: 28 }} onClick={onPopOut}>
          {'\u2197'} Pop out
        </button>
      </div>
    </div>
  );
}
