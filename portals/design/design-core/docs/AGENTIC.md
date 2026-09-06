# Agentic Design System — Operating Guide

The pipeline (canon §IV): **Intent YAML → Gemini → Opus gate → Sonnet → DeepSeek gate → ship → learn.**

## What exists here today

| Piece | Location | Status |
|---|---|---|
| Intent DSL schema | `src/agentic/intent/schema.ts` (zod) | ✅ enforced |
| Parser + summarizer | `src/agentic/intent/parser.ts` | ✅ tested |
| 10 canonical example intents | `src/agentic/intent/examples/*.yml` | ✅ all pass gates |
| Agent role contracts | `src/agentic/agents/*.prompt.md` | ✅ |
| Tag-out pipeline definition | `src/agentic/orchestrate.ts` | ✅ |
| Opus automated gates | `src/agentic/qa/gates.ts` | ✅ wired to CLI |
| Perf budgets | `src/agentic/perf/budget.ts` | ✅ gzip/frame math |
| Learning loop events | `src/agentic/learning/track.ts` | ✅ DOM CustomEvents (`p31:*`) |
| CLI | `src/agentic/cli.ts` via `pnpm design …` | ✅ |

## Commands

```bash
pnpm design list                          # validate whole registry
pnpm design audit <file.yml>              # Opus report; exit 1 on reject
pnpm design create Drawer                 # scaffold intent draft
pnpm design variant button-affirm.yml --celebration --spoons=4
```

## Adding a component the agentic way

1. **Gemini**: `pnpm design create MyThing` → fill narrative citing human need + principles.
2. **Opus**: `pnpm design audit my-thing.design.yml` must APPROVE before any code.
3. **Sonnet**: build in `src/primitives/` per `agents/sonnet-mechanic.prompt.md`; add intent file to examples.
4. **DeepSeek**: measure against budgets; attach PERF REPORT to the PR.
5. **Learn**: component calls `emitDesignEvent({ type: 'component-used', … })`; hosts subscribe via `onDesignEvent`.

LLM orchestration (calling actual models) is pluggable next step — stages and gates are model-independent by design, so any executor (local Ollama or API agents) can drive the same pipeline.
