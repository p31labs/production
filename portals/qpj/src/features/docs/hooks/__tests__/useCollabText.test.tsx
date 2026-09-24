/**
 * QPJ Docs rich-text editor (y-prosemirror) smoke tests.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { useCollabText } from '../useCollabText';

vi.mock('../../lib/docStore', () => {
  const docs = new Map<string, Y.Doc>();
  return {
    getDoc: vi.fn((id: string) => {
      let doc = docs.get(id);
      if (!doc) {
        doc = new Y.Doc();
        docs.set(id, doc);
      }
      return doc;
    }),
    getDocAwareness: vi.fn((id: string) => new awarenessProtocol.Awareness(docs.get(id)!)),
    persistDoc: vi.fn(),
  };
});

import { getDoc } from '../../lib/docStore';

function Editor({ docId }: { docId: string }) {
  const editorRef = useCollabText(docId);
  return <div ref={editorRef} data-testid="editor" />;
}

const getPm = () => document.querySelector('.ProseMirror') as HTMLElement | null;

afterEach(() => cleanup());

describe('useCollabText (y-prosemirror)', () => {
  it('mounts a ProseMirror editor with a default paragraph', () => {
    render(<Editor docId="mount" />);
    const pm = getPm();
    expect(pm).not.toBeNull();
    expect(pm?.getAttribute('contenteditable')).toBe('true');
  });

  it('syncs remote Yjs edits into the editor DOM', () => {
    render(<Editor docId="remote" />);
    const doc = getDoc('remote');
    const fragment = doc.getXmlFragment('prosemirror');

    const paragraph = new Y.XmlElement('paragraph');
    const text = new Y.XmlText();
    text.insert(0, 'remote edit lands');
    paragraph.insert(0, [text]);
    fragment.push([paragraph]);

    expect(getPm()?.textContent ?? '').toContain('remote edit lands');
  });

  it('seeds a default paragraph on a fresh doc', () => {
    render(<Editor docId="fresh" />);
    const doc = getDoc('fresh');
    const fragment = doc.getXmlFragment('prosemirror');
    expect(fragment.length).toBe(1);
    expect((fragment.get(0) as Y.XmlElement).nodeName).toBe('paragraph');
    expect(getPm()?.querySelector('p')).not.toBeNull();
  });
});