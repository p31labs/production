import { useEffect, useState } from 'react';
import { GlassCard, Button } from '@p31ca/design-core/compositions';
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
      className="flex-1 bg-transparent text-lg font-semibold text-ink outline-none border-b border-white/10 focus:border-quantum-violet/40 py-1 min-w-0"
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
  const slide = slides[current];

  if (presenting && slide) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-center p-12"
        data-mcp-tool="slidesPresent"
        data-mcp-state="ready"
      >
        <p className="text-4xl md:text-5xl font-bold text-ink mb-6 max-w-4xl">{slide.title}</p>
        <p className="text-xl md:text-2xl text-cloud/80 whitespace-pre-wrap max-w-3xl">
          {slide.body}
        </p>
        <div className="absolute bottom-8 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setCurrent((c) => Math.max(0, c - 1))}>
            ‹ Prev
          </Button>
          <span className="text-cloud/40 text-sm font-mono">
            {current + 1} / {slides.length}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setCurrent((c) => Math.min(slides.length - 1, c + 1))}>
            Next ›
          </Button>
          <Button size="sm" onClick={() => setPresenting(false)}>
            Exit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0" data-mcp-tool="slidesSurface" data-mcp-state="ready">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-quantum-violet font-mono-tech">Slides</h1>
        <Button color="violet" size="sm" onClick={() => void handleCreate()}>
          + New Deck
        </Button>
      </div>

      {!ready ? (
        <div className="text-cloud/40 text-sm">Loading decks…</div>
      ) : decks.length === 0 ? (
        <GlassCard className="p-6 text-center text-cloud/50 text-sm">
          No decks yet. Create your first collaborative presentation.
        </GlassCard>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0">
          <aside className="w-56 shrink-0 border-r border-white/5 pr-3 overflow-y-auto space-y-1">
            {decks.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setActiveId(d.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors min-h-[48px] ${
                  activeId === d.id ? 'bg-quantum-violet/10 text-quantum-violet' : 'text-cloud/60 hover:bg-white/5'
                }`}
              >
                <span className="block truncate">{d.title}</span>
                <span className="block text-xs text-cloud/30 mt-0.5">
                  {new Date(d.updatedAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </aside>

          <section className="flex-1 min-w-0 flex flex-col min-h-0">
            {activeId ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <TitleField deckId={activeId} initial={activeTitle} onCommitted={refresh} />
                  <Button variant="ghost" size="sm" onClick={() => void handleDelete(activeId)}>
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPresenting(true)}>
                    Present
                  </Button>
                </div>

                <div className="flex gap-3 flex-1 min-h-0">
                  <div className="w-40 shrink-0 space-y-2 overflow-y-auto">
                    {slides.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setCurrent(i)}
                        className={`w-full text-left px-2 py-2 rounded-lg text-xs min-h-[48px] truncate ${
                          i === current ? 'bg-quantum-violet/10 text-quantum-violet' : 'text-cloud/60 hover:bg-white/5'
                        }`}
                      >
                        {i + 1}. {s.title || 'Untitled'}
                      </button>
                    ))}
                    <Button variant="ghost" size="sm" className="w-full" onClick={addSlide}>
                      + Slide
                    </Button>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => removeSlide(current)}>
                        Remove
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => moveSlide(current, current - 1)}>
                        ↑
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => moveSlide(current, current + 1)}>
                        ↓
                      </Button>
                      <span className="text-cloud/40 text-xs ml-auto font-mono">
                        slide {current + 1} of {slides.length}
                      </span>
                    </div>

                    {slide ? (
                      <div className="flex-1 glass-panel rounded-2xl p-6 flex flex-col gap-4 min-h-0">
                        <input
                          value={slide.title}
                          onChange={(e) => setTitle(current, e.target.value)}
                          className="bg-transparent text-2xl font-bold text-ink outline-none border-b border-white/10 focus:border-quantum-violet/40 py-1"
                          aria-label="Slide title"
                        />
                        <textarea
                          value={slide.body}
                          onChange={(e) => setBody(current, e.target.value)}
                          className="flex-1 bg-transparent text-base text-ink outline-none resize-none min-h-0"
                          aria-label="Slide body"
                          spellCheck={false}
                        />
                      </div>
                    ) : (
                      <div className="text-cloud/40 text-sm">No slides — add one.</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-cloud/40 text-sm">Select a deck to edit.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default SlidesSurface;