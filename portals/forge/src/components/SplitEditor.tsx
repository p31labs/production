/**
 * SplitEditor — the playground's core split-pane surface.
 *
 * Left: CodeMirror 6 markdown editor (light, mobile-friendly — not Monaco).
 * Right: live-rendered iframe preview (sandboxed so the report CSS can't
 * leak into the shell). Resizable divider, live re-render on edit.
 *
 * Reference: xero/mdv + hattray/markdown-editor split-preview pattern.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { renderPreview } from '../lib/markdown';
import { useUI } from '../lib/store';

interface SplitEditorProps {
  value: string;
  onChange: (v: string) => void;
  theme: string;
  minHeight?: string;
}

export function SplitEditor({ value, onChange, theme, minHeight = '24rem' }: SplitEditorProps) {
  const editorHost = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [preview, setPreview] = useState(() => renderPreview(value, theme));
  const [splitPct, setSplitPct] = useState(50);
  const [drag, setDrag] = useState(false);
  const spoons = useUI((s) => s.spoons);
  const dark = theme === 'volt' || theme === 'aurora' || theme === 'ocean';

  // Init CodeMirror once.
  useEffect(() => {
    if (!editorHost.current || viewRef.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        ...(dark ? [oneDark] : []),
        EditorView.updateListener.of((update) => {
          const doc = update.state.doc.toString();
          setDraft(doc);
          setPreview(renderPreview(doc, theme));
          if (onChange) onChange(doc);
        }),
      ],
    });
    viewRef.current = new EditorView({ state, parent: editorHost.current });
    return () => { viewRef.current?.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update the preview when the theme changes (re-render the current draft).
  useEffect(() => { setPreview(renderPreview(draftRef.current, theme)); }, [theme]);

  // Drag the divider.
  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!drag) return;
    const rect = (document.querySelector('.split-editor') as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100));
    setSplitPct(pct);
  }, [drag]);
  useEffect(() => {
    if (drag) {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', () => setDrag(false));
      return () => { window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', () => setDrag(false)); };
    }
  }, [drag, onPointerMove]);

  return (
    <div
      className={`split-editor ${spoons <= 1 ? 'split-editor--stacked' : ''}`}
      style={{ ['--split' as string]: `${splitPct}%` }}
    >
      <div className="split-editor__pane split-editor__editor" style={{ minHeight }}>
        <div ref={editorHost} className="split-editor__cm" />
      </div>
      <div
        className="split-editor__divider"
        role="separator"
        aria-orientation="vertical"
        onPointerDown={() => setDrag(true)}
      />
      <div className="split-editor__pane split-editor__preview" style={{ minHeight }}>
        <iframe className="split-editor__iframe" title="Document preview" srcDoc={preview} sandbox="allow-same-origin" />
      </div>
    </div>
  );
}