import { useRef, useEffect, useCallback } from 'react';
import { useSandboxStore, useSandboxPersistence } from '../../features/sandbox';
import SandboxChat from '../../features/sandbox/SandboxChat';
import ArtifactPane from '../../features/sandbox/ArtifactPane';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { Button } from '@p31ca/design-core/compositions';
import './studio.css';

const STORAGE_KEY = 'qpj-sandbox-split';
const MIN_RATIO = 30;
const MAX_RATIO = 70;

export default function Studio() {
  useSandboxPersistence();

  const addArtifact = useSandboxStore((s) => s.addArtifact);
  const setActiveArtifact = useSandboxStore((s) => s.setActiveArtifact);
  const activeArtifactId = useSandboxStore((s) => s.activeArtifactId);
  const artifactOpen = useSandboxStore((s) => s.artifactOpen);
  const setArtifactOpen = useSandboxStore((s) => s.setArtifactOpen);
  const toggleArtifact = useSandboxStore((s) => s.toggleArtifact);
  const splitPosition = useSandboxStore((s) => s.splitPosition);
  const setSplitPosition = useSandboxStore((s) => s.setSplitPosition);

  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 899px)');

  const persistedRef = useRef<{ open: boolean; ratio: number } | null>(null);
  if (!persistedRef.current) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.open === 'boolean' && typeof parsed.ratio === 'number') {
          persistedRef.current = { open: parsed.open, ratio: parsed.ratio };
        }
      }
    } catch {
      /* ignore unreadable split */
    }
    if (!persistedRef.current) {
      persistedRef.current = { open: !!activeArtifactId, ratio: 50 };
    }
  }
  const persisted = persistedRef.current;

  useEffect(() => {
    if (persisted.ratio !== splitPosition) setSplitPosition(persisted.ratio);
    if (persisted.open !== artifactOpen) setArtifactOpen(persisted.open);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const clamped = Math.max(MIN_RATIO, Math.min(MAX_RATIO, splitPosition));
    el.style.setProperty('--split-a', `${clamped}fr`);
    el.style.setProperty('--split-b', `${100 - clamped}fr`);
  }, [splitPosition]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ open: artifactOpen, ratio: splitPosition }));
  }, [artifactOpen, splitPosition]);

  useEffect(() => {
    setArtifactOpen(!!activeArtifactId);
  }, [activeArtifactId, setArtifactOpen]);

  const handleArtifactGenerated = useCallback((title: string, html: string) => {
    addArtifact(title, html, html);
  }, [addArtifact]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const handle = e.currentTarget as HTMLDivElement;
    handle.setPointerCapture(e.pointerId);
    const container = containerRef.current;
    if (!container) return;
    const doc = handle.ownerDocument;

    const onMove = (ev: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPosition(Math.max(MIN_RATIO, Math.min(MAX_RATIO, pct)));
    };

    const onUp = () => {
      doc.removeEventListener('pointermove', onMove);
      doc.removeEventListener('pointerup', onUp);
      handle.releasePointerCapture(e.pointerId);
    };

    doc.addEventListener('pointermove', onMove);
    doc.addEventListener('pointerup', onUp, { once: true });
  }, [setSplitPosition]);

  const closeMobileDrawer = useCallback(() => {
    setArtifactOpen(false);
  }, [setArtifactOpen]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const name = e.dataTransfer.getData('component-name');
    if (!name) return;
    try {
      const artifact = addArtifact(`${name} surface`, `<div data-dropped="${name}">${name} component</div>`, `<div data-dropped="${name}">${name} component</div>`);
      setActiveArtifact(artifact.id);
    } catch {
      /* no active thread — component will be available next session */
    }
  }, [addArtifact, setActiveArtifact]);

  return (
    <div className="studio-zone" onDragOver={handleDragOver} onDrop={handleDrop}>
      {isMobile ? (
        <div className="chat-mobile-layout">
          <SandboxChat onArtifactGenerated={handleArtifactGenerated} />
          {artifactOpen && (
            <div className="studio-overlay" role="dialog" aria-label="Artifact preview">
              <div className="studio-overlay-head">
                <span className="studio-overlay-title">Artifact preview</span>
                <Button variant="ghost" size="sm" onClick={closeMobileDrawer}>
                  Close
                </Button>
              </div>
              <div className="studio-overlay-body">
                <ArtifactPane />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="surface-split--resizable surface-split--col"
          data-artifact={artifactOpen ? 'open' : 'closed'}
        >
          <SandboxChat onArtifactGenerated={handleArtifactGenerated} />

          <div
            className={`surface-split-handle${artifactOpen ? ' surface-split-handle--visible' : ' surface-split-handle--hidden'}`}
            onPointerDown={handlePointerDown}
            onDoubleClick={toggleArtifact}
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
          />

          <div className={`artifact-pane-wrap${artifactOpen ? '' : ' surface-split-handle--hidden'}`}>
            <ArtifactPane />
          </div>
        </div>
      )}
    </div>
  );
}