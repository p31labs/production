import { useState } from 'react'
import { MCP_TOOLS } from '@/lib/mcpTools'
import { pickleName } from '@/lib/pickleNames'

interface Doc {
  id: string
  title: string
  meta: string
  body: string
}

// Pickle labels only — no human names on any surface.
const SEED_DOCS: Doc[] = [
  {
    id: 'd1',
    title: 'Q3 Family Roadmap',
    meta: `Updated 2h ago by ${pickleName('caregiver-one')}`,
    body: '<h1>1. Objectives & Family Values</h1><p>Our goal for Q3 is to transition all household software dependencies to the self-hosted P31 workspace stack.</p><h2>2. Key Milestones</h2><ul><li>Deploy local identity provider.</li><li>Migrate shared documents.</li><li>Configure redundant encrypted backups.</li></ul>',
  },
  { id: 'd2', title: 'Weekly Meal Plan', meta: 'Updated Yesterday', body: '<p>Monday: Lentil soup. Tuesday: Tacos.</p>' },
  { id: 'd3', title: 'Home Server Config', meta: 'Updated Sep 18', body: '<p>NVMe RAID-1, 64 GB ECC, Tailscale mesh.</p>' },
]

export function DocsSurface() {
  const [activeId, setActiveId] = useState(SEED_DOCS[0]!.id)
  const [title, setTitle] = useState(SEED_DOCS[0]!.title)
  const [body, setBody] = useState(SEED_DOCS[0]!.body)

  function selectDoc(doc: Doc) {
    setActiveId(doc.id)
    setTitle(doc.title)
    setBody(doc.body)
  }

  return (
    <section className="surface-panel active" data-mcp-tool={MCP_TOOLS.docs} aria-label="Docs surface">
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <button className="btn btn-primary" type="button">+ New Document</button>
          <div style={{ fontSize: 12, color: 'var(--p31-cloud)', fontWeight: 600, marginTop: 12 }}>RECENT DOCS</div>
          {SEED_DOCS.map((doc) => (
            <button
              key={doc.id}
              type="button"
              className={`doc-list-item ${doc.id === activeId ? 'active' : ''}`}
              onClick={() => selectDoc(doc)}
            >
              <span className="doc-item-title">{doc.title}</span>
              <span className="doc-item-meta">{doc.meta}</span>
            </button>
          ))}
        </aside>

        <div className="docs-editor-container">
          <div className="docs-toolbar">
            <button className="tb-btn" type="button" title="Bold"><b>B</b></button>
            <button className="tb-btn" type="button" title="Italic"><i>I</i></button>
            <button className="tb-btn" type="button" title="Underline"><u>U</u></button>
          </div>

          <div className="docs-body">
            <input
              className="doc-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Document title"
            />
            <div
              className="doc-content-area"
              contentEditable
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: body }}
              onBlur={(e) => setBody(e.currentTarget.innerHTML)}
            />
          </div>
        </div>

        <aside className="docs-outline">
          <div style={{ fontSize: 12, color: 'var(--p31-cloud)', fontWeight: 600, marginBottom: 12 }}>OUTLINE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
            <a href="#heading-1" style={{ color: 'var(--p31-accent)', textDecoration: 'none' }}>1. Objectives</a>
            <a href="#heading-2" style={{ color: 'var(--p31-cloud)', textDecoration: 'none', paddingLeft: 8 }}>2. Key Milestones</a>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default DocsSurface