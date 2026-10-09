#!/usr/bin/env bash
# Run once from anywhere inside the repo, with this packet's scripts/ committed on the base branch.
# Usage: scripts/setup.sh [base-branch]   Creates inputs/ stubs, out/, and one worktree per path (inputs/ symlinked).
# Idempotent: re-runs skip already-created worktrees/branches/stubs.
set -euo pipefail
SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # .../governance/scripts
ROOT="$(cd "$SELF" && git rev-parse --show-toplevel)" # actual repo root, NOT ../ from CWD
PACKET_DIR="$(dirname "$SELF")"                        # .../governance (packet lives inside the repo)
BASE="${1:-main}"
cd "$ROOT"
mkdir -p "$PACKET_DIR/inputs" "$PACKET_DIR/out"
for f in instrument_wording.txt counsel_approach.txt ecfr_890_3710_excerpt.txt c2_decision; do
  [ -e "$PACKET_DIR/inputs/$f" ] || echo "TODO: fill me" > "$PACKET_DIR/inputs/$f"
done
# inputs/oklab_safari_verified, inputs/counsel_reviewed, inputs/mailbox_confirmed are NOT stubbed on
# purpose — they are proof-of-work files created when the manual step completes.
for pair in worktree-gov:gov-correction worktree-chat:chat-hardening worktree-canon:canon-chat-kinds; do
  d="$ROOT/${pair%%:*}"; b="${pair##*:}"
  if [ ! -e "$d/.git" ]; then
    git worktree add -B "$b" "$d" "$BASE"    # -B force-creates: re-runs are idempotent
  else
    echo "worktree $d already exists (branch $b); skipping create"
    git show-ref --verify --quiet refs/heads/"$b" || git branch "$b" "$BASE"
  fi
  [ -e "$d/inputs" ] || ln -s "$PACKET_DIR/inputs" "$d/inputs"
done
echo "Worktrees ready. Next: record_baseline in worktree-chat, then run paths."