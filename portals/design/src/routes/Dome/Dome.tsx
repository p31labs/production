/**
 * Dome — the ambient surface. The molecular-heart dome + LED controller are
 * global (DomeBackground + App.tsx), exactly like p31ca.org. This surface is
 * a transparent stage so the ambient dome shows through, plus guidance to the
 * controller chip.
 */
export default function Dome() {
  return (
    <section className="surface-panel active dome-surface" data-mcp-tool="domeSurface" data-mcp-state="ready" aria-label="Dome surface">
      <div className="dome-stage" role="img" aria-label="Molecular-heart dome background">
        <p className="dome-a11y" aria-live="polite">
          The molecular-heart dome + LED controller are live on every surface. Drag to orbit the dome · open the controller
          chip (bottom-right) to play with LED patterns, scene composition, and the LUMI scene command.
        </p>
      </div>
    </section>
  );
}