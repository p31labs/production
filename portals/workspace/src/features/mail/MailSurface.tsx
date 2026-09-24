import { useState } from 'react'
import { MCP_TOOLS } from '@/lib/mcpTools'
import { pickleName } from '@/lib/pickleNames'

interface MailThread {
  id: string
  sender: string
  subject: string
  snippet: string
  unread: boolean
  timestamp: string
}

// Pickle labels only — no human names. The system sender is "P31 System".
const SEED: MailThread[] = [
  { id: 'm1', sender: pickleName('caregiver-two'), subject: 'Weekend Hiking Plan & Trail Prep', snippet: 'I picked up the physical topological maps for the North trail…', unread: true, timestamp: '10:14 AM' },
  { id: 'm2', sender: pickleName('young-one'), subject: 'Science Project Presentation Slides', snippet: 'Hey, I uploaded my project outline to our family Drive folder…', unread: false, timestamp: 'Yesterday' },
  { id: 'm3', sender: 'P31 System', subject: 'Weekly Encrypted Backup Report', snippet: 'All 4 nodes completed differential synchronization with 0 errors.', unread: false, timestamp: 'Mon' },
]

export function MailSurface() {
  const [activeId, setActiveId] = useState(SEED[0]!.id)
  const active = SEED.find((m) => m.id === activeId)!

  return (
    <section className="surface-panel active" data-mcp-tool={MCP_TOOLS.mail} aria-label="Mail surface">
      <div className="mail-layout">
        <aside className="mail-folders">
          <button className="btn btn-primary" type="button">✏️ Compose</button>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="nav-item active"><span>Inbox</span> <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 'bold' }}>4</span></div>
            <div className="nav-item"><span>Sent</span></div>
            <div className="nav-item"><span>Drafts</span></div>
            <div className="nav-item"><span>Archive</span></div>
          </div>
        </aside>

        <div className="mail-list">
          {SEED.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`mail-item ${m.unread ? 'unread' : ''}`}
              onClick={() => setActiveId(m.id)}
            >
              <div className="mail-sender">{m.sender}</div>
              <div className="mail-subject">{m.subject}</div>
              <div className="mail-snippet">{m.snippet}</div>
            </button>
          ))}
        </div>

        <div className="mail-thread">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--p31-glass-border)', paddingBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 'var(--p31-text-xl)' }}>{active.subject}</h2>
              <div style={{ fontSize: 13, color: 'var(--p31-cloud)' }}>
                From: {active.sender} &lt;{active.sender.toLowerCase().replace(/\s+/g, '.')}@p31.local&gt; · {active.timestamp}
              </div>
            </div>
            <button className="btn btn-glass" type="button">Reply</button>
          </div>
          <p style={{ lineHeight: 1.7 }}>{active.snippet}</p>
        </div>
      </div>
    </section>
  )
}

export default MailSurface