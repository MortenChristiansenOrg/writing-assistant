#!/usr/bin/env bash
# Fetch all review threads for a PR via GitHub GraphQL API
# Usage: fetch-review-threads.sh <owner> <repo> <pr_number>
# Returns: JSON array of unresolved threads with threadId, commentId, path, line, body

set -euo pipefail

# Load GH_TOKEN from .env.local if exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
[[ -f "$REPO_ROOT/.env.local" ]] && export $(grep '^GH_TOKEN=' "$REPO_ROOT/.env.local")

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <owner> <repo> <pr_number>" >&2
  exit 1
fi

OWNER="$1"
REPO="$2"
PR_NUMBER="$3"

# GraphQL query to fetch review threads
# Fetches first 100 threads and first comment of each (CodeRabbit's initial comment)
QUERY='
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          comments(first: 1) {
            nodes {
              id
              databaseId
              body
              author {
                login
              }
            }
          }
        }
      }
    }
  }
}
'

# Execute query and transform to simpler JSON structure
gh api graphql \
  -f query="$QUERY" \
  -F owner="$OWNER" \
  -F repo="$REPO" \
  -F pr="$PR_NUMBER" \
  --jq '
    .data.repository.pullRequest.reviewThreads.nodes
    | map(select(.isResolved == false))
    | map({
        threadId: .id,
        commentId: .comments.nodes[0].databaseId,
        nodeId: .comments.nodes[0].id,
        path: .path,
        line: .line,
        isOutdated: .isOutdated,
        author: .comments.nodes[0].author.login,
        body: .comments.nodes[0].body
      })
    | map(select(.author == "coderabbitai"))
  '
