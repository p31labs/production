# fix: node-zero has no HTTP server or SPIFFS assets mount — embedded UI tier has no delivery path

<!-- P31-HEADER
id: p31_fix_plan_nodezero_embedded_ui_20261011_v1.0
type: fix-plan
component: firmware/node-zero
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

The design-workflow embedded tier (Lane D, 2026-10-11) produced a served-UI
package (`design-workflow/D-embedded/ui/` — index.html + styles.css, zero-JS
progressive enhancement, gz 2,960 B) and a generated LVGL theme header
(`D-embedded/dist/p31_theme.h`, compiles clean against the firmware's LVGL 8.4
tree with `-Wall -Wextra -Werror`). **Neither has a delivery path on device.**

## Evidence

Grep of `P31-local-workspace/firmware/node-zero/main/*` (2026-10-11):
- No `httpd`/`esp_http_server`/`WebServer` references — no HTTP server exists.
- No SPIFFS mount call despite `partitions.csv` reserving a 4 MB `assets`
  partition (offset `0xC10000`, subtype `spiffs`) "for fonts/themes/emojis".
- `p31_net.c` ships telemetry outbound only (spoon reports, Q-score); nothing
  serves a UI to the visitor's browser.
- Contract assumed by the embedded UI: `GET /api/status` JSON poll
  (documented in `design-workflow/D-embedded/firmware-integration.md` §3).

## Impact

- The embedded served-web tier compiles and is budget-gated but cannot ship.
- The LVGL header has no integration point yet; `p31_ui.c` still carries 16
  `lv_color_hex` hardcodes (file:line table in `firmware-integration.md` §2).

## Plan (hardware-gated — do not execute without the toolchain + device)

1. Add ESP-IDF HTTP server (esp_http_server) to node-zero serving `ui/*` from
   the `assets` SPIFFS partition; mount via `esp_vfs_spiffs_register`.
2. Implement `GET /api/status` matching the contract in
   `design-workflow/D-embedded/firmware-integration.md` §3 (status list, spoon
   value, LoRa dot, DID label) — served from the same telemetry state
   `p31_net.c` already owns (s_current_spoons et al.).
3. Drop `p31_theme.h` into `main/`; call `p31_theme_init` from the LVGL UI
   init; replace the 16 `lv_color_hex` hardcodes with `P31_COLOR_*` defines
   per the file:line table.
4. Build: `idf.py build` on an ESP-IDF v5.5.3 machine (deferred — this box has
   no toolchain and disk is at 97%). Flash via the existing `flash.sh`.
5. Hardware eyeball: verify spoon arc + status dots; two canon hues flagged
   for visual check (bg `#020405` darker than the old 0x0A0A0F hardcode;
   canon "green"→olive `#A19200`, "gold"→coral `#E7566B`). Fixes go through
   tokens, never through `p31_ui.c`.

## Blocked by

- No ESP-IDF toolchain on this machine (disk budget forbids install).
- No Node Zero hardware present in this session.

## References

- `P31-local-workspace/DESIGN-SYSTEM-PARALLEL-PATHS-RUNBOOK.md` §8
- `production/design-workflow/D-embedded/firmware-integration.md` (drop-in steps)
- `P31-local-workspace/firmware/node-zero/partitions.csv` (assets partition)
- `P31-local-workspace/firmware/node-zero/RUNBOOK.md` (boot sequence, UI section)