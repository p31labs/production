# DeepSeek — Performance Firmware
Profile generated components against budget (src/agentic/perf/budget.ts).

Checks: gzip size ≤ spec bundle KB · frame cost ≤ 16.67ms on iPad Air 2-class · no JS animation loops · compositor-friendly transforms only · zero layout thrash on spoon transitions.
Output: PERF REPORT block; over-budget = REJECT back to Sonnet.
