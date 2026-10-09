/**
 * DocsSurface — the docs face, re-implemented from intent (see
 * docs/surface-spec.md). The container layer (docStore/hooks/forgeExport) is
 * kept as-is; the presentation is rebuilt with canon compositions only.
 *
 * Appearance is canon-owned (var(--p31-*) tokens). The face imports zero CSS,
 * uses no Tailwind, and the only raw element is the ProseMirror editor mount
 * (which carries canon tokens, not QPJ utility classes).
 */
import { useEffect, useState } from 'react';
import { GlassPanel, GlassCard, CardBody, Button } from '@p31ca/design-core/compositions';
import { useCollabText } from '../hooks/useCollabText';
import { useDocOutline, scrollOutlineTo } from '../hooks/useDocOutline';
import {
  createDocument,
  deleteDocument,
  listDocuments,
  renameDocument,
  type DocMeta,
} from '../lib/docStore';
import { forgeExportDoc, type ForgeTheme } from '../lib/forgeExport';
import { ImportGoogleDialog } from '../../import/components/ImportGoogleDialog';

function TitleField({
  docId,
  initial,
  onCommitted,
}: {
  docId: string;
  initial: string;
  onCommitted: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  useEffect(() => setDraft(initial), [initial, docId]);
  const commit = () => {
    const next = draft.trim();
    if (next && next !== initial) void renameDocument(docId, next).then(onCommitted);
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
      aria-label="Document title"
    />
  );
}

export function DocsSurface() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [forgeTheme, setForgeTheme] = useState<ForgeTheme>('hub');
  const [forgeBusy, setForgeBusy] = useState(false);
  const [forgeMsg, setForgeMsg] = useState<string | null>(null);
  const editorRef = useCollabText(activeId ?? '');
  const { items: outline } = useDocOutline(activeId ?? '');

  const refresh = async () => setDocs(await listDocuments());

  useEffect(() => {
    let cancelled = false;
    void listDocuments().then((list) => {
      if (cancelled) return;
      setDocs(list);
      setReady(true);
      if (list.length > 0) setActiveId(list[0].id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async () => {
    const title = window.prompt('Document name', 'Untitled');
    if (title === null) return;
    const id = await createDocument(title.trim() || 'Untitled');
    await refresh();
    setActiveId(id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this document?')) return;
    await deleteDocument(id);
    if (activeId === id) setActiveId(null);
    await refresh();
  };

  const handleForgeExport = async () => {
    if (!activeId || forgeBusy) return;
    setForgeBusy(true);
    setForgeMsg(null);
    try {
      const result = await forgeExportDoc(activeId, { theme: forgeTheme });
      if ('ok' in result && result.ok) {
        setForgeMsg(`Exported "${activeTitle}" via Forge.`);
      } else {
        const err = result as { error: string; detail?: string };
        setForgeMsg(`Export failed: ${err.error}${err.detail ? ` — ${err.detail}` : ''}`);
      }
    } catch (e) {
      setForgeMsg(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setForgeBusy(false);
    }
  };

  const activeTitle =
    docs.find((d) => d.id === activeId)?.title ?? (activeId ? 'Untitled' : '');

  return (
    <GlassPanel className="docs-surface" data-mcp-tool="docsSurface" data-mcp-state="ready">
      <div className="docs-head">
        <h1 className="docs-head__title">Docs</h1>
        <div className="docs-actions">
          {activeId && (
            <>
              <Button variant="ghost" onClick={() => setImportOpen((o) => !o)}>
                Import
              </Button>
              <select
                value={forgeTheme}
                onChange={(e) => setForgeTheme(e.target.value as ForgeTheme)}
                aria-label="Export theme"
                className="docs-theme"
              >
                <option value="hub">Warm · hub</option>
                <option value="scene">Dark · scene</option>
              </select>
              <Button
                variant="primary"
                onClick={() => void handleForgeExport()}
                disabled={forgeBusy}
              >
                {forgeBusy ? 'Exporting…' : 'Export · Forge'}
              </Button>
            </>
          )}
          <Button variant="primary" onClick={() => void handleCreate()}>
            + New Document
          </Button>
        </div>
      </div>

      {forgeMsg && (
        <div
          className={`docs-status${forgeMsg.startsWith('Exported') ? ' docs-status--ok' : ' docs-status--err'}`}
          data-mcp-tool="forgeStatus"
          data-mcp-state="ready"
        >
          {forgeMsg}
        </div>
      )}

      {importOpen && activeId && (
        <div className="docs-import">
          <ImportGoogleDialog
            kind="doc"
            targetId={activeId}
            onDone={() => setImportOpen(false)}
          />
        </div>
      )}

      {!ready ? (
        <div className="docs-empty">Loading documents…</div>
      ) : docs.length === 0 ? (
        <GlassCard>
          <CardBody>
            <p>No documents yet. Create your first collaborative note.</p>
          </CardBody>
        </GlassCard>
      ) : (
        <div className="docs-body">
          <aside className="docs-list">
            {docs.map((d) => (
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
                  <TitleField docId={activeId} initial={activeTitle} onCommitted={refresh} />
                  <Button variant="ghost" onClick={() => void handleDelete(activeId)}>
                    Delete
                  </Button>
                </div>
                <div className="docs-editor__body">
                  <div
                    ref={editorRef}
                    className="docs-mount"
                    data-mcp-tool="docEditor"
                    data-mcp-state="ready"
                  />
                  {outline.length > 0 && (
                    <aside className="docs-outline">
                      <div className="docs-outline__label">Outline</div>
                      <div className="docs-outline__list">
                        {outline.map((o, i) => (
                          <button
                            key={`${o.text}-${i}`}
                            type="button"
                            onClick={() => scrollOutlineTo(o.text)}
                            className="docs-outline__item"
                            style={{ paddingLeft: `${(o.level - 1) * 12}px` }}
                          >
                            {o.text}
                          </button>
                        ))}
                      </div>
                    </aside>
                  )}
                </div>
              </>
            ) : (
              <div className="docs-empty">Select a document to edit.</div>
            )}
          </section>
        </div>
      )}
    </GlassPanel>
  );
}

export default DocsSurface;