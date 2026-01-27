# Environment

The shell environment is zsh on WSL2 (Ubuntu).
Available scripting environments:

- zsh
- Node

# Commands

Use bun commands instead of npm commands.

Install dependencies: `bun install`

Run unit/component tests: `bun test:run`
Run E2E tests: `bun e2e`
Run E2E with Playwright UI : `bun e2e:ui`
Run smoke tests: `bun smoke`

Initialize Convex: `bunx convex dev`
Note: Never run this command unless asked directly (is user managed)

Run dev server: `bun dev`
Note: Never run this command unless asked directly (is user managed)

Update Convex functions: `bunx convex deploy`
Note: Run this after every change to Convex functions

## Work

When implementing work, create tasks and delegate to sub agents where it makes sense.
Always make sure the code compiles and tests pass.
Always specify types and never use `any`.

## Testing

All functionality must be verified with tests.
After adding or changing functionality, make sure the changes are covered by passing tests.
