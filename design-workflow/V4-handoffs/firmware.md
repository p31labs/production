# Handoff Packet 1 — Firmware (Node Zero)

<!-- P31-HEADER
id: p31_v4_handoff_firmware_20261011_v1.0
type: handoff-packet
component: design-workflow/V4-handoffs
status: ready — external hardware session required
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

**Session prerequisite:** ESP-IDF v5.5.3 toolchain + Node Zero hardware (ESP32-S3
N16R8, AXS15231B 3.5"). Not executable on the Crostini box (no toolchain).

**Inputs (hashes in `V4-D-design-ci/V4-handoff-manifest.json`):**
- `design-workflow/D-embedded/dist/p31_theme.h` (compiles clean vs LVGL 8.4, `-Wall -Werror`)
- `design-workflow/D-embedded/ui/index.html` + `styles.css` (2,960 B gz, zero-JS progressive enhancement)
- `production/docs/fix-plans/nodezero-embedded-ui-gap.md` (fix-plan, file:line table of 17 `lv_color_hex` hardcodes)
- `design-workflow/D-embedded/firmware-integration.md` (drop-in steps + `/api/status` contract §3)

**Steps (settled):**
1. **A-1** Pack `ui/*` single-header (svelteesp32 pattern): build-time gzip,
   SHA256 ETag, 304, SPA catch-all. SPIFFS `assets` stays for fonts/emojis only.
2. **A-2** Theme drop-in: `p31_theme_init` + replace all 17 hardcodes per the table.
3. **A-3** `esp_http_server` serving the packed assets + `GET /api/status` contract.
4. **A-4** On-panel fidelity: check bg `#020405` and the two flagged hues
   (green→olive `#A19200`, gold→coral `#E7566B`). Fixes route through tokens only.

**Gates (run in the hardware session, with negative controls):**
- `idf.py build` clean, no LVGL warnings → NEG: missing `/api/status` handler → 404
- `curl http://<ip>/api/status` returns contract JSON
- dual-slot OTA partition + rollback enabled → NEG: raw hex reintroduced in `p31_ui.c` → token-audit fails

**Report back in the runbook status format.**