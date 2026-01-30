# GitHub API Commands for CodeRabbit Review

Quick reference for raw `gh` API commands used by this skill.

## Fetch PR Review Threads (GraphQL)

```bash
gh api graphql -f query='
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
              author { login }
            }
          }
        }
      }
    }
  }
}' -F owner=OWNER -F repo=REPO -F pr=123
```

## Resolve Review Thread (GraphQL)

```bash
gh api graphql -f query='
mutation($threadId: ID!) {
  resolveReviewThread(input: {threadId: $threadId}) {
    thread {
      id
      isResolved
    }
  }
}' -F threadId=RT_xxxxx
```

## Reply to Review Comment (REST)

```bash
gh api --method POST \
  /repos/OWNER/REPO/pulls/PR_NUMBER/comments/COMMENT_ID/replies \
  -f body="@coderabbitai Your explanation here"
```

## Get Current PR Number

```bash
gh pr view --json number -q '.number'
```

## Get Repo Owner/Name

```bash
gh repo view --json owner,name -q '"\(.owner.login) \(.name)"'
```

## List PR Comments (alternative REST approach)

```bash
gh api /repos/OWNER/REPO/pulls/PR_NUMBER/comments
```

## Useful jq Filters

Filter unresolved threads:
```bash
--jq '.data.repository.pullRequest.reviewThreads.nodes | map(select(.isResolved == false))'
```

Filter CodeRabbit comments only:
```bash
--jq 'map(select(.comments.nodes[0].author.login == "coderabbitai"))'
```

Extract thread IDs:
```bash
--jq '.[].id'
```
