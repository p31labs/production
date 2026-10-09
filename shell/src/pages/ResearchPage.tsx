import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getCachedPapers, mapPaperToMath } from '../lib/zenodo';
import type { ZenodoPaper } from '../lib/zenodo';
import { SicPovmViz, PosnerViz, K4Viz, EntropyViz, MorphoViz, GenesisViz, WyeDeltaMorph, CurvatureExplorer, RigidityExplorer, SicPovmTomography, RateDistortionTransducer, useResearchClock } from '../components/ResearchViz';
import GlassCard from '../components/ui/GlassCard';
import PageHeader from '../components/PageHeader';

const VIZ_LIST = [
  { name: 'SIC-POVM d=2', Component: SicPovmViz },
  { name: 'Posner Molecule', Component: PosnerViz },
  { name: 'K\u2084 Planar Graph', Component: K4Viz },
  { name: 'Von Neumann Entropy', Component: EntropyViz },
  { name: 'Morphogenetic Field', Component: MorphoViz },
  { name: 'Bandit Arms (Genesis)', Component: GenesisViz },
  { name: 'Wye \u2194 Delta Morph', Component: WyeDeltaMorph },
  { name: 'Ricci Curvature', Component: CurvatureExplorer },
  { name: 'Maxwell Rigidity', Component: RigidityExplorer },
  { name: 'SIC-POVM Tomography', Component: SicPovmTomography },
  { name: 'Rate-Distortion', Component: RateDistortionTransducer },
];

const DEFAULT_INTERVAL = 8;

export default function ResearchPage() {
  const showToast = useAppStore((s) => s.showToast);
  const [papers, setPapers] = useState<ZenodoPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [speed, setSpeed] = useState(DEFAULT_INTERVAL);
  const [transitioning, setTransitioning] = useState(false);
  const [userInteracting, setUserInteracting] = useState(false);
  const papersRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clock = useResearchClock();

  const cycleViz = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIdx((prev) => (prev + 1) % VIZ_LIST.length);
      setTransitioning(false);
    }, 100);
  }, []);

  useEffect(() => {
    if (clock.paused || speed === 0) return;
    const ms = speed * 1000;
    const iv = setInterval(cycleViz, ms);
    return () => clearInterval(iv);
  }, [clock.paused, speed, cycleViz]);

  const loadPapers = useCallback(() => {
    setLoading(true);
    getCachedPapers()
      .then(setPapers)
      .catch((e) => showToast('Failed to load papers from Zenodo', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    loadPapers();
  }, [loadPapers]);

  // Highlight matching paper when viz changes
  useEffect(() => {
    if (!papersRef.current) return;
    const cards = papersRef.current.querySelectorAll('.akinator-question-card');
    cards.forEach((c) => c.classList.remove('accented'));
    if (cards[currentIdx]) {
      (cards[currentIdx] as HTMLElement).classList.add('accented');
      (cards[currentIdx] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentIdx]);

  const handleUserAction = () => {
    setUserInteracting(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setUserInteracting(false), 5000);
  };

  const CurrentViz = VIZ_LIST[currentIdx].Component;

  return (
    <div className="page-fill">
      <PageHeader
        title="P31 Research Library"
        icon={<span style={{ fontSize: 28 }}>{'\uD83D\uDCDA'}</span>}
        pageKey="research"
        controls={
          <div className="viz-control">
            <span className="viz-label" aria-live="polite">{VIZ_LIST[currentIdx].name}</span>
            <nav className="viz-dots" aria-label="Visualization carousel">
              {VIZ_LIST.map((viz, i) => (
                <button
                  key={viz.name}
                  type="button"
                  onClick={() => { handleUserAction(); setCurrentIdx(i); }}
                  aria-current={i === currentIdx ? 'true' : undefined}
                  style={{
                    background: i === currentIdx ? 'var(--p31-accent)' : 'var(--p31-text-tertiary)',
                    border: 'none', cursor: 'pointer',
                    transition: 'background var(--p31-duration-instant)',
                    padding: 0,
                  }}
                  aria-label={`${viz.name} visualization`}
                />
              ))}
            </nav>
            <div className="viz-speed">
              <span style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)', flexShrink: 0 }}>{speed}s</span>
              <input
                type="range"
                className="research-speed-slider"
                min={1}
                max={30}
                value={speed}
                onChange={(e) => { handleUserAction(); setSpeed(Number(e.target.value)); }}
                aria-label="Carousel speed in seconds"
              />
              <span style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)', flexShrink: 0 }}>30s</span>
            </div>
            <button
              type="button"
              className="btn primary"
              onClick={() => clock.setPaused(!clock.paused)}
            >
              {clock.paused ? '\u25B6 Play' : '\u23F8 Pause'}
            </button>
          </div>
        }
      />

      <div className="research-split">
        <div className="research-left-papers" ref={papersRef} onScroll={handleUserAction}>
          {loading ? (
            <p style={{ color: 'var(--p31-text-tertiary)', fontSize: 'var(--p31-scale-sm)' }}>Loading from Zenodo\u2026</p>
          ) : papers.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-sm)', alignItems: 'flex-start', padding: 'var(--p31-space-sm)' }}>
              <p style={{ margin: 0, color: 'var(--p31-text-secondary)', fontSize: 'var(--p31-scale-sm)' }}>No papers found from Zenodo.</p>
              <button type="button" className="btn ghost" onClick={loadPapers} style={{ minHeight: 44 }}>↻ Retry</button>
            </div>
          ) : (
            papers.map((paper, i) => {
              const mathTags = mapPaperToMath(paper);
              return (
                <GlassCard
                  key={paper.id}
                  data-paper-index={i}
                  className="akinator-question-card research-paper-item"
                  variant="default"
                  title={
                    <div className="akinator-question-label">
                      {paper.date?.slice(0, 10)} · <a href={paper.links.html} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--p31-accent)' }}>DOI</a>
                    </div>
                  }
                >
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--p31-text)', fontSize: 'var(--p31-scale-sm)' }}>{paper.title}</p>
                  <p style={{ margin: 0, color: 'var(--p31-text-tertiary)', fontSize: 'var(--p31-scale-xs)', lineHeight: 1.5 }}>
                    {paper.description?.slice(0, 300)}{(paper.description?.length ?? 0) > 300 ? '\u2026' : ''}
                  </p>
                  {mathTags.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {mathTags.map((tag) => (
                        <span key={tag} className="badge" style={{ padding: '2px 8px', borderRadius: 999, fontSize: 'var(--p31-scale-xs)', background: 'color-mix(in oklch, var(--p31-accent) 12%, transparent)', color: 'var(--p31-accent)' }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </GlassCard>
              );
            })
          )}
        </div>

        <div className="research-right-viewport">
          <details open className="viz-details">
            <summary className="viz-summary" title="Toggle visualization stage">
              <span aria-hidden="true">{'\u25BE'}</span>
            </summary>
          </details>
          <div className="viz-body">
            <div className="research-viz-stage" style={{ opacity: transitioning ? 0 : 1, transform: transitioning ? 'scale(0.97)' : 'scale(1)' }}>
              <div className="research-viewport-demo" style={{ height: '100%' }}>
                <div
                  key={currentIdx}
                  className="viz-card"
                  style={{
                    width: '100%',
                    height: '100%',
                    animation: 'p31-viz-fade-in 0.4s ease-out',
                  }}
                >
                  <CurrentViz paused={clock.paused} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
