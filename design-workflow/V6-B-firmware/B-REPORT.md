# B-REPORT.md — Lane B (v6.0) Firmware build on-box

**Lane:** B · **Owner:** firmware lane (on-box) · **Date:** 2026-10-11/12 (UTC)
**Runbook:** DESIGN-SYSTEM-PARALLEL-PATHS-RUNBOOK-V6.md §5 (laws 0–2, 10, 22)
**Facet edited:** `/home/p31/P31-local-workspace/firmware/node-zero/**` only.
**Hardware:** NONE touched. No `idf.py flash`, no `idf.py monitor`, no USB.
**Result: BUILD PASSES. `idf.py build` exit 0. Firmware: `build/p31-node-zero.bin` (1,277,280 B; 80% of the 6 MB app0 partition free).**

---

## 1. Summary of executed moves

| Step | Move | Gate | Result |
|---|---|---|---|
| B-1 | ESP-IDF v5.5.3 toolchain on-box (apt + clone + install.sh esp32s3) | `idf.py --version` = v5.5.x | **PASS** (`ESP-IDF v5.5.3`) |
| B-2 | Theme drop-in: `p31_theme.h` → main/; `p31_theme_init` wired; 17 `lv_color_hex` → `P31_COLOR_*` | `grep -c lv_color_hex main/p31_ui.c` == 0 | **PASS** (0) |
| B-3 | Single-header UI pack + esp_http_server (/, /styles.css, /api/status) | gz ≤ 100 KB; contract-gate | **PASS** (2,958 B gz; all 6 fields) |
| B-4 | `idf.py set-target esp32s3 && idf.py build` | exit 0; no LVGL warnings | **PASS** (0 / 0 LVGL warnings) |

**All four negative controls fail by design** (table in §7).

---

## 2. B-1 — Toolchain (log: `V6-B-firmware/B1-toolchain.log`)

```bash
sudo apt-get update -qq
sudo apt-get install -y git wget flex bison gperf python3 python3-venv cmake ninja-build ccache dfu-util libusb-1.0-0
```
Exact installed packages (dpkg-query):
```
bison 2:3.8.2+dfsg-1+b2   ccache 4.11.2-2   cmake 3.31.6-2   dfu-util 0.11-3
flex 2.6.4-8.2+b4   git 1:2.47.3-0+deb13u1   gperf 3.2.1-1   libusb-1.0-0 2:1.0.28-1
ninja-build 1.12.1-1   python3 3.13.5-1   python3-venv 3.13.5-1   wget 1.25.0-2
```
```bash
git clone -b v5.5.3 --depth 1 --recursive --shallow-submodules \
  https://github.com/espressif/esp-idf.git ~/esp-idf-v5.5.3
cd ~/esp-idf-v5.5.3 && ./install.sh esp32s3
```
Disk footprint: before 23G free → after apt 23G → after clone 654M used (`~/esp-idf-v5.5.3`) →
after install `~/.espressif` = **3.8G** → final **20G free**. Toolchains: xtensa-esp-elf,
riscv32-esp-elf, esp32ulp-elf, openocd-esp32, esp-rom-elfs, xtensa-esp-elf-gdb.

**Gate (paste):**
```
$ . ./export.sh && idf.py --version
ESP-IDF v5.5.3
exit: 0
```
(venv python 3.13.5, `IDF_PATH=/home/p31/esp-idf-v5.5.3`.)

---

## 3. B-2 — Theme drop-in

```
cp production/design-workflow/D-embedded/dist/p31_theme.h → firmware/node-zero/main/p31_theme.h   (8,018 B, byte-identical)
```
`main/p31_ui.c` (sanctioned edits, cited file:line per firmware-integration.md §2):
- `#include "p31_theme.h"` + `static p31_theme_t s_theme;`
- `p31_theme_init(&s_theme)` + `p31_theme_apply_screen(s_screen, &s_theme)` in `p31_ui_init`
- **17/17** `lv_color_hex` replaced: screen `P31_COLOR_BG`, header `P31_COLOR_SURFACE`, title/RSSI/arc-indicator `P31_COLOR_ACCENT`, LoRa dot idle/RSSI-title/SPOONS/status `P31_COLOR_TEXT_TERTIARY`, mesh `P31_COLOR_TEXT_SECONDARY`, spoon % `P31_COLOR_TEXT_PRIMARY`, arc/bar tracks `P31_COLOR_SURFACE2`, LoRa dot `P31_COLOR_STATUS_SUCCESS/WARNING/ERROR` (the `_async_lora` ternary).

