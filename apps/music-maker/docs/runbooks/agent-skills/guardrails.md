# Guardrails: Autonomy Levels + Kill Switch

Default: L2 (mitigate without approval for rollback/flag/restart).
L3 requires DRI opt-in per incident. L4 is human-only, never granted.
Kill switch: AGENT_AUTONOMY_MAX env var (L0 = read-only). Tested monthly.
Human override: /agent halt in the incident channel stops all mutations.
