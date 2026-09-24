import { useEffect, useState } from 'react';
import { GlassCard, Button } from '@p31/design-core/compositions';
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
      className="flex-1 bg-transparent text-lg font-semibold text-ink outline-none border-b border-white/10 focus:border-quantum-cyan/40 py-1 min-w-0"
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
    <div className="h-full flex flex-col min-h-0" data-mcp-tool="docsSurface" data-mcp-state="ready">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-quantum-cyan font-mono-tech">Docs</h1>
        <div className="flex gap-2">
          {activeId && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setImportOpen((o) => !o)}>
                Import
              </Button>
              <div className="flex items-center gap-1.5" data-mcp-tool="forgeTheme" data-mcp-state="ready">
                <select
                  value={forgeTheme}
                  onChange={(e) => setForgeTheme(e.target.value as ForgeTheme)}
                  aria-label="Export theme"
                  className="text-xs bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-cloud/70 outline-none focus:border-quantum-cyan/40 min-h-[48px]"
                >
                  <option value="hub">Warm · hub</option>
                  <option value="scene">Dark · scene</option>
                </select>
                <Button
                  color="cyan"
                  size="sm"
                  onClick={() => void handleForgeExport()}
                  disabled={forgeBusy}
                >
                  {forgeBusy ? 'Exporting…' : 'Export · Forge'}
                </Button>
              </div>
            </>
          )}
          <Button color="cyan" size="sm" onClick={() => void handleCreate()}>
            + New Document
          </Button>
        </div>
      </div>

      {forgeMsg && (
        <div
          className={`forge-status mb-3 text-xs px-3 py-2 rounded-lg ${
            forgeMsg.startsWith('Exported') ? 'forge-status--ok' : 'forge-status--err'
          }`}
          data-mcp-tool="forgeStatus"
          data-mcp-state="ready"
        >
          {forgeMsg}
        </div>
      )}

      {importOpen && activeId && (
        <div className="mb-4">
          <ImportGoogleDialog
            kind="doc"
            targetId={activeId}
            onDone={() => setImportOpen(false)}
          />
        </div>
      )}

      {!ready ? (
        <div className="text-cloud/40 text-sm">Loading documents…</div>
      ) : docs.length === 0 ? (
        <GlassCard className="p-6 text-center text-cloud/50 text-sm">
          No documents yet. Create your first collaborative note.
        </GlassCard>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0">
          <aside className="w-56 shrink-0 border-r border-white/5 pr-3 overflow-y-auto space-y-1">
            {docs.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setActiveId(d.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors min-h-[48px] ${
                  activeId === d.id
                    ? 'bg-quantum-cyan/10 text-quantum-cyan'
                    : 'text-cloud/60 hover:bg-white/5'
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
                  <TitleField docId={activeId} initial={activeTitle} onCommitted={refresh} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(activeId)}
                  >
                    Delete
                  </Button>
                </div>
                <div className="flex gap-3 flex-1 min-h-0">
                <div
                  ref={editorRef}
                  className="flex-1 overflow-y-auto glass-panel rounded-2xl p-6 min-h-0 [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[40vh] [&_.ProseMirror]:text-ink [&_.ProseMirror]:leading-relaxed [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror]:focus:outline-none"
                  data-mcp-tool="docEditor"
                  data-mcp-state="ready"
                />
                {outline.length > 0 && (
                  <aside className="w-52 shrink-0 border-l border-white/5 pl-3 overflow-y-auto hidden lg:block">
                    <div className="text-xs text-cloud/40 font-semibold mb-3 uppercase tracking-wider">
                      Outline
                    </div>
                    <div className="flex flex-col gap-1 text-sm">
                      {outline.map((o, i) => (
                        <button
                          key={`${o.text}-${i}`}
                          type="button"
                          onClick={() => scrollOutlineTo(o.text)}
                          className="text-left text-cloud/60 hover:text-quantum-cyan transition-colors min-h-[32px]"
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
              <div className="text-cloud/40 text-sm">Select a document to edit.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default DocsSurface;