import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { DriveSurface } from './DriveSurface'
import { useQpjStore } from '../../store/useQpjStore'

describe('DriveSurface — forge generate via kernel', () => {
  beforeEach(() => {
    useQpjStore.setState({ mode: 'maker', spoons: 3, passportId: 'dillpickle' })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('hides the forge input at low spoons', () => {
    useQpjStore.setState({ mode: 'maker', spoons: 1 })
    render(<DriveSurface />)
    expect(screen.queryByLabelText(/document description/i)).toBeNull()
  })

  it('routes a "letter" prompt through the kernel and shows the pipeline plan', async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([0x50, 0x4b]), {
      status: 200,
      headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()

    render(<DriveSurface />)
    const input = screen.getByLabelText(/document description/i)
    fireEvent.change(input, { target: { value: 'draft a letter to the school' } })
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }))

    await waitFor(() => {
      expect(screen.getByText(/pipeline: classify → render/i)).toBeTruthy()
    })
  })

  it('switches to the scene theme for report intents (kernel override)', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => new Response(new Uint8Array([0x50, 0x4b]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()

    render(<DriveSurface />)
    const input = screen.getByLabelText(/document description/i)
    fireEvent.change(input, { target: { value: 'generate a report on the chain' } })
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }))

    await waitFor(() => {
      const init = fetchMock.mock.calls[0]?.[1]
      const body = init ? String(init.body ?? '') : ''
      const pack = JSON.parse(body)
      expect(pack.kind).toBe('report')
      expect(pack.theme).toBe('scene')
    })
  })
})