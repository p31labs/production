# @p31ca/agent-runtime

The **P31 family orchestration kernel** — the agentic pipeline that connects the
QPJ workspace, the Forge, and the Loom.

Free, sovereign, **open source**, community-funded. No shareholders, no data
monetization, no enshittification pressure. The roadmap is the families' roadmap.

## What it does

A family member types:

> "Draft an IEP request letter for Willow with her diagnosis date."

The kernel:
1. **Chief-of-staff** decomposes the intent into sections (request / evidence / closing).
2. **Drafting agents** write each section.
3. **Context agent** retrieves scoped evidence (with provenance).
4. The **Forge pack** is assembled (themed, evidence-blocked).
5. The **policy gate** decides the risk class (A auto / B standing / C explicit approval).
6. The output is ready for the Forge MCP server to render to a `.docx`.

Every step emits events on the bus so the Loom can hash-chain the provenance.

## The three legs

- **Scoped memory** — personal / household / session, enforced *before* retrieval
  (isolation fails at the fetch, not after).
- **Risk-class policy** — A (auto), B (standing consent), C (explicit human approval).
- **Family-test ready** — kernel + memory + approval ship together, because you
  can't put agents in front of a family without privacy boundaries and human control.

## Usage

```ts
import {
  EventBus, ScopedMemoryStore, PolicyGate, Coordinator, FamilyPipeline,
} from '@p31ca/agent-runtime'

const bus = new EventBus()
const memory = new ScopedMemoryStore({ householdMembers: ['mum', 'dad'] })
const policy = new PolicyGate({
  requestApproval: async (action, reason) => true,
})

// drafting agents (per section)
const drafting = {
  request: /* Agent */,
  evidence: /* Agent */,
  closing: /* Agent */,
}

const coordinator = new Coordinator(
  { role: 'chief-of-staff', did: 'did:key:z6Mk…', name: 'Willow' },
  drafting,
  { evidenceResolver: async () => ({ claim: 'x', source: 's', verified: '2026-09-23' }) },
)

const pipeline = new FamilyPipeline({
  member: 'mum',
  householdMembers: ['mum', 'dad'],
  coordinator,
  memory,
  policy,
  bus,
})

const { pack, approval, provenance } = await pipeline.run(
  'draft an IEP request letter for Willow with her diagnosis date',
)
```

## Build + verify

```bash
cd packages/agent-runtime
pnpm install
pnpm typecheck   # 0 errors
pnpm test        # all pass
pnpm build       # dist/ emits
```