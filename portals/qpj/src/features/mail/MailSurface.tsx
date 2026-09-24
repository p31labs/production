import { useState } from 'react';
import { useQpjStore } from '../../store/useQpjStore';
import './mail.css';

interface MailThread {
  id: string
  sender: string
  subject: string
  snippet: string
  body: string
  unread: boolean
  time: string
}

const THREADS: MailThread[] = [
  {
    id: 'm1', sender: 'Sam', subject: 'Weekend Hiking Plan & Trail Prep', unread: true, time: 'Today 10:14 AM',
    snippet: 'I picked up the physical topological maps for the North trail...',
    body: 'Hey everyone, I picked up the physical topological maps for the North trail route this weekend. Weather forecast looks crisp and clear. Let\'s make sure our devices are synced locally before we head out. Best, Sam',
  },
  {
    id: 'm2', sender: 'Maya', subject: 'Science Project Presentation Slides', unread: false, time: 'Yesterday',
    snippet: 'Hey dad, I uploaded my project outline to our family Drive folder...',
    body: 'Hey dad, I uploaded my project outline to our family Drive folder. Can you open the Slides deck and help me pick the order for the presentation?',
  },
  {
    id: 'm3', sender: 'P31 System Auto', subject: 'Weekly Encrypted Backup Report', unread: false, time: 'Sep 21',
    snippet: 'All 4 nodes completed differential synchronization with 0 errors.',
    body: 'All 4 nodes completed differential synchronization with 0 errors. Backup integrity verified against the Loom chain.',
  },
]

interface PendingSend {
  to: string
  subject: string
  body: string
}

