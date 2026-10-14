import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import type { ServerSummary, ServerDetail } from '@/types'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { useWorkspaceStore } from '@/store/workspaceStore'

/**
 * Task-completion flows (plan W3) — three plain journeys, each under a
 * minute for a first-time user:
 *   1. find a server   → Discover shows simple cards; Open goes to the server.
 *   2. try a tool      → Server Tools tab; Try it preloads the playground.
 *   3. publish wizard  → three steps render in order (What is it? → Where
 *                        does it live? → Check and send).
 */

const FIXTURE: ServerSummary = {
  id: 'srv-demo',
  name: 'Demo Server',
  endpoint: 'https://example.com',
  kind: 'remote',
  category: 'design',
  description: 'A friendly demo server.',
  tags: [],
  author: 'P31',
  status: 'live',
  readOnlySafe: true,
  health: 'up',
  latencyMs: 12,
  checkedAt: new Date().toISOString(),
  toolCount: 2,
  tools: ['tool_a', 'tool_b'],
}

const FIXTURE_DETAIL: ServerDetail = {
  ...FIXTURE,
  tools: [
    { name: 'tool_a', description: 'Lists things.', inputSchema: { type: 'object', properties: { q: { type: 'string' } } }, risk: 'read' },
    { name: 'tool_b', description: 'Says hello.', inputSchema: undefined, risk: 'read' },
  ],
}

vi.mock('@/lib/registryClient', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/registryClient')>()
  return {
    ...orig,
    listServers: vi.fn(async () => [FIXTURE]),
    getServer: vi.fn(async () => FIXTURE_DETAIL),
    getCategories: vi.fn(async () => []),
    getMe: vi.fn(async () => null),
    listPending: vi.fn(async () => []),
    reviewServer: vi.fn(async () => ({ result: {} })),
    registerServer: vi.fn(async () => ({ server: FIXTURE })),
    callTool: vi.fn(async () => ({ text: '{"ok":true}', raw: {}, requestBody: '{}', responseBody: '{}' })),
  }
})

beforeEach(() => {
  cleanup()
  vi.useFakeTimers()
  localStorage.clear()
  useMarketplaceStore.setState({
    servers: [],
    categories: [],
    loading: false,
    loadedAt: null,
    error: null,
    me: null,
    selectedServerId: null,
    serverDetail: null,
    selectedTool: null,
    search: '',
    categoryFilter: 'all',
    statusFilter: 'all',
    session: [],
    lens: 'public',
    externalProbe: null,
    snapshotState: null,
  })
  useWorkspaceStore.setState({ surface: 'home', mode: 'spark', spoons: 4, crisis: false, gateOpen: false, pendingSurface: null, paletteOpen: false })
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('task: find a server', () => {
  it('renders simple cards with one Open button, and Open goes to the server page', () => {
    useMarketplaceStore.setState({ servers: [FIXTURE], loading: false })
    render(<DiscoverStub />)
    expect(screen.getByText('Demo Server')).toBeDefined()
    expect(screen.getByText('A friendly demo server.')).toBeDefined()
    const card = screen.getByText('Demo Server').closest('.surface-card')!
    const open = within(card as HTMLElement).getByRole('button', { name: 'Open' })
    fireEvent.click(open)
    expect(window.location.hash).toBe('#/server/srv-demo')
  })

  it('shows the real empty state when nothing matches', () => {
    useMarketplaceStore.setState({ servers: [], loading: false, search: 'zzz' })
    render(<DiscoverStub />)
    expect(screen.getByText(/Nothing matches yet/)).toBeDefined()
  })
})

describe('task: try a tool', () => {
  it('Try it on a server tool preloads the playground with that tool', () => {
    useMarketplaceStore.setState({ serverDetail: FIXTURE_DETAIL, selectedServerId: 'srv-demo' })
    render(<ServerStub />)
    fireEvent.click(screen.getByRole('tab', { name: 'Tools' }))
    const row = screen.getByText('Lists things.').closest('[role="row"]')!
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Try it' }))
    expect(useMarketplaceStore.getState().selectedTool).toBe('tool_a')

    // The playground opens pre-filled: the tool select holds tool_a and the
    // form shows Run it.
    cleanup()
    localStorage.setItem('p31:mcp:llm-config', JSON.stringify({ backend: 'disabled', litellmUrl: 'http://localhost:4001', litellmModel: 'gpt-4o-mini', hostedBaseUrl: '', hostedApiKey: '', hostedModel: 'gpt-4o-mini' }))
    render(<PlaygroundStub />)
    const select = screen.getByLabelText('Pick a tool') as HTMLSelectElement
    expect(select.value).toBe('tool_a')
    expect(screen.getByRole('button', { name: 'Run it' })).toBeDefined()
  })
})

describe('task: publish wizard', () => {
  it('renders the three steps in order, one question group per screen', () => {
    render(<PublishStub />)
    expect(screen.getByText('What is it?')).toBeDefined()
    expect(screen.queryByText('Where does it live?')).toBeNull()

    fireEvent.change(screen.getByLabelText('Server name'), { target: { value: 'My Server' } })
    fireEvent.change(screen.getByLabelText('Server description'), { target: { value: 'It does nice things.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Where does it live?')).toBeDefined()
    expect(screen.queryByText('What is it?')).toBeNull()

    fireEvent.change(screen.getByLabelText('Server address'), { target: { value: 'https://example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Check and send')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Send it in' })).toBeDefined()
  })
})

// ─── Lightweight stubs so the tests mount the real surfaces directly ──────

import { DiscoverSurface } from '@/features/marketplace/DiscoverSurface'
import { ServerSurface } from '@/features/marketplace/ServerSurface'
import { PlaygroundSurface } from '@/features/playground/PlaygroundSurface'
import { PublishSurface } from '@/features/publish/PublishSurface'

function DiscoverStub() {
  return <DiscoverSurface />
}
function ServerStub() {
  return <ServerSurface serverId="srv-demo" />
}
function PlaygroundStub() {
  return <PlaygroundSurface />
}
function PublishStub() {
  return <PublishSurface />
}