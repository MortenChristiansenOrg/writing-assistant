#!/bin/bash
set -e

echo "Running pre-commit tests..."

# Run unit, component, and Convex tests (excludes E2E/smoke)
bun test:run

echo "All tests passed!"
