import React, { useEffect, useRef, useState } from 'react'
import { DESTINATIONS } from '../../lib/portalRouter'
import { loadJourney, markComplete, setStep } from '../../lib/journey'
import { pickleName, ROSTER } from '../../lib/pickleName'
import { ensureIdentity, getJWT, getBalance } from '@p31ca/shared-identity'

/**
 * JourneyWizard — the 5-step, family-friendly first-time flow.
 *
 * Explicit, accessible, resumable, and never re-runs for a completed member.
 *   Step 1 — Welcome (skippable)
 *   Step 2 — Who's this?  (pickle roster picker)
 *   Step 3 — Claim your space (mints a real DID via @p31ca/shared-identity)
 *   Step 4 — Your passport (DID + JWT + live love balance)
 *   Step 5 — Where to?  (routes to a portal)
 *
 * Accessibility hard rules applied:
 *   - role="progressbar" with aria-valuemin/max/now
 *   - step heading has tabIndex={-1} and receives focus on transition
 *   - Back/Next are keyboard-focusable, no auto-advance
 *   - current step announced via aria-live
 */

const STEPS = [
  { id: 'welcome', title: 'Welcome', description: 'Two minutes — a passport for every member.' },
  { id: 'who', title: "Who's this?", description: 'Pick the family member signing in.' },
  { id: 'claim', title: 'Claim your space', description: 'Mint a sovereign did:key for this member.' },
  { id: 'passport', title: 'Your passport', description: 'Your DID, session, and love balance.' },
  { id: 'where', title: 'Where to?', description: 'Pick a door — every destination is waiting.' },
] as const

interface WizardState {
  step: number
  memberId: string | null
  did: string | null
  jwt: string | null
  balance: number | null
  minting: boolean
  error: string | null
}

