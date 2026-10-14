#!/usr/bin/env bash
# build-cbs.sh — build taler_cs.wasm (TWO-CHALLENGE Clause Blind Schnorr over
# Ed25519).
#
# Real, audited primitives only: curve25519-dalek + sha2 (no hand-rolled
# curve math, no libsodium cross-compile). Targets wasm32-unknown-unknown.
#
# Scheme: two-challenge CBS per the GNU Taler CS thesis ("Adding Schnorr's
# blind signature in Taler"), §2.2.4/§3.2 — two per-withdrawal nonces
# (R_0, R_1) bound to the denom key and a single-use `t`, both challenges
# blinded/signed/unblinded, both verified: s'_i·G = R'_i + c'_i·X.
set -euo pipefail
cd "$(dirname "$0")"

OUT="../src/taler_cs.wasm"
TARGET="wasm32-unknown-unknown"

command -v cargo >/dev/null 2>&1 || { echo "cargo not found"; exit 1; }

if ! rustup target list --installed 2>/dev/null | grep -q "$TARGET"; then
  echo "Installing $TARGET via rustup"
  rustup target add "$TARGET"
fi

echo "Building taler_cbs -> $OUT"
RUSTFLAGS="-Ctarget-feature=+simd128 -C link-arg=--export=__heap_base -C link-arg=--export=__data_end" cargo build --target "$TARGET" --release

cp "target/$TARGET/release/taler_cbs.wasm" "$OUT"
echo "Built $OUT ($(wc -c < "$OUT") bytes raw, $(gzip -c "$OUT" | wc -c) bytes gzipped)"

# Copy the wasm to every consumer so it can be imported via the
# [[rules]] type = "CompiledWasm" path (esbuild compiles at build time —
# the only Worker-supported way; [wasm_modules] and runtime instantiate
# are both blocked). NOTE: apps/phos is reference-only (undeployed) and is
# intentionally NOT a destination.
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
for DEST in \
  "$ROOT/workers/love-ledger/taler-cbs/taler_cs.wasm" \
  "$ROOT/workers/mcp-x402-gateway/src/taler-cbs/taler_cs.wasm" \
  "$ROOT/workers/mcp-x402-gateway/bridge/taler-cbs/taler_cs.wasm"; do
  mkdir -p "$(dirname "$DEST")"
  cp "$OUT" "$DEST"
  echo "Copied wasm -> $DEST ($(wc -c < "$DEST") bytes)"
done

echo "Running known-answer vector (cross-checked vs Node Web Crypto)..."
node test/vector.mjs

echo "Running issuer-side integration gates..."
node test/integration.mjs

echo "CBS WASM build + verify OK"