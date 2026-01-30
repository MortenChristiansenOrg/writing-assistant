---
name: coderabbit-review
description: Handle CodeRabbit PR review comments - triage, fix, commit, resolve threads. Use with /coderabbit-review or /coderabbit-review <PR_NUMBER>.
invocation: user
---

# Goal

Process CodeRabbit review comments on a PR: read comments, triage by priority, apply fixes, commit changes, and resolve addressed threads.
This might not be the first pass over the PR, so identiy the relevant comments.

## Invocation

- `/coderabbit-review` - Uses current branch's PR
- `/coderabbit-review <PR_NUMBER>` - Specific PR

## Prerequisites

Requires `gh` CLI authentication. Two options:

**Option A: OAuth login (recommended - supports thread resolution)**

```bash
gh auth login
```

**Option B: Fine-grained PAT (read/comment only, cannot resolve threads)**

1. Create token at <https://github.com/settings/personal-access-tokens/new>
2. Select repository access (this repo or all)
3. Permissions: **Pull requests → Read and write**
4. Add to `.env.local`: `GH_TOKEN=ghp_xxx`

Note: Fine-grained PATs cannot resolve review threads via GraphQL API. Use OAuth or resolve threads manually in GitHub UI.

## Workflow

### 0. Load Environment

Export `GH_TOKEN` from `.env.local` for `gh` CLI:

```bash
[[ -f .env.local ]] && set -a && source <(grep '^GH_TOKEN=' .env.local) && set +a
```

Run this before any `gh` commands.

### 1. Identify PR

If no PR number provided:

```bash
gh pr view --json number -q '.number'
```

Get repo info:

```bash
gh repo view --json owner,name -q '"\(.owner.login) \(.name)"'
```

### 2. Fetch Review Threads

```bash
.claude/skills/coderabbit-review/scripts/fetch-review-threads.sh <owner> <repo> <pr_number>
```

Returns JSON array of threads with:

- `threadId` (RT_xxx) - for resolving
- `commentId` - for replying
- `path` - file path
- `line` - line number
- `body` - comment content (includes collapsed HTML for nitpicks)
- `isResolved` - skip if true

### 3. Triage Comments

Categorize by CodeRabbit markers:

| Marker                      | Priority | Action              |
| --------------------------- | -------- | ------------------- |
| `**Security**` / `**Bug**`  | High     | Must address        |
| `**Suggestion**`            | Medium   | Evaluate merit      |
| `**Nitpick**` / `[nitpick]` | Low      | Auto-fix if trivial |

**Handling incorrect/irrelevant comments:**

- Some comments may be wrong or based on misunderstanding the code
- If a comment doesn't apply, reply to teach CodeRabbit:
  ```bash
  .claude/skills/coderabbit-review/scripts/reply-to-comment.sh <owner> <repo> <pr> <comment_id> "@coderabbitai <explanation>"
  ```
- Then resolve the thread

**Nitpick rules:**

- Auto-fix: formatting, naming conventions, simple type annotations, import ordering
- Ask user: debatable style choices, subjective preferences

### 4. Apply Fixes

Group fixes by logical area:

- One commit per major fix
- Group similar small changes into single commit
- Use descriptive commit messages referencing the fix
- Generate tasks for the different fixes and implement them using sub-agents

### 5. Push Changes

Ask user to run `git push` (the GH_TOKEN only has PR permissions, not repo write access).

### 6. Mark Comments with Reactions

After push succeeds, mark each comment with a reaction:

```bash
# Fixed comments - rocket
gh api repos/<owner>/<repo>/pulls/comments/<comment_id>/reactions -f content=rocket

# Skipped/rejected comments - thumbs down
gh api repos/<owner>/<repo>/pulls/comments/<comment_id>/reactions -f content=-1
```

Note: Thread resolution via GraphQL requires OAuth (`gh auth login`). Reactions work with fine-grained PATs.

## Output Format

```markdown
# CodeRabbit Review: PR #XXX

## Summary

[X comments triaged: Y high, Z medium, W low]

## Actions Taken

### Fixed

- [file:line] Brief description of fix

### Skipped (incorrect/irrelevant)

- [file:line] Reason + reply sent

### Needs Discussion

- [file:line] Why user input needed

## Commits Made

- abc1234: Commit message

## Next Steps

User to run `git push`, then comments will be marked with reactions.

## Comments Marked

- comment_id_1, comment_id_2, ... (rocket reaction added)
```

## Error Handling

- If `gh` not authenticated: prompt user to run `gh auth login`
- If PR not found: show error and exit
- Only resolve threads after user confirms push succeeded
- If thread resolution fails: continue with others, report failures

## Scripts Reference

| Script                    | Purpose          | Args                                      |
| ------------------------- | ---------------- | ----------------------------------------- |
| `fetch-review-threads.sh` | Get all threads  | `<owner> <repo> <pr>`                     |
| `reply-to-comment.sh`     | Reply to comment | `<owner> <repo> <pr> <comment_id> <body>` |

See `.claude/skills/coderabbit-review/resources/api-commands.md` for raw gh API commands.
