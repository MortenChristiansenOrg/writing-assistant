#!/usr/bin/env bash
# Resolve a review thread via GitHub GraphQL API
# Usage: resolve-thread.sh <thread_id>
# thread_id should be in format RT_xxx (GraphQL node ID)

set -euo pipefail

# Load GH_TOKEN from .env.local if exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
[[ -f "$REPO_ROOT/.env.local" ]] && export $(grep '^GH_TOKEN=' "$REPO_ROOT/.env.local")

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <thread_id>" >&2
  exit 1
fi

THREAD_ID="$1"

MUTATION='
mutation($threadId: ID!) {
  resolveReviewThread(input: {threadId: $threadId}) {
    thread {
      id
      isResolved
    }
  }
}
'

gh api graphql \
  -f query="$MUTATION" \
  -F threadId="$THREAD_ID" \
  --jq '.data.resolveReviewThread.thread | "Resolved: \(.id) (isResolved: \(.isResolved))"'
