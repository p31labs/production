import React, { useEffect, useState } from 'react'
import { DESTINATIONS } from '../../lib/portalRouter'
import { loadJourney, type JourneyState } from '../../lib/journey'

/**
 * JourneyHub — the p31ca.org front door for the journey.
 *
 * Renders a destination grid (each card isolates one portal) with a
 * state-aware CTA. The hub is the single retrieval point; every card opens
 * a specific destination. Honest live-dots: only confirmed-reachable
 * destinations show the green dot.
 */
const JourneyHub: React.FC = () => {
  const [journey, setJourney] = useState<JourneyState>(() => loadJourney())

  useEffect(() => {
    const onStorage = () => setJourney(loadJourney())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const anyComplete = journey.completed.length > 0

  function scrollToWizard() {
    document.getElementById('wizard')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="journey-hub">
      <header className="journey-hero">
        <p className="journey-eyebrow">P31 LABS · THE JOURNEY</p>
        <h1 className="journey-h1">Where will your family build today?</h1>
        <p className="journey-sub">
          Every destination is a door. Pick the one that fits this moment — or start
          the two-minute journey to set up a passport for the whole family.
        </p>
        <div className="journey-ctas">
          <button
            type="button"
            className="btn btn-primary journey-cta"
            onClick={scrollToWizard}
          >
            {anyComplete ? 'Continue where you left off →' : 'Start your journey →'}
          </button>
          <a className="btn btn-glass journey-cta" href="#destinations-title">
            Take me to the doors
          </a>
        </div>
      </header>

      <section className="journey-section" aria-labelledby="destinations-title">
        <h2 id="destinations-title" className="journey-h2">Your destinations</h2>
        <p className="journey-hint">Six doors. One family. Pick your moment.</p>

        <div className="journey-grid">
          {DESTINATIONS.map((d) => (
            <a
              key={d.id}
              className="journey-card glass-card"
              href={d.url}
              target={d.external ? '_blank' : undefined}
              rel={d.external ? 'noopener' : undefined}
              aria-label={`Open ${d.label}${d.live ? ' (live)' : ''}`}
            >
              <div className="journey-card__head">
                <span className="journey-card__icon" aria-hidden="true">{d.icon}</span>
                <span
                  className={`journey-card__dot${d.live ? ' is-live' : ''}`}
                  aria-label={d.live ? 'live' : 'unverified'}
                  title={d.live ? 'live' : 'unverified'}
                />
              </div>
              <h3 className="journey-card__title">{d.label}</h3>
              <p className="journey-card__desc">{d.description}</p>
              <div className="journey-card__foot">
                <span className="journey-card__access">
                  {d.access === 'caregiver' ? 'Caregiver' : 'Open'}
                </span>
                <span aria-hidden="true" className="journey-card__arrow">→</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </section>
  )
}

export default JourneyHub