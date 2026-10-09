import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ProposalCard } from './ProposalCard'

afterEach(cleanup)

function renderCard(overrides: Partial<Parameters<typeof ProposalCard>[0]> = {}) {
  const props = {
    proposal: 'Lumi wants to add a bench to the street. Is that okay?',
    onApprove: vi.fn(),
    onReject: vi.fn(),
    decided: null as 'yes' | 'not-yet' | null,
    ...overrides,
  }
  render(<ProposalCard {...props} />)
  return props
}

describe('ProposalCard (triple-polish)', () => {
  it('keeps the two equal-weight answers and no third option', () => {
    renderCard()
    expect(screen.getByText('Yes, do it')).toBeTruthy()
    expect(screen.getByText('Not yet')).toBeTruthy()
    expect(screen.queryByText('Maybe')).toBeNull()
  })

  it('does NOT show the "Why this proposal?" toggle when no reason is given', () => {
    renderCard()
    expect(screen.queryByText('Why this proposal?')).toBeNull()
  })

  it('shows the rationale when a reason is provided, expandable', () => {
    renderCard({ reason: 'because the street is the family room' })
    fireEvent.click(screen.getByText('Why this proposal?'))
    expect(screen.getByText('because the street is the family room')).toBeTruthy()
    expect(screen.getByText('Hide why')).toBeTruthy()
  })

  it('does NOT show the diff toggle when only one side is present', () => {
    renderCard({ proposedBody: { change: 'round' } })
    expect(screen.queryByText('See the change')).toBeNull()
  })

  it('shows a current-vs-proposed diff when both sides are present', () => {
    renderCard({
      proposedBody: { change: 'add a bench' },
      currentBody: { change: 'nothing' },
    })
    fireEvent.click(screen.getByText('See the change'))
    expect(screen.getByText('Now')).toBeTruthy()
    expect(screen.getByText('Proposed')).toBeTruthy()
    expect(screen.getByText('Hide the change')).toBeTruthy()
  })

  it('dispatches approve via the AAF action', () => {
    const props = renderCard()
    fireEvent.click(screen.getByText('Yes, do it'))
    expect(props.onApprove).toHaveBeenCalledOnce()
  })

  it('dispatches reject via the AAF action', () => {
    const props = renderCard()
    fireEvent.click(screen.getByText('Not yet'))
    expect(props.onReject).toHaveBeenCalledOnce()
  })

  it('hides the buttons once decided (no default, no timer)', () => {
    renderCard({ decided: 'yes' })
    expect(screen.queryByText('Yes, do it')).toBeNull()
    expect(screen.queryByText('Not yet')).toBeNull()
  })
})