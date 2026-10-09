the two pipelines thing finally clicked. workflow A: brain dump to published research report. workflow B: research report to built artifact. they converge at ONE artifact — the handoff block. the report IS the brief

what I love about this — the report is a product on its own. solo research MVP. somebody who just wants a cited report gets it. and then the SAME report drives the build. one input, two outputs. most people build the builder first and the research is a means to an end. I want the research to be independently valuable

the guided intake thing — I keep coming back to it. the agents should not start until I confirm the interpretation. gemini does this. claude does this. you write your prompt, it says "here's what I think you want, here's the scope, here's the plan, yes?" and you correct it BEFORE the expensive part runs. that's the difference between a tool and a collaborator

the orthogonal researchers — WHO / WHAT / HOW / WHERE / WHEN / WHY / LIMITS. MECE. no overlap. and each one writes to a FILE and returns a PATH, not a wall of text. the orchestrator reads files. context stays clean. anthropic does this. it's the right pattern

the fact-check gate is what makes it publishable. 40-80% citation accuracy is the field's bar and it's embarrassing. the same-root collapse thing — three agents citing the same press release is ONE vote, not three. the kish formula. n_eff. nine echoes = fewer than three real voices. THAT's the gap everybody's missing

contradiction: do I need the ledger to be human-readable or machine-readable? dossier says machine (it's state). but a human reviewing a report wants to see the claims. maybe both — machine underneath, rendered claims on top. the JSONL is the truth, the UI is a view of it

gap: I have the deterministic core tested (51 tests) but I've never run it end-to-end with a real model. the cache wiring is in. the session id threads through. but nobody's watched cachedPromptTokens go 0 to non-zero. that's the one live proof I keep deferring

the convergence block — entities, actions, constraints, gaps. the Grounder reads THAT, not the prose. so the report's prose is for humans and the block is for the engine. clean separation. the prose can be beautiful and the block can be terse and they don't fight

tangent — the "as of" date. every report carries one. no look-ahead. if you're researching a topic, you only read what existed before your cutoff. otherwise you're cheating and the citations are time-inconsistent

what's the ONE thing? the report is both MVP and brief. build the research pipeline as if the artifact pipeline doesn't exist, then make the artifact pipeline consume its output. don't build the builder first