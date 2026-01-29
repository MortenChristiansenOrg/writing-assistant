#!/bin/bash
set -e

echo "Running pre-commit tests..."

echo "→ Type checking..."
bunx tsc -b || { echo "Type check failed"; exit 1; }

echo "→ Building..."
bunx vite build || { echo "Build failed"; exit 1; }

echo "→ Deploying Convex functions..."
if [ -z "${CONVEX_DEPLOYMENT:-}" ]; then
  echo "Convex deploy skipped (no deployment configured)"
else
  bunx convex deploy || { echo "Convex deploy failed"; exit 1; }
fi

# Run unit, component, and Convex tests (excludes E2E/smoke)
bun test:run

echo "All tests passed!"
