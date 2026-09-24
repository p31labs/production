/**
 * @file useCollabText.ts — ProseMirror + y-prosemirror collaborative editor.
 */

import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { ySyncPlugin, yCursorPlugin, yUndoPlugin, undo, redo } from 'y-prosemirror';
import { getDoc, getDocAwareness, persistDoc } from '../lib/docStore';
import { editorSchema } from '../lib/editorSchema';

export function useCollabText(docId: string) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!docId) return;
    const doc = getDoc(docId);
    const awareness = getDocAwareness(docId);
    const el = editorRef.current;
    if (!el) return;

    awareness.setLocalState({ user: { name: 'lantern', color: '#22d3ee' } });
    const persistHandler = () => persistDoc(docId, doc);
    doc.on('update', persistHandler);

    const fragment = doc.getXmlFragment('prosemirror');
    // Seed a default paragraph so a brand-new doc isn't a blank unfocusable
    // editor. Legacy docs (Y.Text 'content') are migrated by docStore.
    if (fragment.length === 0 && doc.getText('content').length === 0) {
      fragment.push([new Y.XmlElement('paragraph')]);
    }

    const state = EditorState.create({
      schema: editorSchema,
      plugins: [
        ySyncPlugin(fragment),
        yCursorPlugin(awareness),
        yUndoPlugin(),
        keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
        keymap(baseKeymap),
      ],
    });

    const view = new EditorView(el, { state });

    return () => {
      view.destroy();
      doc.off('update', persistHandler);
    };
  }, [docId]);

  return editorRef;
}