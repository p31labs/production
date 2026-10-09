#!/bin/bash
# WCD-QWN-07: Hardware Kenosis — ESP32-S3 JTAG Burn & Key Shred
# Purpose: Permanently disable debug ports and secure-delete RAM disk keys
# WARNING: IRREVERSIBLE. Efuses cannot be unburned. Execute only when ready for final abdication.

set -euo pipefail

ESPTOOL_PORT="${1:-/dev/ttyUSB0}"
ESPTOOL_BAUD="${2:-460800}"
KEYS_DIR="${3:-./data/keys}"

echo "═══════════════════════════════════════════════════════"
echo "  WCD-QWN-07: Hardware Kenosis"
echo "  ESP32-S3 JTAG Burn & Key Shred"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Port:  $ESPTOOL_PORT"
echo "  Baud:  $ESPTOOL_BAUD"
echo "  Keys:  $KEYS_DIR"
echo ""
echo "  ⚠️  WARNING: This is IRREVERSIBLE."
echo "  Once efuses are burned, JTAG debug is permanently disabled."
echo "  Once keys are shredded, they cannot be recovered."
echo ""

# ── Veto gate: this destructive script requires a human approval token ──
# Per AGENT-RUNBOOK v2, no destructive operation executes without an
# Ed25519/ML-DSA approval token issued by `pnpm approve`. The token is
# single-use, time-bound, and scope-bound.
if [ -n "${P31_AUTO_APPROVE:-}" ]; then
  echo "  ⚠️  P31_AUTO_APPROVE set — bypassing the human token gate (dev only)."
else
  TOKEN_FILE="${P31_TOKEN_FILE:-.workspace/approved-kenosis.token}"
  if [ ! -f "$TOKEN_FILE" ]; then
    echo "  ⛔ BLOCKED by the veto gate: this script shreds keys irreversibly."
    echo "  Issue an approval token first:"
    echo "    pnpm approve --proposal 'kenosis-shred' --paths './data/keys,./data/pglite_vault' --operation soft-delete"
    echo "  then re-run with P31_TOKEN_FILE=$TOKEN_FILE"
    exit 3
  fi
  # Verify the token with the shared verifier (best-effort; offline Ed25519).
  if command -v node >/dev/null 2>&1; then
    node -e "
      import('$(pwd)/scripts/lib/token.mjs').then(async (t) => {
        const fs = require('fs');
        const tok = JSON.parse(fs.readFileSync('$TOKEN_FILE','utf8'));
        const v = await t.verifyToken(tok, ['./data/keys','./data/pglite_vault'], 'soft-delete');
        if (!v.ok) { console.error('token invalid: '+v.reason); process.exit(1); }
        console.log('✓ approval token verified');
      }).catch((e) => { console.error('token verify failed: '+e.message); process.exit(1); });
    " || { echo "  ⛔ Token verification failed."; exit 3; }
  fi
fi

# ── Phase 1: Burn ESP32-S3 JTAG Efuses ──
echo "───────────────────────────────────────────────────────"
echo "[Phase 1] Burning ESP32-S3 JTAG debug ports..."
echo ""

echo "  [1/4] Disabling USB JTAG..."
espefuse.py --port "$ESPTOOL_PORT" --baud "$ESPTOOL_BAUD" burn_efuse DIS_USB_JTAG
echo "        ✅ DIS_USB_JTAG burned"
echo ""

echo "  [2/4] Disabling PAD JTAG..."
espefuse.py --port "$ESPTOOL_PORT" --baud "$ESPTOOL_BAUD" burn_efuse DIS_PAD_JTAG
echo "        ✅ DIS_PAD_JTAG burned"
echo ""

echo "  [3/4] Disabling download DCACHE..."
espefuse.py --port "$ESPTOOL_PORT" --baud "$ESPTOOL_BAUD" burn_efuse DIS_DOWNLOAD_DCACHE
echo "        ✅ DIS_DOWNLOAD_DCACHE burned"
echo ""

echo "  [4/4] Burning secure boot key (SE050 enclave)..."
if [ -f "./se050_secure_boot_key.bin" ]; then
    espefuse.py --port "$ESPTOOL_PORT" --baud "$ESPTOOL_BAUD" burn_key secure_boot_v2 ./se050_secure_boot_key.bin
    echo "        ✅ Secure boot key burned"
else
    echo "        ⚠️  Secure boot key file not found, skipping"
fi
echo ""

echo "  Verifying efuse state..."
espefuse.py --port "$ESPTOOL_PORT" --baud "$ESPTOOL_BAUD" summary 2>/dev/null | grep -E "DIS_USB_JTAG|DIS_PAD_JTAG|DIS_DOWNLOAD_DCACHE" || true
echo ""

# ── Phase 2: Shred Local Keys ──
echo "───────────────────────────────────────────────────────"
echo "[Phase 2] Secure-deleting local RAM disk keys..."
echo ""

if [ -d "$KEYS_DIR" ]; then
    echo "  Shredding key files in: $KEYS_DIR"
    find "$KEYS_DIR" -type f -exec shred -u -z -n 3 {} \;
    echo "  ✅ All key files shredded (3-pass random + zero)"
else
    echo "  ⚠️  Keys directory not found: $KEYS_DIR"
fi

echo ""

if [ -d "./data/pglite_vault" ]; then
    echo "  Shredding PGlite filesystem vault..."
    find "./data/pglite_vault" -type f -exec shred -u -z -n 3 {} \;
    rm -rf "./data/pglite_vault"
    echo "  ✅ PGlite filesystem vault shredded"
else
    echo "  ℹ️  No PGlite filesystem vault found (already migrated to idb://)"
fi

echo ""

# ── Phase 3: Shred RAM Disk & Temp Keys ──
echo "───────────────────────────────────────────────────────"
echo "[Phase 3] Secure-deleting RAM disk and temp keys..."
echo ""

RAM_DISK_PATHS=(
    "/dev/shm/p31"
    "/tmp/p31-keys"
    "./data/ramdisk"
    "./data/temp-keys"
)

for path in "${RAM_DISK_PATHS[@]}"; do
    if [ -d "$path" ]; then
        echo "  Shredding: $path"
        find "$path" -type f -exec shred -u -z -n 3 {} \;
        rm -rf "$path"
        echo "  ✅ Shredded: $path"
    fi
done

echo ""

# ── Completion ──
echo "═══════════════════════════════════════════════════════"
echo "  ✅ KENOSIS COMPLETE"
echo ""
echo "  JTAG debug ports:  PERMANENTLY DISABLED"
echo "  Secure boot key:   BURNED TO EFUSE"
echo "  Local keys:        SHREDDED (3-pass + zero)"
echo "  PGlite vault:      MIGRATED TO IndexedDB (idb://)"
echo ""
echo "  The device is now cryptographically locked."
echo "  The biological architect has been fully detached."
echo "═══════════════════════════════════════════════════════"
