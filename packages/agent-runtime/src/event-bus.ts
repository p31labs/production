/**
 * Event bus — the kernel's backbone. Typed pub/sub so agents can emit and
 * subscribe without direct coupling.
 */
import type { KernelEvent } from './types.js'

type Listener = (event: KernelEvent) => void

export class EventBus {
  private listeners = new Map<string, Set<Listener>>()

  subscribe(type: string, fn: Listener): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(fn)
    return () => {
      this.listeners.get(type)?.delete(fn)
    }
  }

  emit(type: string, payload: unknown, source: string): void {
    const event: KernelEvent = { type, payload, source, ts: Date.now() }
    for (const fn of this.listeners.get(type) ?? []) {
      try {
        fn(event)
      } catch (e) {
        // a subscriber must not take down the bus
        console.warn(`[agent-runtime] subscriber error on ${type}:`, e)
      }
    }
    // '*' wildcard listeners (observability)
    for (const fn of this.listeners.get('*') ?? []) {
      try {
        fn(event)
      } catch (e) {
        console.warn(`[agent-runtime] wildcard subscriber error:`, e)
      }
    }
  }
}