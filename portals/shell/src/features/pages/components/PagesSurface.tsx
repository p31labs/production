/**
 * PagesSurface — composes PageTree + PageEditor + SuggestionBlock over the
 * page store and the per-page Yjs room.
 */

import { useEffect, useState } from 'react';
import { GlassPanel, Button } from '@p31ca/design-core/compositions';
import { usePageStore } from '../lib/pageStore';
import { usePageRoom } from '../hooks/usePageRoom';
import { PageTree } from './PageTree';
import { PageEditor } from './PageEditor';
import { SuggestionBlock, type Suggestion } from './SuggestionBlock';

export function PagesSurface() {
  const pages = usePageStore((s) => s.pages);
  const cursor = usePageStore((s) => s.cursor);
  const setPages = usePageStore((s) => s.setPages);
  const appendPage = usePageStore((s) => s.appendPage);
  const setCursor = usePageStore((s) => s.setCursor);
  const { doc, connected } = usePageRoom(cursor ?? '');
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  useEffect(() => {
    if (pages.length === 0) {
      const id = crypto.randomUUID();
      setPages([{ id, title: 'Home' }]);
      setCursor(id);
    } else if (!cursor) {
      setCursor(pages[0].id);
    }
  }, [pages, cursor, setPages, setCursor]);

  const handleCreate = () => {
    const title = window.prompt('Page name', 'Untitled');
    if (title === null) return;
    appendPage({
      id: crypto.randomUUID(),
      title: title.trim() || 'Untitled',
      parentPageId: cursor ?? undefined,
    });
  };

  const handleSuggest = () => {
    setSuggestion({
      suggestionId: crypto.randomUUID(),
      replacement: 'Replace the opening paragraph with a clearer lead.',
    });
  };

  return (
    <GlassPanel className="docs-surface" data-mcp-tool="pagesSurface" data-mcp-state="ready">
      <div className="docs-head">
        <h1 className="docs-head__title">Pages</h1>
        <div className="docs-actions">
          <span className={`docs-status${connected ? ' docs-status--ok' : ' docs-status--err'}`}>
            {connected ? 'Live' : 'Offline'}
          </span>
          <Button variant="ghost" onClick={handleSuggest}>
            Suggest
          </Button>
          <Button variant="primary" onClick={handleCreate}>
            + New Page
          </Button>
        </div>
      </div>

      <div className="docs-body">
        <aside className="docs-list">
          <PageTree pages={pages} cursor={cursor} onSelect={setCursor} />
        </aside>

        <section className="docs-editor">
          <PageEditor doc={doc} />

          {suggestion && (
            <div className="pages-suggestions">
              <SuggestionBlock
                suggestion={suggestion}
                onAccept={() => setSuggestion(null)}
                onReject={() => setSuggestion(null)}
              />
            </div>
          )}
        </section>
      </div>
    </GlassPanel>
  );
}

export default PagesSurface;