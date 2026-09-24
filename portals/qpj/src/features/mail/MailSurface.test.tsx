import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MailSurface } from './MailSurface'
import { useQpjStore } from '../../store/useQpjStore'

describe('MailSurface — Class E approval', () => {
  beforeEach(() => {
    useQpjStore.setState({ mode: 'maker', spoons: 3, passportId: 'dillpickle' })
  })

  afterEach(() => cleanup())

  it('shows an approval panel before an external send', () => {
    render(<MailSurface />)
    fireEvent.click(screen.getByRole('button', { name: /compose/i }))
    fireEvent.change(screen.getByLabelText('Recipient'), { target: { value: 'school@p31.local' } })
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'IEP Request' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(screen.getByText(/this will send to school@p31\.local/i)).toBeTruthy()
    expect(screen.getByText(/type the recipient.s name to confirm/i)).toBeTruthy()
  })

  it('disables Send until the typed confirmation matches the recipient', () => {
    render(<MailSurface />)
    fireEvent.click(screen.getByRole('button', { name: /compose/i }))
    fireEvent.change(screen.getByLabelText('Recipient'), { target: { value: 'school@p31.local' } })
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'IEP Request' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    const confirm = screen.getByLabelText(/type the recipient name to confirm/i)
    fireEvent.change(confirm, { target: { value: 'wrongname' } })
    const sendBtn = screen.getByRole('button', { name: /^send$/i })
    expect((sendBtn as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(confirm, { target: { value: 'school' } })
    expect((sendBtn as HTMLButtonElement).disabled).toBe(false)
  })

  it('offers save-as-draft and cancel (no default auto-send)', () => {
    render(<MailSurface />)
    fireEvent.click(screen.getByRole('button', { name: /compose/i }))
    fireEvent.change(screen.getByLabelText('Recipient'), { target: { value: 'school@p31.local' } })
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'IEP Request' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(screen.getByRole('button', { name: /save as draft/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy()
  })

  it('hides the Compose button at low spoons', () => {
    useQpjStore.setState({ mode: 'maker', spoons: 1 })
    render(<MailSurface />)
    const compose = screen.getByRole('button', { name: /compose/i })
    expect((compose as HTMLButtonElement).disabled).toBe(true)
  })
})