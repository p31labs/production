/**
 * PageEditor — TipTap v3 + Yjs collaborative editor (mounted only with a doc).
 *
 * v3 binding: `@tiptap/extension-collaboration` drives the sync/undo plugins,
 * re-exported from `@tiptap/y-tiptap` (not y-prosemirror).
 */

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import type * as Y from 'yjs';

function PageEditorMounted({ doc }: { doc: Y.Doc }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: doc }),
    ],
    immediatelyRender: false,
  });

  if (!editor) return <div className="docs-empty">Loading editor…</div>;

  return <EditorContent editor={editor} className="docs-mount" />;
}

export function PageEditor({ doc }: { doc: Y.Doc | null }) {
  if (!doc) return <div className="docs-empty">Select a page to edit.</div>;
  return <PageEditorMounted doc={doc} />;
}