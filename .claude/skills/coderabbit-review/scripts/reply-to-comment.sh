#!/usr/bin/env bash
# Reply to a PR review comment via GitHub REST API
# Usage: reply-to-comment.sh <owner> <repo> <pr_number> <comment_id> <body>
# Use this to teach CodeRabbit by replying with @coderabbitai

set -euo pipefail

# Load GH_TOKEN from .env.local if exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
[[ -f "$REPO_ROOT/.env.local" ]] && export $(grep '^GH_TOKEN=' "$REPO_ROOT/.env.local")

if [[ $# -lt 5 ]]; then
  echo "Usage: $0 <owner> <repo> <pr_number> <comment_id> <body>" >&2
  exit 1
fi

OWNER="$1"
REPO="$2"
PR_NUMBER="$3"
COMMENT_ID="$4"
BODY="$5"

# Use REST API to create a reply to the review comment
gh api \
  --method POST \
  "/repos/${OWNER}/${REPO}/pulls/${PR_NUMBER}/comments/${COMMENT_ID}/replies" \
  -f body="$BODY" \
  --jq '"Reply posted: \(.html_url)"'
