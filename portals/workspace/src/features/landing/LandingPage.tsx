import { useEffect, useState } from 'react'
import { forgeHealth } from '@/lib/forgeClient'

/**
 * The enterprise front door for the workspace.
 * Presents the 7 surfaces, the live forge proof, and the open-source posture.
 * CTA deep-links into the standalone app (#/app) and the QPJ companion.
 */
export function LandingPage() {
  const [health, setHealth] = useState<{ status: string; version?: string } | null>(null)
  const [healthErr, setHealthErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    forgeHealth()
      .then((h) => { if (!cancelled) setHealth(h) })
      .catch((e) => { if (!cancelled) setHealthErr(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [])

  return (
    <main className="landing" id="main-content">
      <header className="landing-hero">
        <div className="p31-crown-logo" style={{ width: 56, height: 56, fontSize: 28 }}>31</div>
        <p className="landing-eyebrow">P31 LABS · OPEN SOURCE · PRIVATE BY DESIGN</p>
        <h1 className="landing-h1">A workspace that works the way your family works</h1>
        <p className="landing-sub">
          Docs, Sheets, Slides, Calendar, Mail, Drive — all local, all private,
          all yours. No vendor lock-in. No enshittification pressure. Free,
          community-funded, open source.
        </p>

        <div className="landing-ctas">
          <a href="#/app" className="btn btn-primary" style={{ padding: '12px 32px', fontSize: 18 }}>
            Enter the workspace
          </a>
          <a href="https://qpj.p31ca.org/#/home" className="btn btn-glass" style={{ padding: '12px 32px', fontSize: 18 }}>
            Open the QPJ companion
          </a>
        </div>
      </header>

      <section className="landing-section" aria-labelledby="surfaces-title">
        <h2 id="surfaces-title" className="landing-h2">Seven surfaces. One private workspace.</h2>
        <div className="landing-surfaces">
          {[
            { icon: '📄', title: 'Docs', desc: 'Collaborative rich-text documents.' },
            { icon: '📊', title: 'Sheets', desc: 'Spreadsheets with formulas and frozen headers.' },
            { icon: '📽️', title: 'Slides', desc: 'Decks with a full-screen presenter mode.' },
            { icon: '📅', title: 'Calendar', desc: 'Family events and schedules, month view.' },
            { icon: '✉️', title: 'Mail', desc: 'Calm three-pane inbox.' },
            { icon: '📁', title: 'Drive', desc: 'Local file storage, self-hosted.' },
            { icon: '🛠️', title: 'Forge', desc: 'Describe a document — the Forge renders it.' },
          ].map((s) => (
            <div key={s.title} className="glass-panel landing-surface">
              <div className="landing-surface-icon">{s.icon}</div>
              <h3 className="landing-surface-title">{s.title}</h3>
              <p className="landing-surface-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" aria-labelledby="proof-title">
        <h2 id="proof-title" className="landing-h2">Live, not aspirational.</h2>
        <div className="glass-panel landing-proof">
          <p className="landing-proof-line">
            Forge health:{' '}
            {health ? <span className="proof-ok">{health.status} {health.version ? `· v${health.version}` : ''}</span>
              : healthErr ? <span className="proof-err">{healthErr}</span>
              : 'checking…'}
          </p>
          <p className="landing-proof-note">
            Honest state: the document Forge render is live (a real .docx comes back from a
            prompt). The Loom chain journal is identity-gated and not wired yet — this landing
            does not claim otherwise.
          </p>
        </div>
      </section>

      <footer className="landing-footer">
        <p>P31 Labs, Inc. · Georgia 501(c)(3) · Open source · Community-funded · No tracking, no ads.</p>
      </footer>
    </main>
  )
}

export default LandingPage