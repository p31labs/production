/**
 * Docs — the plain-language guide: how the portal works, how to connect a
 * server, and a short FAQ. Kept 5th-grade per the plain-language standard.
 */
import { PageHeaderV2 } from '@p31ca/design-core/canon-v2'

const STEPS = [
  { icon: '🧭', title: 'Find a server', body: 'Browse the catalog. Each card is real — we check it for you.' },
  { icon: '🛠️', title: 'Try a tool', body: 'Open a server and tap Try it. The form fills itself in.' },
  { icon: '🧾', title: 'Read the result', body: 'You get the real answer. The details stay tucked away.' },
  { icon: '📤', title: 'Share your own', body: 'Tell us about your server. A reviewer checks it first.' },
]

const FAQ = [
  { q: 'Are the servers real?', a: 'Yes. We check each one when you visit. A server that is down says so.' },
  { q: 'Can I break something?', a: 'Most tools are read-only. Tools that can change things ask you first.' },
  { q: 'Who made these servers?', a: 'P31 and friends. Each server page says who made it.' },
  { q: 'Can I share my server?', a: 'Yes. The Share page walks you through three easy steps.' },
  { q: 'What if a server is slow or broken?', a: 'We show that right on its card. It never breaks the page.' },
  { q: 'Where do my results go?', a: 'Your session on the Playground page. You can save it or clear it.' },
]

export function DocsSurface() {
  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeaderV2
        title="How it works"
        subtitle="A simple place to find and try servers."
      />

      <section style={{ marginBottom: 'var(--p31-space-5)' }}>
        <h2 style={{ color: 'var(--p31-text-primary)', marginBottom: 'var(--p31-space-3)' }}>The four steps</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-3)' }}>
          {STEPS.map((s) => (
            <div key={s.title} className="surface-card" style={{ padding: 'var(--p31-space-4)' }}>
              <div className="surface-card-header">
                <span className="surface-card-icon" aria-hidden="true">{s.icon}</span>
                <div className="surface-card-title">{s.title}</div>
              </div>
              <div className="surface-card-desc">{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 'var(--p31-space-5)' }}>
        <h2 style={{ color: 'var(--p31-text-primary)', marginBottom: 'var(--p31-space-3)' }}>Add a server to your app</h2>
        <div className="surface-panel">
          <ul style={{ color: 'var(--p31-text-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-2)', paddingLeft: 'var(--p31-space-4)' }}>
            <li>Open the server's page.</li>
            <li>Tap the Install tab.</li>
            <li>Copy the settings for your app.</li>
            <li>Paste them into your app's settings file.</li>
          </ul>
        </div>
      </section>

      <section style={{ marginBottom: 'var(--p31-space-5)' }}>
        <h2 style={{ color: 'var(--p31-text-primary)', marginBottom: 'var(--p31-space-3)' }}>Frequently asked questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-3)' }}>
          {FAQ.map((f) => (
            <div key={f.q} className="surface-card" style={{ padding: 'var(--p31-space-4)' }}>
              <div style={{ color: 'var(--p31-accent)', fontWeight: 600, marginBottom: 'var(--p31-space-1)' }}>{f.q}</div>
              <div className="surface-card-desc">{f.a}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}