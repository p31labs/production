#!/usr/bin/env bash
#
# deploy-all.sh — Unified deployment script for P31 production apps
#
# Deploys both the Shell Worker and Spaceship Earth Pages in one command,
# then runs the full verification suite.
#
# Usage:
#   ./scripts/deploy-all.sh                    # Deploy both + verify
#   ./scripts/deploy-all.sh --shell-only       # Deploy shell only
#   ./scripts/deploy-all.sh --spaceship-only   # Deploy spaceship only
#   ./scripts/deploy-all.sh --skip-verify      # Deploy without verify
#
# Prerequisites:
#   - pnpm installed
#   - wrangler authenticated (wrangler login)
#   - NODE_PATH=/home/p31/node_modules (for verify scripts)
#
# Exit codes:
#   0 = all deployments + verifications passed
#   1 = one or more steps failed
#

set -uo pipefail

SHELL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SPACESHIP_DIR="$(dirname "$SHELL_DIR")/production/packages/spaceship-earth"
NODE_PATH="${NODE_PATH:-/home/p31/node_modules}"

SHELL_ONLY=false
SPACESHIP_ONLY=false
SKIP_VERIFY=false

for arg in "$@"; do
  case "$arg" in
    --shell-only) SHELL_ONLY=true ;;
    --spaceship-only) SPACESHIP_ONLY=true ;;
    --skip-verify) SKIP_VERIFY=true ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: $0 [--shell-only] [--spaceship-only] [--skip-verify]"
      exit 1
      ;;
  esac
done

if [[ "$SHELL_ONLY" == "true" && "$SPACESHIP_ONLY" == "true" ]]; then
  echo "❌ Cannot use --shell-only and --spaceship-only together"
  exit 1
fi

echo "🚀 P31 Unified Deployment"
echo "=========================="
echo "Shell:    ${SHELL_DIR}"
echo "Spaceship: ${SPACESHIP_DIR}"
echo ""

# ── Helper Functions ─────────────────────────────────────────────────────────

run_cmd() {
  echo "▶ $*"
  "$@"
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    echo "  ❌ Exit code: $exit_code"
    FAILED=true
  fi
  return $exit_code
}

check_ok() {
  if [[ $? -eq 0 ]]; then
    echo "  ✅ $1"
  else
    echo "  ❌ $1"
    FAILED=true
  fi
}

FAILED=false

# ── Shell Deployment ─────────────────────────────────────────────────────────

if [[ "$SPACESHIP_ONLY" != "true" ]]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 P31 Sovereign Shell"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  cd "$SHELL_DIR"

  # Typecheck
  echo ""
  echo "🔍 TypeScript check..."
  run_cmd ./node_modules/.bin/tsc --noEmit
  check_ok "tsc --noEmit"

  # Unit tests
  echo ""
  echo "🧪 Unit tests..."
  run_cmd ./node_modules/.bin/vitest run
  check_ok "vitest run"

  # Build
  echo ""
  echo "🔨 Build..."
  run_cmd ./node_modules/.bin/vite build
  check_ok "vite build"

  # Deploy
  echo ""
  echo "🚢 Deploy..."
  run_cmd npx wrangler deploy
  check_ok "wrangler deploy"

  # Verify
  if [[ "$SKIP_VERIFY" != "true" ]]; then
    echo ""
    echo "🔎 Verify suite (run 1)..."
    NODE_PATH="$NODE_PATH" node scripts/verify-shell.cjs
    check_ok "verify-shell.cjs (run 1)"

    echo ""
    echo "🔎 Verify suite (run 2)..."
    NODE_PATH="$NODE_PATH" node scripts/verify-shell.cjs
    check_ok "verify-shell.cjs (run 2)"
  fi
fi

# ── Spaceship Deployment ─────────────────────────────────────────────────────

if [[ "$SHELL_ONLY" != "true" ]]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🌍 Spaceship Earth"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  cd "$SPACESHIP_DIR"

  # Typecheck
  echo ""
  echo "🔍 TypeScript check..."
  run_cmd npx tsc --noEmit
  check_ok "tsc --noEmit"

  # Unit tests
  echo ""
  echo "🧪 Unit tests..."
  run_cmd npx vitest run
  check_ok "vitest run"

  # Build
  echo ""
  echo "🔨 Build..."
  run_cmd npx vite build
  check_ok "vite build"

  # Deploy
  echo ""
  echo "🚢 Deploy..."
  run_cmd npx wrangler pages deploy dist --project-name=spaceship-earth --commit-dirty=true
  check_ok "wrangler pages deploy"

  # Verify
  if [[ "$SKIP_VERIFY" != "true" ]]; then
    echo ""
    echo "🔎 Verify suite..."
    NODE_PATH="$NODE_PATH" node scripts/verify-ship.cjs
    check_ok "verify-ship.cjs"
  fi
fi

# ── Cross-App Sync ───────────────────────────────────────────────────────────

if [[ "$SKIP_VERIFY" != "true" && "$SHELL_ONLY" != "true" ]]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔗 Cross-App Sync"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  cd "$SHELL_DIR"
  run_cmd node scripts/cross-app-sync.cjs
  check_ok "cross-app-sync.cjs"
fi

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$FAILED" == "true" ]]; then
  echo ""
  echo "❌ One or more steps failed. Review output above."
  exit 1
else
  echo ""
  echo "✅ All deployments passed."
  echo ""
  echo "Live URLs:"
  echo "  Shell:    https://p31-shell.trimtab-signal.workers.dev"
  echo "  Spaceship: https://spaceship-earth.pages.dev"
  echo ""
  exit 0
fi