const JourneyWizard: React.FC = () => {
  const initial = loadJourney()
  const [state, setState] = useState<WizardState>(() => ({
    step: initial.currentStep,
    memberId: initial.currentMember,
    did: null,
    jwt: null,
    balance: null,
    minting: false,
    error: null,
  }))
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  // Focus the step heading on every step transition.
  useEffect(() => {
    headingRef.current?.focus()
  }, [state.step])

  // Persist the current step so a reload resumes.
  useEffect(() => {
    setStep(state.step, state.memberId)
  }, [state.step, state.memberId])

  const stepDef = STEPS[state.step]!
  const currentMember = ROSTER.find((m) => m.id === state.memberId) ?? null
  const currentPickle = currentMember ? pickleName(currentMember.id) : null

  function advance() {
    if (state.step < STEPS.length - 1) {
      setState((s) => ({ ...s, step: s.step + 1, error: null }))
    }
  }

  function back() {
    if (state.step > 0) setState((s) => ({ ...s, step: s.step - 1, error: null }))
  }

  async function mintIdentity() {
    if (!state.memberId) return
    setState((s) => ({ ...s, minting: true, error: null }))
    try {
      const { identity } = await ensureIdentity({ autoRegister: true })
      let jwt: string | null = null
      try {
        jwt = await getJWT(identity)
      } catch {
        /* offline — session shows as "local" */
      }
      let balance: number | null = null
      try {
        const b = (await getBalance(identity.did)) as { availableBalance?: number } | null
        balance = typeof b?.availableBalance === 'number' ? b.availableBalance : null
      } catch {
        /* ledger unreachable — balance stays null and the UI says so */
      }
      setState((s) => ({ ...s, did: identity.did, jwt, balance, minting: false }))
      markComplete(state.memberId)
      advance()
    } catch (e) {
      setState((s) => ({
        ...s,
        minting: false,
        error: e instanceof Error ? e.message : 'Could not mint the identity. Try again in a moment.',
      }))
    }
  }

  return (
    <section className="journey-wizard" id="wizard" aria-labelledby="wizard-title">
      <div
        className="journey-progress"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={state.step + 1}
        aria-label={`Step ${state.step + 1} of ${STEPS.length}`}
      >
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            className={
              'journey-progress__pip' +
              (i < state.step ? ' is-done' : '') +
              (i === state.step ? ' is-current' : '')
            }
            aria-hidden="true"
          />
        ))}
      </div>

      <h2 id="wizard-title" className="journey-step-title" tabIndex={-1} ref={headingRef}>
        {stepDef.title}
      </h2>
      <p className="journey-step-desc">{stepDef.description}</p>

      {state.step === 0 && (
        <div className="journey-step">
          <p className="journey-step-copy">
            We&apos;ll set up a family passport — a real <span className="journey-mono">did:key</span>,
            a session, and a live love balance. Then we&apos;ll open the doors.
          </p>
          <div className="journey-step__actions">
            <button className="btn btn-primary" type="button" onClick={advance}>Begin</button>
            <a className="btn btn-glass" href="#destinations-title">Skip for now</a>
          </div>
        </div>
      )}

      {state.step === 1 && (
        <div className="journey-step">
          <div className="journey-roster" role="group" aria-label="Who is signing in">
            {ROSTER.map((m) => {
              const active = m.id === state.memberId
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`journey-member${active ? ' is-active' : ''}`}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => setState((s) => ({ ...s, memberId: m.id }))}
                >
                  <span aria-hidden="true" className="journey-member__emoji">{m.emoji}</span>
                  <span>{pickleName(m.id)}</span>
                  {active && <span className="journey-member__check" aria-label="Selected">✓</span>}
                </button>
              )
            })}
          </div>
          <div className="journey-step__actions">
            <button className="btn btn-glass" type="button" onClick={back}>Back</button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={!state.memberId}
              onClick={advance}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {state.step === 2 && (
        <div className="journey-step">
          <p className="journey-step-copy">
            We&apos;ll mint <strong>{currentPickle}</strong> a real sovereign key on this device.
            The private key never leaves — only the public <span className="journey-mono">did:key</span> is shared.
          </p>
          {state.error && (
            <p className="journey-error" role="alert">{state.error}</p>
          )}
          <div className="journey-step__actions">
            <button className="btn btn-glass" type="button" onClick={back} disabled={state.minting}>
              Back
            </button>
            <button className="btn btn-primary" type="button" onClick={mintIdentity} disabled={state.minting}>
              {state.minting ? 'Minting…' : 'Claim my space'}
            </button>
          </div>
        </div>
      )}

      {state.step === 3 && (
        <div className="journey-step">
          <p className="journey-step-copy">
            This is your passport. Keep it — it&apos;s the same identity across the whole family stack.
          </p>
          <dl className="journey-passport">
            <div className="journey-passport__row">
              <dt>DID</dt>
              <dd className="journey-mono journey-passport__did">{state.did ?? '—'}</dd>
            </div>
            <div className="journey-passport__row">
              <dt>Session</dt>
              <dd>{state.jwt ? 'signed ✓' : 'local (offline)'}</dd>
            </div>
            <div className="journey-passport__row">
              <dt>Love balance</dt>
              <dd>{state.balance === null ? '—' : state.balance}</dd>
            </div>
          </dl>
          <div className="journey-step__actions">
            <button className="btn btn-glass" type="button" onClick={back}>Back</button>
            <button className="btn btn-primary" type="button" onClick={advance}>Continue</button>
          </div>
        </div>
      )}

      {state.step === 4 && (
        <div className="journey-step">
          <p className="journey-step-copy">Every door is open. Where would you like to go?</p>
          <div className="journey-doors">
            {DESTINATIONS.map((d) => (
              <a
                key={d.id}
                className="journey-door"
                href={d.url}
                target={d.external ? '_blank' : undefined}
                rel={d.external ? 'noopener' : undefined}
              >
                <span aria-hidden="true" className="journey-door__icon">{d.icon}</span>
                <span className="journey-door__label">{d.label}</span>
              </a>
            ))}
          </div>
          <div className="journey-step__actions">
            <button className="btn btn-glass" type="button" onClick={back}>Back</button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                if (state.memberId) markComplete(state.memberId)
                document.getElementById('destinations-title')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Done — back to the doors
            </button>
          </div>
        </div>
      )}

      <p className="journey-step-count" aria-live="polite">
        Step {state.step + 1} of {STEPS.length}
      </p>
    </section>
  )
}

export default JourneyWizard