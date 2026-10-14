# D/firmware-integration.md — Node Zero drop-in (HARDWARE-GATED)

**Status: instructions only. DO NOT EXECUTE without Node Zero hardware present
and an ESP-IDF v5.5.3 toolchain machine.** The firmware repo
(`/home/p31/P31-local-workspace/firmware/node-zero/`) is READ-ONLY reference for
Lane D; this doc describes the drop-in, it does not perform it. `idf.py build`
verification is DEFERRED to a machine with the ESP-IDF toolchain (this box has
no toolchain; disk budget forbids installing one).

Artifacts referenced (all under this lane dir):

- `D/dist/p31_theme.h` — GENERATED LVGL 8.4 theme header (7,994 B, budget 8,192 B)
- `D/ui/index.html` + `D/ui/styles.css` — served web UI (8,072 B raw combined,
  2,960 B gzipped combined)
- `D/color-map.json` — the auditable canon-token → define map

## 0. Preconditions (gate)

1. Node Zero board present (ESP32-S3 N16R8, AXS15231B 3.5" panel).
2. ESP-IDF v5.5.3 toolchain + `idf.py` on PATH (per `RUNBOOK.md`).
3. `D/dist/p31_theme.h` regenerated (never hand-edited):
   `node D/gen-p31-theme.mjs` — exits 1 if any mapped canon token is missing
   or deprecated.

## 1. Theme header → firmware

```bash
cp D/dist/p31_theme.h /home/p31/P31-local-workspace/firmware/node-zero/main/p31_theme.h
```

The header includes `"lvgl.h"` (already on the firmware include path as
`components/lvgl/`) and is self-contained (include-guarded, extern "C" safe).

## 2. Apply the theme in `main/p31_ui.c`

Actual function/widget names as read from the firmware source — every edit
point is cited by file:line:

**2a. Include + init (in `p31_ui_init`, which builds the 320×480 screen):**

```c
#include "p31_theme.h"              /* top of p31_ui.c, with the other includes */

static p31_theme_t s_theme;         /* file-scope, next to the widget handles */

void p31_ui_init(lv_disp_t *disp) {
    p31_theme_init(&s_theme);                      /* before building widgets */
    lv_disp_set_default(disp);
    s_screen = lv_scr_act();
    p31_theme_apply_screen(s_screen, &s_theme);    /* replaces lv_color_hex(0x0A0A0F) at p31_ui.c:71 */
    ...
}
```

**2b. Replace every hardcoded color with its define** (same widgets, same
layout — the theme is a value swap, not a fork; runbook §8 D-2):

| p31_ui.c location | widget | old hardcode | define |
|---|---|---|---|
| :71  | screen bg | `0x0A0A0F` | `P31_COLOR_BG` |
| :77  | header bg | `0x0D1117` | `P31_COLOR_SURFACE` |
| :84  | title text `s_title_label` | `0x58A6FF` | `P31_COLOR_ACCENT` |
| :93  | LoRa dot idle `s_lora_dot` | `0x444444` | `P31_COLOR_TEXT_TERTIARY` |
| :105 | spoon arc track `s_spoon_arc` LV_PART_MAIN | `0x1A1A2E` | `P31_COLOR_SURFACE2` |
| :107 | spoon arc indicator LV_PART_INDICATOR | `0x00E5FF` | `P31_COLOR_ACCENT` |
| :116 | spoon % label `s_spoon_label` | `0xEAEAEA` | `P31_COLOR_TEXT_PRIMARY` |
| :122 | "SPOONS" label | `0x666688` | `P31_COLOR_TEXT_TERTIARY` |
| :129 | mesh label `s_mesh_label` | `0x888899` | `P31_COLOR_TEXT_SECONDARY` |
| :136 | RSSI title | `0x666688` | `P31_COLOR_TEXT_TERTIARY` |
| :142 | RSSI value `s_rssi_label` | `0x00E5FF` | `P31_COLOR_ACCENT` |
| :150 | RSSI bar track LV_PART_MAIN | `0x1A1A2E` | `P31_COLOR_SURFACE2` |
| :152 | RSSI bar fill LV_PART_INDICATOR | `0x00E5FF` | `P31_COLOR_ACCENT` |
| :159 | status line `s_status_label` | `0x444455` | `P31_COLOR_TEXT_TERTIARY` |
| :30–32 | `_async_lora` dot: RX / TX / error | `0x00E676` / `0xFFD600` / `0xFF1744` | `P31_COLOR_STATUS_SUCCESS` / `P31_COLOR_STATUS_WARNING` / `P31_COLOR_STATUS_ERROR` |

Fonts can likewise swap to `P31_FONT_TITLE/BODY/LABEL` (montserrat 24/16/14 —
all three are enabled in `main/lv_conf.h`; the code currently uses 32 for the
spoon % which is NOT in the theme set — keep it or move to `P31_FONT_TITLE`).

## 3. Served UI → SPIFFS assets partition

`partitions.csv` line 16: `assets, data, spiffs, 0xC10000, 0x3F0000`
(~4 MB, "for fonts/themes/emojis" per the table comment). The UI lands here:

```bash
# on the toolchain machine, build a SPIFFS image from the ui dir
python $IDF_PATH/components/spiffs/spiffsgen.py 0x3F0000 D/ui spiffs.bin
# flash at the assets partition offset (0xC10000)
python $IDF_PATH/components/esptool_py/esptool/esptool.py \
  --chip esp32s3 -p /dev/ttyUSB0 write_flash 0xC10000 spiffs.bin
```

**Known gap (verified):** `main/*` contains no HTTP server and no SPIFFS
mount today (`esp_http_server`/`spiffs` appear nowhere in `main/` — grep
evidence). The `ui/` assets are valid to place in the partition now; serving
them plus the `/api/status` route is a separate firmware wiring task. The UI's
fetch poll is guarded (`catch {}` → static page), so it renders identically
with no endpoint. Contract the UI expects once the route exists (all fields
optional; missing fields keep the static defaults):

```json
{ "spoons": 80, "lora": "RX", "rssi": -95, "mesh": "2 peers",
  "status": "initializing…", "did": "did:key:z6Mk…" }
```

## 4. Build verification — DEFERRED

```bash
cd firmware/node-zero && idf.py set-target esp32s3 && idf.py build
```

Run on the toolchain machine. Locally (no ESP-IDF), the header has passed a
`cc -fsyntax-only` check against the real LVGL 8.4 tree (see lane report).
If the build surfaces any LVGL warning from `p31_theme.h`, that is a finding —
fix in `D/gen-p31-theme.mjs`, regenerate, re-verify.

## 5. Flash (hardware present only)

```bash
./flash.sh /dev/ttyUSB0   # nuclear flash script (full erase + program)
```

## 6. On-panel fidelity check (the bar that matters)

Compare spoon arc + status dot + RSSI fill against the canon intent.
Known canon-faithful observations to verify visually (fix IN THE TOKEN, never
in `p31_ui.c`):

- canon `themes.cipher.p31.bg` resolves to `#020405` — darker than the old
  `0x0A0A0F` hardcode; surface steps (bg → surface → surface2) are subtle.
- canon "green" (hue 105) resolves to olive `#A19200` and "gold" (hue 15) to
  coral `#E7566B` — the status-dot semantics (RX/TX/error) must be eyeballed
  on the actual panel.

Any perceived problem → edit the canon token (or add a node-zero override
token file) → `node D/gen-p31-theme.mjs` → reflash. Hardcoding in `p31_ui.c`
is a doctrine violation (runbook §8 D-2, §14 stop condition).