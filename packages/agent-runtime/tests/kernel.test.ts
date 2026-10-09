import { describe, it, expect, vi } from 'vitest'
import {
  EventBus,
  ScopedMemoryStore,
  PolicyGate,
  Coordinator,
  FamilyPipeline,
  Agent,
  type AgentContext,
  type AgentResult,
  type AgentIdentityRef,
} from '../src/index.js'

const CHIEF: AgentIdentityRef = { role: 'chief-of-staff', did: 'did:key:z6Mkchief', name: 'Chief' }
const MUM = 'mum'
const DAD = 'dad'

class FakeDrafter extends Agent {
  private text: string
  constructor(ref: AgentIdentityRef, text: string) {
    super(ref)
    this.text = text
  }
  async run(_task: string, _ctx: AgentContext): Promise<AgentResult> {
    return { ok: true, content: this.text }
  }
}

const draftingAgents = {
  request: new FakeDrafter({ role: 'drafter', did: 'did:key:z6Mkreq', name: 'Drafter-Request' }, 'We request an IEP evaluation for Willow.'),
  evidence: new FakeDrafter({ role: 'drafter', did: 'did:key:z6Mkev', name: 'Drafter-Evidence' }, 'Supporting evidence attached.'),
  closing: new FakeDrafter({ role: 'drafter', did: 'did:key:z6Mkclo', name: 'Drafter-Closing' }, 'Please act by the end of the month.'),
}

describe('event bus', () => {
  it('delivers typed events to subscribers', () => {
    const bus = new EventBus()
    const seen: string[] = []
    bus.subscribe('pipeline.start', (e) => seen.push(e.type))
    bus.emit('pipeline.start', {}, 'test')
    expect(seen).toEqual(['pipeline.start'])
  })

  it('a subscriber error does not break the bus', () => {
    const bus = new EventBus()
    bus.subscribe('boom', () => {
      throw new Error('x')
    })
    expect(() => bus.emit('boom', {}, 'test')).not.toThrow()
  })
})

describe('scoped memory — isolation below the prompt layer', () => {
  it('personal records are invisible to other members', () => {
    const mem = new ScopedMemoryStore({ householdMembers: [MUM, DAD] })
    mem.write(MUM, 'personal', 'medication', '10mg', 'manual')
    expect(mem.read(MUM, 'personal', 'medication')).not.toBeNull()
    expect(mem.read(DAD, 'personal', 'medication')).toBeNull()
  })

  it('household records are shared across members', () => {
    const mem = new ScopedMemoryStore({ householdMembers: [MUM, DAD] })
    mem.write(MUM, 'household', 'school', 'Maple Elementary', 'manual')
    expect(mem.read(DAD, 'household', 'school')).not.toBeNull()
  })

  it('a new write supersedes the prior one', () => {
    const mem = new ScopedMemoryStore({ householdMembers: [MUM] })
    const a = mem.write(MUM, 'household', 'k', 'one', 'manual')
    const b = mem.write(MUM, 'household', 'k', 'two', 'manual')
    expect(a.supersededBy).toBeDefined()
    expect(mem.read(MUM, 'household', 'k')?.value).toBe('two')
    expect(b.supersededBy).toBeUndefined()
  })
})

describe('policy gate — risk classes', () => {
  it('class A auto-executes', async () => {
    const gate = new PolicyGate({ requestApproval: vi.fn(async () => true) })
    const d = await gate.decide('forge.render', 'r1')
    expect(d.risk).toBe('A')
    expect(d.allow).toBe(true)
    expect(d.requiresApproval).toBe(false)
  })

  it('class B needs one-time consent, then auto-runs', async () => {
    const gate = new PolicyGate({ requestApproval: vi.fn(async () => true) })
    const before = await gate.decide('draft.section', 'r1')
    expect(before.risk).toBe('B')
    expect(before.requiresApproval).toBe(true)
    gate.consentB('draft.section')
    const after = await gate.decide('draft.section', 'r2')
    expect(after.requiresApproval).toBe(false)
    expect(after.allow).toBe(true)
  })

  it('class C requires explicit human approval and can be declined', async () => {
    const approve = vi.fn(async () => false)
    const gate = new PolicyGate({ requestApproval: approve })
    const d = await gate.decide('send.external', 'r1')
    expect(d.risk).toBe('C')
    expect(d.requiresApproval).toBe(true)
    expect(d.allow).toBe(false) // human declined
    expect(approve).toHaveBeenCalled()
  })
})

