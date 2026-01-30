#!/bin/bash
set -e

echo "Running pre-commit tests..."

echo "→ Type checking..."
bunx tsc -b || { echo "Type check failed"; exit 1; }

echo "→ Building..."
bunx vite build || { echo "Build failed"; exit 1; }

echo "→ Validating Convex functions..."
bunx convex codegen --typecheck enable || { echo "Convex codegen failed"; exit 1; }
if [ -n "${CONVEX_DEPLOYMENT:-}" ]; then
  echo "→ Deploying Convex functions..."
  bunx convex deploy || { echo "Convex deploy failed"; exit 1; }
fi

# Run unit, component, and Convex tests (excludes E2E/smoke)
bun test:run

#echo "→ E2E tests..."
bunx playwright test || { echo "E2E tests failed"; exit 1; }

echo "All tests passed!"
