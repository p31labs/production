import { useRef, useEffect, useCallback } from 'react';
import { ChatShell } from '@p31ca/design-core/compositions';
import { useShellStore } from '../store/useShellStore';
import { useSandboxStore, useSandboxPersistence } from '../features/sandbox';
import SandboxChat from '../features/sandbox/SandboxChat';
import ArtifactPane from '../features/sandbox/ArtifactPane';
import PageHeader from '../components/PageHeader';

const STORAGE_KEY = 'p31-sandbox-split';
const MIN_RATIO = 30;
const MAX_RATIO = 70;

interface SandboxPageProps {
  floatingTriggerRef?: React.RefObject<HTMLButtonElement | null>;
  variant?: 'page' | 'popout';
}

export default function SandboxPage({ floatingTriggerRef, variant = 'page' }: SandboxPageProps = {}) {
  useSandboxPersistence();

  const setSandboxOpen = useShellStore((s) => s.setSandboxOpen);
  const addArtifact = useSandboxStore((s) => s.addArtifact);
  const activeArtifactId = useSandboxStore((s) => s.activeArtifactId);
  const toggleSidebar = useSandboxStore((s) => s.toggleSidebar);
  const sidebarCollapsed = useSandboxStore((s) => s.sidebarCollapsed);
  const artifactOpen = useSandboxStore((s) => s.artifactOpen);
  const setArtifactOpen = useSandboxStore((s) => s.setArtifactOpen);
  const toggleArtifact = useSandboxStore((s) => s.toggleArtifact);
  const splitPosition = useSandboxStore((s) => s.splitPosition);
  const setSplitPosition = useSandboxStore((s) => s.setSplitPosition);

  const containerRef = useRef<HTMLDivElement>(null);

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
    } catch {}
    if (!persistedRef.current) {
      persistedRef.current = { open: !!activeArtifactId, ratio: 50 };
    }
  }
  const persisted = persistedRef.current;

  useEffect(() => {
    if (persisted.ratio !== splitPosition) setSplitPosition(persisted.ratio);
    if (persisted.open !== artifactOpen) setArtifactOpen(persisted.open);
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

  const popoutHeader = (
    <div className="sandbox-popout-header">
      <button
        type="button"
        className="btn ghost"
        onClick={toggleSidebar}
        style={{ padding: '4px 8px', minHeight: 32, fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-accent)' }}
        aria-label="Toggle chat sidebar"
        aria-pressed={!sidebarCollapsed}
      >
        ☰
      </button>
      <div className="sandbox-popout-actions">
        <button
          type="button"
          className="btn ghost"
          onClick={toggleArtifact}
          style={{ padding: '4px 10px', fontSize: 'var(--p31-scale-xs)', minHeight: 32, color: 'var(--p31-accent)' }}
          aria-label={artifactOpen ? 'Hide artifact panel' : 'Show artifact panel'}
          aria-pressed={artifactOpen}
        >
          {artifactOpen ? 'Hide artifact' : 'Show artifact'}
        </button>
      </div>
    </div>
  );

  const headerContent = variant === 'popout' ? popoutHeader : (
    <PageHeader
      title="Sandbox"
      icon={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn ghost"
            onClick={toggleSidebar}
            style={{ padding: '4px 8px', minHeight: 36, fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-accent)' }}
            aria-label="Toggle chat sidebar"
            aria-pressed={!sidebarCollapsed}
          >
            ☰
          </button>
          <span style={{ fontSize: 28 }}>{'\uD83D\uDEE0\uFE0F'}</span>
        </span>
      }
      pageKey="sandbox"
      controls={
        <>
          {artifactOpen && (
            <button
              type="button"
              className="btn ghost"
              onClick={toggleArtifact}
              style={{ padding: '4px 10px', fontSize: 'var(--p31-scale-xs)', minHeight: 32, color: 'var(--p31-accent)' }}
            >
              {artifactOpen ? 'Hide artifact' : 'Show artifact'}
            </button>
          )}
          <button
            type="button"
            className="btn primary"
            onClick={() => setSandboxOpen(true)}
            ref={floatingTriggerRef}
            style={{
              padding: '6px 14px',
              fontSize: 'var(--p31-scale-sm)',
              background: 'var(--p31-accent)',
              color: 'var(--p31-bg)',
              border: 'none',
            }}
          >
            ↗ Pop out
          </button>
        </>
      }
    />
  );

  return (
    <ChatShell
      header={headerContent}
      drawerLabel="Artifact"
      drawerOpen={artifactOpen}
      onCloseDrawer={toggleArtifact}
      drawer={<ArtifactPane />}
    >
      <div className={`sandbox-page${variant === 'popout' ? ' sandbox-page--popout' : ''} page-fill`} style={{ color: 'var(--p31-text)' }}>
        <div
          ref={containerRef}
          className="surface-split--resizable"
          data-artifact={artifactOpen ? 'open' : 'closed'}
          style={{ fontFamily: 'var(--p31-font-mono, monospace)' }}
        >
          <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <SandboxChat onArtifactGenerated={handleArtifactGenerated} />
          </div>

          <div
            className="surface-split-handle"
            style={{
              display: artifactOpen ? 'block' : 'none',
              background: 'var(--p31-glass-border)',
              width: 2,
            }}
            onPointerDown={handlePointerDown}
            onDoubleClick={toggleArtifact}
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
          />

          <div className="surface-split-artifact" style={{
            display: artifactOpen ? 'flex' : 'none',
            flex: 1,
            minHeight: 0,
            background: 'transparent',
            border: artifactOpen ? '1px solid var(--p31-glass-border)' : 'none',
          }}>
            <ArtifactPane />
          </div>
        </div>
      </div>
    </ChatShell>
  );
}