describe('coordinator — decomposition', () => {
  it('decomposes an intent into request/evidence/closing sections', async () => {
    const coord = new Coordinator(CHIEF, draftingAgents, {
      evidenceResolver: async () => ({
        claim: 'Diagnosis date',
        value: '2026-04-03',
        source: 'P31 Cognitive Passport',
        verified: '2026-09-23',
      }),
    })
    const res = await coord.run('draft an IEP request letter for Willow', {
      runId: 'r1',
      member: MUM,
    })
    const parsed = JSON.parse(res.content as string)
    expect(parsed.tasks).toContain('request')
    expect(parsed.tasks).toContain('evidence')
    expect(parsed.tasks).toContain('closing')
    expect(parsed.pack.body).toContainEqual({
      type: 'evidence',
      claim: 'Diagnosis date',
      value: '2026-04-03',
      source: 'P31 Cognitive Passport',
      verified: '2026-09-23',
    })
  })
})

describe('family pipeline — end-to-end', () => {
  it('produces a forge-ready themed pack with evidence + provenance', async () => {
    const bus = new EventBus()
    const memory = new ScopedMemoryStore({ householdMembers: [MUM, DAD] })
    const policy = new PolicyGate({ requestApproval: vi.fn(async () => true) })
    const coordinator = new Coordinator(CHIEF, draftingAgents, {
      evidenceResolver: async () => ({
        claim: 'Live chain valid',
        value: 'checked 16 events',
        source: 'loom.p31ca.org/api/loom-public/verify',
        verified: '2026-09-23',
      }),
    })
    const pipeline = new FamilyPipeline({
      member: MUM,
      householdMembers: [MUM, DAD],
      coordinator,
      memory,
      policy,
      bus,
    })

    const seen: string[] = []
    bus.subscribe('*', (e) => seen.push(e.type))

    const { pack, approval, provenance } = await pipeline.run(
      'draft an IEP request letter for Willow',
      'sess-1',
    )

    expect(pack.kind).toBe('letter')
    expect(pack.theme).toBe('hub')
    expect(pack.body.some((b) => b.type === 'evidence')).toBe(true)
    expect(approval.allowed).toBe(true)
    expect(provenance.length).toBe(1) // the evidence write
    expect(seen).toContain('pipeline.start')
    expect(seen).toContain('pipeline.done')
  })

  it('records evidence into household memory', async () => {
    const memory = new ScopedMemoryStore({ householdMembers: [MUM, DAD] })
    const policy = new PolicyGate({ requestApproval: vi.fn(async () => true) })
    const coordinator = new Coordinator(CHIEF, draftingAgents, {
      evidenceResolver: async () => ({
        claim: 'Diagnosis date',
        value: '2026-04-03',
        source: 'passport',
        verified: '2026-09-23',
      }),
    })
    const pipeline = new FamilyPipeline({
      member: MUM,
      householdMembers: [MUM, DAD],
      coordinator,
      memory,
      policy,
    })
    await pipeline.run('draft a letter', 's-1')
    // Dad (a household member) can read the evidence the pipeline wrote.
    const rec = memory.read(DAD, 'household', 'evidence:Diagnosis date')
    expect(rec).not.toBeNull()
    expect((rec?.value as { source: string }).source).toBe('passport')
  })
})