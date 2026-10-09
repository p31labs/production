import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { ChainStatus } from './ChainStatus'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

async function mockVerify(status: number, body: unknown) {
  ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

describe('ChainStatus', () => {
  it('shows "Chain verified" with the event count when the chain is valid', async () => {
    await mockVerify(200, { valid: true, checked: 16, brokenAt: null, head: '90e0ba419a881dc1' })
    render(<ChainStatus prominent />)
    await waitFor(() => expect(screen.getByText(/Chain verified · 16 events · head 90e0ba41/)).toBeTruthy())
  })

  it('names the broken seq when the chain fails', async () => {
    await mockVerify(200, { valid: false, checked: 16, brokenAt: 9, head: 'x' })
    render(<ChainStatus />)
    await waitFor(() => expect(screen.getByText(/Chain BROKEN at seq 9/)).toBeTruthy())
  })

  it('falls back to unavailable when unauthenticated (401)', async () => {
    await mockVerify(401, {})
    render(<ChainStatus />)
    await waitFor(() => expect(screen.getByText('Chain status unavailable')).toBeTruthy())
  })

  it('never shows a false green on a failed fetch', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'))
    render(<ChainStatus />)
    await waitFor(() => expect(screen.getByText('Chain status unavailable')).toBeTruthy())
    expect(screen.queryByText(/Chain verified/)).toBeNull()
  })
})