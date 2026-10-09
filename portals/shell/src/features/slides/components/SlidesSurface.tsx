/**
 * SlidesSurface — the slides face, re-implemented from intent (see
 * docs/surface-spec.md). Container layer (slideStore/useCollabSlides) kept;
 * presentation rebuilt with canon compositions only.
 */
import { useEffect, useState } from 'react';
import { GlassPanel, GlassCard, CardBody, Button } from '@p31ca/design-core/compositions';
import { useCollabSlides } from '../hooks/useCollabSlides';
import { createDeck, deleteDeck, listDecks, renameDeck, type DeckMeta } from '../lib/slideStore';

function TitleField({
  deckId,
  initial,
  onCommitted,
}: {
  deckId: string;
  initial: string;
  onCommitted: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  useEffect(() => setDraft(initial), [initial, deckId]);
  const commit = () => {
    const next = draft.trim();
    if (next && next !== initial) void renameDeck(deckId, next).then(onCommitted);
    else if (!next) setDraft(initial);
  };
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(initial);
      }}
      className="docs-title"
      aria-label="Deck title"
    />
  );
}

export function SlidesSurface() {
  const [decks, setDecks] = useState<DeckMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const { slides, addSlide, removeSlide, moveSlide, setTitle, setBody } = useCollabSlides(
    activeId ?? '',
  );

  const refresh = async () => setDecks(await listDecks());

  useEffect(() => {
    let cancelled = false;
    void listDecks().then((list) => {
      if (cancelled) return;
      setDecks(list);
      setReady(true);
      if (list.length > 0) setActiveId(list[0].id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => setCurrent(0), [activeId]);

  const handleCreate = async () => {
    const title = window.prompt('Deck name', 'Untitled');
    if (title === null) return;
    const id = await createDeck(title.trim() || 'Untitled');
    await refresh();
    setActiveId(id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this deck?')) return;
    await deleteDeck(id);
    if (activeId === id) setActiveId(null);
    await refresh();
  };

  const activeTitle =
    decks.find((d) => d.id === activeId)?.title ?? (activeId ? 'Untitled' : '');
  const slide = slides[current] ?? null;

  // Presentation mode — fullscreen, minimal.
  if (presenting && slide) {
    return (
      <div className="slides-present" data-mcp-tool="slidesPresent" data-mcp-state="ready">
        <div className="slides-present__inner">
          <h2 className="slides-present__title">{slide.title}</h2>
          <p className="slides-present__body">{slide.body}</p>
        </div>
        <div className="slides-present__nav">
          <Button
            variant="ghost"
            onClick={() => setPresenting(false)}
          >
            Exit
          </Button>
          <span className="slides-present__count">
            slide {current + 1} of {slides.length}
          </span>
          <Button
            variant="primary"
            onClick={() => setCurrent((c) => Math.min(slides.length - 1, c + 1))}
            disabled={current >= slides.length - 1}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  return (
    <GlassPanel className="docs-surface" data-mcp-tool="slidesSurface" data-mcp-state="ready">
      <div className="docs-head">
        <h1 className="docs-head__title">Slides</h1>
        <div className="docs-actions">
          {activeId && (
            <Button variant="primary" onClick={() => setPresenting(true)}>
              Present
            </Button>
          )}
          <Button variant="primary" onClick={() => void handleCreate()}>
            + New Deck
          </Button>
        </div>
      </div>

      {!ready ? (
        <div className="docs-empty">Loading decks…</div>
      ) : decks.length === 0 ? (
        <GlassCard>
          <CardBody>
            <p>No decks yet. Create your first.</p>
          </CardBody>
        </GlassCard>
      ) : (
        <div className="docs-body">
          <aside className="docs-list">
            {decks.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setActiveId(d.id)}
                className={`docs-item${activeId === d.id ? ' is-active' : ''}`}
              >
                <span className="docs-item__title">{d.title}</span>
                <span className="docs-item__date">
                  {new Date(d.updatedAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </aside>

          <section className="docs-editor">
            {activeId ? (
              <>
                <div className="docs-editor__head">
                  <TitleField deckId={activeId} initial={activeTitle} onCommitted={refresh} />
                  <Button variant="ghost" onClick={() => void handleDelete(activeId)}>
                    Delete
                  </Button>
                </div>

                <div className="slides-body">
                  <div className="slides-rail">
                    {slides.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setCurrent(i)}
                        className={`slides-rail__item${i === current ? ' is-active' : ''}`}
                      >
                        {i + 1}. {s.title || 'Untitled'}
                      </button>
                    ))}
                    <Button variant="ghost" onClick={addSlide} className="slides-rail__add">
                      + Slide
                    </Button>
                  </div>

                  <div className="slides-edit">
                    <div className="slides-tools">
                      <Button variant="ghost" onClick={() => removeSlide(current)}>
                        Remove
                      </Button>
                      <Button variant="ghost" onClick={() => moveSlide(current, current - 1)}>
                        ↑
                      </Button>
                      <Button variant="ghost" onClick={() => moveSlide(current, current + 1)}>
                        ↓
                      </Button>
                      <span className="slides-count">
                        slide {current + 1} of {slides.length}
                      </span>
                    </div>

                    {slide ? (
                      <div className="slides-card">
                        <input
                          value={slide.title}
                          onChange={(e) => setTitle(current, e.target.value)}
                          className="slides-title"
                          aria-label="Slide title"
                        />
                        <textarea
                          value={slide.body}
                          onChange={(e) => setBody(current, e.target.value)}
                          className="slides-body-input"
                          aria-label="Slide body"
                          spellCheck={false}
                        />
                      </div>
                    ) : (
                      <div className="docs-empty">No slides — add one.</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="docs-empty">Select a deck to edit.</div>
            )}
          </section>
        </div>
      )}
    </GlassPanel>
  );
}

export default SlidesSurface;