export type Role = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: Role
  content: string
  createdAt: number
  streaming?: boolean
}

export type ServerEvent =
  | { type: 'welcome' | 'presence'; room?: string; members?: number }
  | { type: 'history'; messages: Array<{ id: string; roomId: string; role: Role; content: string; createdAt: number }>; last: string | null }
  | { type: 'message'; message: { id: string; roomId: string; role: Role; content: string; createdAt: number }; echo: boolean }
  | { type: 'stream.start'; id: string }
  | { type: 'stream.delta'; id: string; delta: string }
  | { type: 'stream.done'; id: string; message: { id: string; roomId: string; role: Role; content: string; createdAt: number } }
  | { type: 'error'; reason: string }