export function MailSurface() {
  const [active, setActive] = useState(THREADS[0].id)
  const [composing, setComposing] = useState(false)
  const [toField, setToField] = useState('')
  const [subjectField, setSubjectField] = useState('')
  const [bodyField, setBodyField] = useState('')
  const [pendingSend, setPendingSend] = useState<PendingSend | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const spoons = useQpjStore((s) => s.spoons)
  const lowSpoons = spoons <= 2

  const current = THREADS.find((t) => t.id === active) ?? THREADS[0]

  const handleSendRequest = () => {
    if (!toField.trim() || !subjectField.trim()) return
    // Class E: sending to an external party. Show the decision, not the transcript.
    setPendingSend({ to: toField.trim(), subject: subjectField.trim(), body: bodyField.trim() })
    setConfirmText('')
  }

  const expectedConfirm = pendingSend ? pendingSend.to.split('@')[0]?.toLowerCase() : ''
  const canConfirm = confirmText.trim().toLowerCase() === expectedConfirm

  const handleConfirmSend = () => {
    if (!canConfirm) return
    // Class E: the human typed the recipient name — the send is now approved.
    // NOTE (honest, not aspirational): this records the approval in the UI
    // only. A real journal append to the Loom chain (POST /api/loom/event,
    // writer:human, kind:approve) is identity-gated behind Cloudflare Access
    // and is NOT wired yet — so we do NOT claim it happened. This line is the
    // pending journal, not a completed one.
    setPendingSend(null)
    setComposing(false)
    setToField('')
    setSubjectField('')
    setBodyField('')
    setStatus(`Approved: send to ${pendingSend?.to} recorded locally. (Chain journal pending — identity-gated.)`)
  }

  const handleSaveDraft = () => {
    setPendingSend(null)
    setStatus('Saved as draft — not sent.')
  }

  const handleCancelSend = () => {
    setPendingSend(null)
    setConfirmText('')
  }

  return (
    <section className="mail-surface" data-mcp-tool="mailSurface" data-mcp-state="ready" aria-label="Mail">
      <div className="mail-surface__folders">
        <button type="button" className="btn btn-primary" onClick={() => setComposing((c) => !c)} disabled={lowSpoons}>
          ✏️ Compose
        </button>
        <div className="mail-surface__folder-list">
          <div className="nav-item active"><span>Inbox</span><span className="mail-surface__count">3</span></div>
          <div className="nav-item"><span>Sent</span></div>
          <div className="nav-item"><span>Drafts</span></div>
          <div className="nav-item"><span>Archive</span></div>
        </div>
      </div>

      <div className="mail-surface__list" role="list" aria-label="Inbox">
        {THREADS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="listitem"
            className={`mail-surface__item${t.unread ? ' is-unread' : ''}${t.id === active ? ' is-active' : ''}`}
            data-mcp-tool="mailItem"
            data-mcp-state="ready"
            onClick={() => setActive(t.id)}
            aria-label={`${t.subject} from ${t.sender}`}
          >
            <span className="mail-surface__sender">{t.sender}</span>
            <span className="mail-surface__subject">{t.subject}</span>
            <span className="mail-surface__snippet">{t.snippet}</span>
            <span className="mail-surface__time">{t.time}</span>
          </button>
        ))}
      </div>

      <div className="mail-surface__thread">
        {status && (
          <div className="mail-surface__status" data-mcp-tool="mailStatus" data-mcp-state="ready" role="status">
            {status}
          </div>
        )}

        {pendingSend ? (
          <div className="mail-surface__approval" data-mcp-tool="mailApproval" data-mcp-state="ready" role="dialog" aria-labelledby="approval-title">
            <span className="mail-surface__approval-badge">CLASS E · CAREGIVER APPROVAL</span>
            <h3 id="approval-title" className="mail-surface__thread-title">This will send to {pendingSend.to}</h3>
            <p className="mail-surface__approval-subject">{pendingSend.subject}</p>
            <p className="mail-surface__approval-preview">{pendingSend.body.slice(0, 120)}{pendingSend.body.length > 120 ? '…' : ''}</p>

            <label className="mail-surface__approval-label" htmlFor="mail-confirm">
              Type the recipient&apos;s name to confirm:
            </label>
            <input
              id="mail-confirm"
              type="text"
              className="mail-surface__compose-field"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedConfirm ? `type “${expectedConfirm}”` : 'recipient name'}
              aria-label="Type the recipient name to confirm"
            />

            <div className="mail-surface__compose-actions">
              <button type="button" className="btn btn-primary" onClick={handleConfirmSend} disabled={!canConfirm}>
                Send
              </button>
              <button type="button" className="btn btn-glass" onClick={handleSaveDraft}>Save as draft</button>
              <button type="button" className="btn btn-glass" onClick={handleCancelSend}>Cancel</button>
            </div>
            {!canConfirm && confirmText.length > 0 && (
              <p className="mail-surface__approval-hint">The name doesn&apos;t match yet — keep typing.</p>
            )}
          </div>
        ) : composing ? (
          <div className="mail-surface__compose">
            <h3 className="mail-surface__thread-title">New message</h3>
            <input type="text" className="mail-surface__compose-field" value={toField} onChange={(e) => setToField(e.target.value)} placeholder="To: (e.g. school@p31.local)" aria-label="Recipient" />
            <input type="text" className="mail-surface__compose-field" value={subjectField} onChange={(e) => setSubjectField(e.target.value)} placeholder="Subject" aria-label="Subject" />
            <textarea className="mail-surface__compose-body" value={bodyField} onChange={(e) => setBodyField(e.target.value)} placeholder="Write your message… This is where a forged document could be attached." aria-label="Message body" rows={10} />
            <div className="mail-surface__compose-actions">
              <button type="button" className="btn btn-primary" onClick={handleSendRequest} disabled={!toField.trim() || !subjectField.trim()}>Send</button>
              <button type="button" className="btn btn-glass" onClick={() => setComposing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mail-surface__thread-head">
              <div>
                <h2 className="mail-surface__thread-title">{current.subject}</h2>
                <div className="mail-surface__thread-meta">From: {current.sender} &lt;{current.sender.toLowerCase()}@p31.local&gt; · {current.time}</div>
              </div>
              <button type="button" className="btn btn-glass">Reply</button>
            </div>
            <p className="mail-surface__thread-body">{current.body}</p>
          </>
        )}
      </div>
    </section>
  )
}

export default MailSurface