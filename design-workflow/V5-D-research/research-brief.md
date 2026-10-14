# D-1 — Research Brief for a Fresh-Search Session (v5.0)

<!-- P31-HEADER
id: p31_v5_research_brief_20261011_v1.0
type: research-brief
component: design-workflow/V5-D-research
status: ready — hand to a web-access session
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

Four questions, ordered by decision leverage. Each answer should come back
with: the settled fact, the source (URL + date), and a one-line implication
for P31. Confidence labels required (HIGH / MEDIUM / LOW). No speculation
presented as fact.

## Q1 — ESP-IDF v5.5.3 on Crostini (decides whether firmware goes partially on-box)

- Can ESP-IDF v5.5.3 be installed in a Debian-bookworm Crostini container on an
  Acer Spin 713 (24G disk free)? Install size, prerequisite packages, known
  Crostini blockers (USB passthrough for serial flash, /dev/ttyACM0 access).
- Is `idf.py build` for the existing node-zero project (ESP32-S3 target,
  LVGL 8.4 component) feasible on-box — i.e., build only, no flash?
- Known 2026 alternatives if the full toolchain is too heavy: PlatformIO core
  in Crostini, Docker-in-Crostini (docker available?), or cloud builds.

Decision it feeds: promote Lane A from "external" to "partially on-box"
(build + verify gates here; flash stays with hardware).

## Q2 — Agent-native design systems, post-Oct-2026 (the adoption frontier)

- What shipped since Meta's Astryx (June 2026) and Salt DS MCP (Mar 2026)?
  New MCP-server design systems, the Code Mode single-tool pattern vs.
  small-tool surfaces, A2UI renderer adoption.
- Which pattern is winning for design-system MCP surfaces in late 2026:
  5–10 domain tools, or a Code Mode / OpenAPI-tool collapse?

Decision it feeds: whether P31's 5-tool canonical surface should add a Code
Mode tool later, and whether the surface spec needs a v2.

## Q3 — Browser-based task-completion testing references (closes the RFC-0006 §8.5 gap)

- Reference implementations of agent usability simulation: an AI agent
  completes a task against a rendered UI (browser-driven, recorded steps,
  pass/fail). What exists in 2026 — tooling, benchmarks, or design-system
  gate examples?
- Is there an off-the-shelf harness, or is this bespoke per system?

Decision it feeds: the queued `task-completion.mjs` scaffold (v4.0 D-1).

## Q4 — Adoption measurement (is "built" finally measurable?)

- Any follow-up to Supernova's 31-system capability audit measuring ACTUAL
  adoption/usage rather than capability (Oct 2026)?
- Industry numbers: what correlates with real adoption — MCP tool calls per
  repo, llms.txt reads, component reuse rates, agent-session telemetry?

Decision it feeds: what P31 should instrument post-deploy to prove adoption.

---

## Constraints for the researching session

- Return evidence with URLs + dates. Cite `file:line` where applicable.
- No vendor marketing claims as fact. Prefer primary sources (docs, repos,
  specs, papers).
- Keep the answer to four decision-grade paragraphs + source list.