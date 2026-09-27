import { Button } from '@p31ca/design-core/compositions';
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
          <span className="artifact-footer-status artifact-footer-status--warning">Monitor unavailable</span>
        )}
        {monitorStatus !== 'running' && monitorStatus !== 'error' && m && (
          <>
            <span>Score: {m.score ?? '-'}</span>
            <span>Dup: {m.duplication_pct != null ? `${m.duplication_pct}%` : '-'}</span>
            <span className={`artifact-footer-status${m.valid ? ' artifact-footer-status--ok' : ' artifact-footer-status--error'}`}>
              {m.valid ? 'Valid' : 'Invalid'}
            </span>
          </>
        )}
        {monitorStatus !== 'running' && monitorStatus !== 'error' && !m && (
          <span className="artifact-footer-status artifact-footer-status--muted">No monitor data</span>
        )}
      </div>

      <div className="artifact-footer-versions">
        <label htmlFor="version-slider" className="artifact-footer-label">v{activeVersion + 1} / {totalVersions}</label>
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
        <Button variant="ghost" onClick={onDeploy} disabled={deploying}>
          {deploying ? 'Deploying…' : 'Deploy'}
        </Button>
        <Button variant="ghost" onClick={onCopy}>Copy</Button>
        <Button variant="ghost" onClick={onDownload}>Download</Button>
        <Button variant="ghost" onClick={onExportZip}>Export ZIP</Button>
      </div>
    </div>
  );
}
