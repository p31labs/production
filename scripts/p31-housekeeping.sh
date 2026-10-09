#!/usr/bin/env bash
# p31-housekeeping.sh — Tetrahedron v2: V3 SHAPE + V4 GATE pipeline.
#
# v2 changes (per AGENT-RUNBOOK v2):
#   - SOFT DELETE by default (files move to .trash/, never rm -f)
#   - CAS snapshot before any delete (content-addressable, point-in-time recovery)
#   - Approval token required for every consequential action
#   - verify-chain runs before the gate executes
#
# Disk-tiered thresholds:
#   < 70%  : no-op (report only)
#   70-85% : soft-delete archive-90d files older than 60d
#   85-95% : soft-delete delete-30d files older than 30d
#   > 95%  : soft-delete delete-30d/stale files older than 7d
#
# Usage: bash scripts/p31-housekeeping.sh [--audit] [--dry-run] [--token <file>]
#   --audit    run the four tetrahedron faces only
#   --dry-run  report what would happen, do nothing
set -euo pipefail

PROD="/home/p31/production"
LEDGER="$PROD/.workspace/ledger.jsonl"
TOKENS_DIR="$PROD/.workspace/tokens"

MODE="${1:-run}"
TOKEN_FILE="${P31_TOKEN_FILE:-}"
if [ "$#" -ge 2 ]; then
  for i in "$@"; do
    case "$i" in
      --token) TOKEN_FILE="";;  # next arg
      --audit) MODE="--audit";;
      --dry-run) MODE="--dry-run";;
    esac
  done
fi

NOW="$(date +%Y%m%d)"
log() { echo "[housekeeping-v2] $*"; }

# ── V4 GATE: verify-chain + token required ─────────────────────────────
gate_preflight() {
  log "V4 GATE preflight: verify-chain…"
  node "$PROD/scripts/verify-chain.mjs" 2>&1 | tail -1 || {
    log "FATAL: ledger chain broken — aborting"; exit 1;
  }
  if [ -z "$TOKEN_FILE" ] && [ -z "${P31_AUTO_APPROVE:-}" ]; then
    log "FATAL: no approval token (P31_TOKEN_FILE or P31_AUTO_APPROVE). Issue one:"
    log "  pnpm approve --proposal housekeeping --paths <paths> --operation soft-delete"
    exit 3
  fi
}

# ── V4 GATE: CAS snapshot + soft-delete (never rm -f) ──────────────────
snapshot_and_softdelete() {
  local file="$1"
  local reason="$2"
  local rel="${file#$PROD/}"

  # CAS snapshot (the version guarantee).
  local hash
  hash="$(node -e "
    import('$PROD/scripts/lib/cas.mjs').then(async (cas) => {
      console.log(await cas.snapshot('$file'));
    });
  " 2>/dev/null || echo '')"
  [ -z "$hash" ] && { log "REFUSED: CAS snapshot failed for $file"; return 1; }

  # Soft delete (move to .trash/, never rm -f).
  node -e "
    import('$PROD/scripts/lib/softdelete.mjs').then(async (sd) => {
      const r = await sd.softDelete('$file', { reason: '$reason', actor: 'did:agent:housekeeping', tokenId: '${TOKEN_FILE:+housekeeping-approval}' });
      console.log('soft-deleted:', r.dest);
    });
  " 2>/dev/null || { log "REFUSED: soft-delete failed for $file"; return 1; }

  log "SOFT-DELETED: $rel (CAS $hash → .trash/)"
}

# ── The four faces ─────────────────────────────────────────────────────
run_audits() {
  log "running the four tetrahedron faces…"
  node "$PROD/scripts/audit-coverage.mjs"
  node "$PROD/scripts/audit-safety.mjs"
  node "$PROD/scripts/audit-provenance.mjs"
  node "$PROD/scripts/audit-policy.mjs"
  node "$PROD/scripts/soft-delete-check.mjs"
  log "all faces pass"
}

if [ "$MODE" = "--audit" ]; then
  run_audits
  exit 0
fi

# ── Disk pressure tier ────────────────────────────────────────────────
USAGE="$(df /home/p31 --output=pcent | tail -1 | tr -d '% ')"
log "disk usage: ${USAGE}%"

if [ "$MODE" = "--dry-run" ]; then
  log "dry-run: would apply the ${USAGE}% tier policy (soft-delete + CAS + token)"; exit 0
fi

gate_preflight

# Prune caches (safe, no snapshots needed).
pnpm store prune >/dev/null 2>&1 || true
npm cache clean --force >/dev/null 2>&1 || true

# The tier policy (soft-delete only).
if [ "$USAGE" -ge 95 ]; then
  log "EMERGENCY tier: soft-deleting delete-30d/stale older than 7d"
  find "$PROD/docs" -name '*.md' -mtime +7 -exec grep -l 'retention: delete-30d' {} \; 2>/dev/null | while read -r f; do
    snapshot_and_softdelete "$f" "emergency-95"
  done
elif [ "$USAGE" -ge 85 ]; then
  log "AGGRESSIVE tier: soft-deleting delete-30d older than 30d"
  find "$PROD/docs" -name '*.md' -mtime +30 -exec grep -l 'retention: delete-30d' {} \; 2>/dev/null | while read -r f; do
    snapshot_and_softdelete "$f" "aggressive-85"
  done
elif [ "$USAGE" -ge 70 ]; then
  log "NORMAL tier: soft-deleting archive-90d older than 60d"
  find "$PROD/docs" -name '*.md' -mtime +60 -exec grep -l 'retention: archive-90d' {} \; 2>/dev/null | while read -r f; do
    snapshot_and_softdelete "$f" "normal-70"
  done
else
  log "SAFE tier: no cleanup needed"
fi

run_audits
log "housekeeping-v2 complete — disk: $(df /home/p31 --output=pcent | tail -1 | tr -d '% ')%"