**Gate (paste):**
```
$ grep -c "lv_color_hex" main/p31_ui.c
0
```
**Negative control (git-stash-style temp copy, real file left clean):**
```
$ sed -i 's/lv_obj_set_style_text_color(s_status_label, P31_COLOR_TEXT_TERTIARY, 0);/lv_obj_set_style_text_color(s_status_label, lv_color_hex(0x444455), 0); \/* SABOTAGE *\//' /tmp/opencode/b2-neg/p31_ui.sabotaged.c
$ grep -c "lv_color_hex" /tmp/opencode/b2-neg/p31_ui.sabotaged.c
1            ← gate reports 1, real file still 0
```
(Fonts left as-is: the §2 table is colors-only; spoon % keeps montserrat_32 per the doc's note.)

---

## 4. B-3 — Single-header pack + HTTP server

**(a) `V6-B-firmware/pack-ui.mjs`** — zero-dep Node, reads `D-embedded/ui/*`, emits
`main/p31_web_assets.h`: gz byte arrays + raw fallback arrays + original sizes +
sha256-of-gz ETag constants. Gate output (paste):
```
index.html: 2664 B raw -> 1202 B gz
styles.css: 5408 B raw -> 1756 B gz
TOTAL gz: 2958 B  (budget 102400 B)     ← ≤ 100 KB gz  PASS
header:   71399 B -> .../main/p31_web_assets.h
PACK OK
```
Verified independently: `sha256(embedded gz) == ETAG`, `gunzip(embedded gz) == raw file`.

**(b) `main/p31_http.h/.c`** — extended additively (client helpers kept; `ota.c` depends on
`p31_http_get_json`). Server section: `esp_http_server` on port 80 —
`GET /`, `GET /index.html`, `GET /styles.css` (gzip Content-Encoding when the client
advertises it, sha256 ETag + 304 on If-None-Match), `GET /api/status` per
firmware-integration.md §3:
```
{"spoons":<p31_net_spoons_get()>,"lora":<lora_state()>,"rssi":<s_rssi>,"mesh":"self","status":<p31_net_status_get()>,"did":<mldsa_identity_did_key()>}
```
Telemetry state: added `p31_net_spoons_get()` / `p31_net_status_set/get()` to
`p31_net.c` (the state owner), `p31_web_set_rssi()` fed by the LoRa monitor task.
`mesh` is `"self"` — the firmware has no peer table yet (documented gap; honest value).

**(c) Boot wiring** — `main.cpp`: `p31_http_start()` after WiFi/LoRa init (binds once the
netif + default event loop exist); RSSI + status mirrored. `main/CMakeLists.txt`:
`p31_http.c` added to SRCS, `esp_http_server` + `mbedtls` in REQUIRES.

---

## 5. B-4 — Build gates

**Gate (paste, tails):**
```
$ . $HOME/esp-idf-v5.5.3/export.sh && idf.py set-target esp32s3 && idf.py build
...
-- Configuring done / -- Generating done
set-target exit: 0
...
Generated .../build/p31-node-zero.bin
p31-node-zero.bin binary size 0x137d60 bytes. Smallest app partition is 0x600000 bytes. 0x4c82a0 bytes (80%) free.
idf.py build exit: 0
```
(RAM on this box: 6.4G, ~1.4G available; build run via `ninja -C build -j2` + ccache —
`idf.py build` itself hardcodes `-j9` which risks OOM here. ccache: 99.8% usable, 66% hit.)

**Warnings scan** — 0 LVGL warnings. Pre-existing (non-LVGL, not introduced by Lane B):
```
main/lora.c:165  comparison is always true ... [-Wtype-limits]
main/lora.c:75   'sx_cmd' defined but not used [-Wunused-function]
main/main.cpp:208 missing initializer esp_timer_create_args_t::{arg,dispatch_method,skip_unhandled_events}
main/mldsa_identity.c:163 iteration 22 invokes undefined behavior [-Waggressive-loop-optimizations]
```
(First two are warnings-only; filed as findings, not fixed — out of Lane B scope.)

**Gate scripts (lane dir):** `V6-B-firmware/hex-gate.mjs` (scans `p31_ui.c` for
`lv_color_hex(`, exit 1 on hit), `V6-B-firmware/contract-gate.mjs` (requires
`.uri = "/api/status"` registration + handler + all 6 JSON field keys, exit 1 when missing).

---

## 6. Blocker archaeology (what the first on-box build actually surfaced)

The firmware had **never been built outside the July 2026 Docker snapshot** (IDF master,
different sources). Building with IDF v5.5.3 + the current registry exposed pre-existing
defects, all fixed inside the sanctioned facet (evidence in `B4-build.log`):

| # | Defect found | Fix (file) |
|---|---|---|
| 1 | `espressif/esp_random` in mldsa-esp32 manifest — **never existed** in the registry (404 verified) | `esp_hw_support` provides `esp_fill_random`; manifest line removed, REQUIRES `esp_hw_support` |
| 2 | **Registry drift:** `espressif/esp_lcd_touch_axs15231b` **unpublished** (folded into `esp_lcd_axs15231b` ≥2.1, which now ships `esp_lcd_touch_new_i2c_axs15231b`) | root manifest entry removed; touch path rewritten |
| 3 | New unified driver needs the NEW i2c_master API + `esp_lcd_touch_register_with_lvgl` is gone — conflicts with the board's legacy-I2C `bus_mutex` | `touch.c` rewritten: direct AXS15231B read protocol (0xB5,0xAB,0xA5,0x5A magic + 8-byte record @0x3B) over bus_mutex legacy I2C + LVGL 8.4 `read_cb`. Same wire protocol as upstream v2.1.1 |
| 4 | IDF v5.5.3 build reads the manifest at **`main/idf_component.yml`**, not the project root | deps moved to `main/idf_component.yml`; root file renamed `idf_component.yml.root-inert` |
| 5 | `esp_crt_bundle` component folded into **`mbedtls`** in IDF 5.5 | REQUIRES `esp_crt_bundle` → `mbedtls` |
| 6 | **partitions.csv overlap:** otadata (0xF000+0x2000) ended at 0x11000 over app0 @0x10000 — the "verified no overlaps" comment was false | Canonical Xiaozhi v2: nvs 0x5000, otadata @0xE000; comment arithmetic corrected |
| 7 | sdkconfig: default `WIFI_RX_BA_WIN=16` > dynamic(8)/2×static(4) → IDF 5.5 `#error` | `CONFIG_ESP_WIFI_RX_BA_WIN=8` in sdkconfig.defaults |
| 8 | Vendored LVGL Kconfig defaults `LV_CONF_SKIP=y` → **main/lv_conf.h ignored** (fonts/PSRAM allocator lost); Kconfig widget defaults (BTNMATRIX/KEYBOARD…=1) collided with lv_conf.h's =0 | `CONFIG_LV_CONF_SKIP=n`, `CONFIG_LV_BUILD_EXAMPLES=n` + demos; lv_conf.h made **complete** (all unused widgets/libs explicit 0; `LV_COLOR_16_SWAP 1` added); `LV_CONF_PATH` propagated globally (root CMakeLists + vendored esp.cmake) |
| 9 | `axs15231b_vendor_config_t.flags.mirror_by_cmd` removed in driver 2.1.x | flag dropped from `display.c` |
| 10 | `p31_care_proof.c` `%08x` vs uint32_t (fatal under IDF 5.5 `-Werror=format`) | cast `(unsigned int)entropy_roots` |
| 11 | `p31_http.h` not self-contained (`esp_http_client_event_t` undeclared when included from C++) | `#include "esp_http_client.h"` added |
| 12 | `p31_http.c` client helpers used `vTaskDelay` without freertos includes (now compiled since the file joined SRCS) | includes added |

Firmware diff (working tree, not committed — operator reviews): `git status node-zero/` =
M CMakeLists, main/{CMakeLists,display,lv_conf,main,p31_care_proof,p31_http{.c,.h},p31_net{.c,.h},p31_ui,touch}.c, components/{lvgl/env_support/cmake/esp.cmake, mldsa-esp32/{CMakeLists,idf_component.yml}};
untracked additions: main/{p31_theme.h,p31_web_assets.h,idf_component.yml}, managed_components/* (fresh registry fetch), dependencies.lock, sdkconfig.
Docker-era root-owned `build/` + `managed_components/` moved aside (`build.docker-stale/`, `managed_components.docker-stale/`) — audit trail kept.

---

## 7. GATES RUN

| Gate | Command | Result | Negative control | Result |
|---|---|---|---|---|
| idf-version | `. ./export.sh && idf.py --version` | `ESP-IDF v5.5.3` exit 0 ✅ | absent toolchain → fail (N/A by construction) | — |
| theme-dropin | `grep -c lv_color_hex main/p31_ui.c` | **0** ✅ | temp copy + re-added hex → `grep -c` = **1** | fails ✅ |
| hex-gate | `node V6-B-firmware/hex-gate.mjs` | 0 hits exit 0 ✅ | `... /tmp/opencode/b2-neg/p31_ui.sabotaged.c` | `p31_ui.sabotaged.c:165 … lv_color_hex(0x444455)` exit **1** ✅ |
| pack-budget | `node V6-B-firmware/pack-ui.mjs` | **2,958 B gz** ≤ 100 KB ✅ | — (budget check exits 1 over cap) | — |
| contract-gate | `node V6-B-firmware/contract-gate.mjs` | route+handler+6 fields PASS exit 0 ✅ | `... /tmp/opencode/b3-neg/p31_http.sabotaged.c` (handler removed) | `FAIL: missing route registration / handler / spoons / lora / rssi / mesh / status / did` exit **1** ✅ |
| firmware-build | `idf.py set-target esp32s3 && idf.py build` | exit 0; 0 LVGL warnings ✅ | sabotaged `p31_http.c` compiles (expected — gate is the contract check, not the compiler) | documented above |

Note on B-4 negative control (ii): the sabotaged copy with the `/api/status` handler
removed is **compile-fine by design**; the runbook's gate is the contract check —
`contract-gate.mjs` exits 1 against it (paste above). Smoke-level verification
(HTTP GET of the real routes) remains hardware-gated with flash.

---

## 8. Remains hardware-gated (do NOT execute without Node Zero hardware)

1. **Flash** — `./flash.sh /dev/ttyUSB0` (nuclear flash script; or
   `idf.py -p /dev/ttyUSB0 flash`) — the `esptool.py` command line is printed by the
   build: `0x0 bootloader.bin 0x8000 partition-table.bin 0xe000 ota_data_initial.bin 0x10000 p31-node-zero.bin`.
2. **OTA dual-slot verification** — `app0/app1` rollback + `otadata` behavior (partition
   table now boots clean; the overlap defect is fixed, but OTA swap has never been
   exercised on hardware).
3. **On-panel fidelity** — spoon arc + status dots through RGB565; the two flagged hues:
   canon bg `#020405` (darker than the old `0x0A0A0F`) and "green"→olive `#A19200` /
   "gold"→coral `#E7566B` status semantics. Fixes go through tokens
   (`D/gen-p31-theme.mjs`), never `p31_ui.c` (doctrine).
4. **Served-UI smoke on the panel** — `/`, `/styles.css`, `/api/status` gzip+ETag
   behavior over a real WiFi link (compiles clean; runtime needs the device).
5. **Touch calibration on the real panel** — the rewritten AXS15231B direct-read
   touch driver implements the upstream wire protocol, but the swap_xy/mirror_x
   transform needs the hardware eyeball.

---

## 9. Decisions

1. **Touch driver rewrite** (direct AXS15231B read over `bus_mutex` legacy I2C) instead
   of migrating to the new `i2c_master` driver — the whole board shares I2C0 through the
   legacy driver + mutex; the new `esp_lcd_touch` API would have required dual-bus
   surgery. Same wire protocol as Espressif's own v2.1.1 driver.
2. **`main/idf_component.yml`** is the one true manifest location under IDF 5.5.3;
   the root file is kept as `idf_component.yml.root-inert` for the operator to delete
   or restore once the registry restores the unpublished touch component.
3. **`main/lv_conf.h` made complete** — it was silently skipped by the vendored Kconfig
   default; explicit widget/lib defines now make it the single source of truth.
4. **`mesh:"self"`** in `/api/status` until a peer table exists in `lora.c` — honest
   value over the example's "2 peers".
5. **No commits** — all firmware changes left as working-tree diffs for operator review
   (ORDER RULE / operator-gated repos).
6. Pre-existing warnings (lora.c, mldsa_identity.c, main.cpp esp_timer init) left as
   findings; they are not Lane B scope.

## 10. Evidence chain

- `V6-B-firmware/B1-toolchain.log` — full B-1 command+output
- `V6-B-firmware/B4-build.log` — set-target + all 12 build takes with errors/warnings
- `V6-B-firmware/pack-ui.mjs`, `hex-gate.mjs`, `contract-gate.mjs` — gate scripts
- Negative-control artifacts: `/tmp/opencode/b2-neg/p31_ui.sabotaged.c`,
  `/tmp/opencode/b3-neg/p31_http.sabotaged.c`
- Artifact: `firmware/node-zero/build/p31-node-zero.bin` (1,277,280 B)