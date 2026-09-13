import type { ChatMessage, ServerEvent } from '../types'

export interface ChatPeerCb {
  onOpen: () => void
  onClose: () => void
  onEvent: (evt: ServerEvent) => void
}

export interface ChatClient {
  send: (text: string) => boolean
  close: () => void
}

export interface ConnectChatOptions {
  room: string
  persona?: string
  baseUrl?: string
  cb: ChatPeerCb
}

export function defaultWsBase(room: string): string {
  return import.meta.env.DEV ? `ws://localhost:8787` : `wss://chat-sandbox.trimtab-signal.workers.dev`
}

export function connectChat(opts: ConnectChatOptions): ChatClient {
  const base = opts.baseUrl ?? defaultWsBase(opts.room)
  let ws: WebSocket | null = null
  let closed = false
  let retries = 0

  const url = `${base}/ws/${encodeURIComponent(opts.room)}${opts.persona ? `?persona=${encodeURIComponent(opts.persona)}` : ''}`

  const open = () => {
    const socket = new WebSocket(url)
    ws = socket
    socket.onopen = () => {
      retries = 0
      opts.cb.onOpen()
      socket.send(JSON.stringify({ type: 'hello', persona: opts.persona }))
    }
    socket.onmessage = (ev) => {
      try {
        opts.cb.onEvent(JSON.parse(String(ev.data)) as ServerEvent)
      } catch {
        // ignore malformed frames
      }
    }
    socket.onclose = () => {
      opts.cb.onClose()
      ws = null
      if (!closed) {
        const delay = Math.min(1000 * 2 ** retries, 15000)
        retries += 1
        setTimeout(open, delay)
      }
    }
    socket.onerror = () => {
      // close event follows and schedules a reconnect
    }
  }

  open()

  return {
    send(text: string): boolean {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'message', content: text }))
        return true
      }
      return false
    },
    close() {
      closed = true
      try {
        ws?.close()
      } catch {
        // already closed
      }
    },
  }
}

export function applyEvent(prev: ChatMessage[], evt: ServerEvent): ChatMessage[] {
  switch (evt.type) {
    case 'history':
      return evt.messages.length
        ? evt.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt }))
        : prev
    case 'message':
      return [...prev, { id: evt.message.id, role: evt.message.role, content: evt.message.content, createdAt: evt.message.createdAt }]
    case 'stream.start':
      return [...prev, { id: evt.id, role: 'assistant', content: '', createdAt: Date.now(), streaming: true }]
    case 'stream.delta':
      return prev.map((m) => (m.id === evt.id ? { ...m, content: m.content + evt.delta } : m))
    case 'stream.done':
      return prev.map((m) =>
        m.id === evt.id ? { id: evt.message.id, role: evt.message.role, content: evt.message.content, createdAt: evt.message.createdAt } : m
      )
    default:
      return prev
  }
}