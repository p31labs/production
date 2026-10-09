---
q: How does the Loom stop an agent from doing something it shouldn't?
a: A pre-execution gate (guardAgentEvent) checks every action before it runs. In-scope actions proceed; out-of-scope actions are refused — and the refusal is itself recorded in the chain, so a denied action can never appear as if it happened.
category: stack
---

The gate is type-enforced, not prompt-enforced: agent kinds (propose, review, presence) can never approve their own work — only human kinds (approve, reject, revise) can. This is the difference between "the agent skipped the gate" and "the agent was refused at the gate," and the Loom records both distinctly.