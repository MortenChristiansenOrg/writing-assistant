---
name: docs-testing
description: Authoritative testing reference. Use when writing, rewriting, or understanding tests. Covers vitest (unit/component) and Playwright (E2E/smoke).
---

# Testing Reference

**Note: Testing infrastructure does not yet exist.** This is a prescriptive guide for how tests SHOULD be structured when added. The described commands, configs, and directories need to be created.

See sub-documents for detailed conventions.

---

## Commands

| Command        | Purpose                    | Pattern                  |
| -------------- | -------------------------- | ------------------------ |
| `bun test:run` | Run unit/component tests   | `src/**/*.test.{ts,tsx}` |
| `bun e2e`      | Run E2E tests              | `e2e/*.spec.ts`          |
| `bun e2e:ui`   | Run E2E with Playwright UI | `e2e/*.spec.ts`          |
| `bun smoke`    | Run smoke tests            | `smoke/*.spec.ts`        |

---

## Test Pyramid

| Layer           | Tool                     | Backend                    | Speed  | Runs On      |
| --------------- | ------------------------ | -------------------------- | ------ | ------------ |
| Convex functions| Vitest + convex-test     | convex-test                | Fast   | Every commit |
| React components| Vitest + Testing Library | vi.mock("convex/react")    | Fast   | Every commit |
| E2E             | Playwright               | FakeConvexClient (separate entry) | Medium | Every commit |
| Smoke           | Playwright               | Real Convex backend        | Slow   | PR/deploy    |

**Convex function tests** (`convex/__tests__/`) use `convex-test` for isolated backend testing.

**React component tests** (`src/**/*.test.tsx`) mock Convex hooks with `vi.mock("convex/react")`.

**E2E tests** use a separate entry point (`src/test/e2e/main.tsx`) with `FakeConvexClient` via dependency injection. NO mock code in production.

**Smoke tests** hit real Convex backend via PR preview environments. Limited to critical happy paths only.

---

## Coverage by Code Type

| Code Type            | Test Type   | Focus                                              |
| -------------------- | ----------- | -------------------------------------------------- |
| Convex functions     | convex-test | Queries, mutations, actions, auth                  |
| React components     | Unit        | Rendering states, user interactions, state changes |
| Pages                | Unit + E2E  | Route params, data loading, navigation flows       |
| Pure functions       | Unit        | Edge cases, input validation, transformations      |
| User flows           | E2E         | All paths including error states                   |
| Critical happy paths | Smoke       | 5-10 tests: login, CRUD documents, personas        |

---

## File Naming

- Convex function tests: `convex/__tests__/*.test.ts`
- React component tests: `src/**/*.test.tsx` (co-located with source)
- E2E tests: `e2e/*.spec.ts`
- Smoke tests: `smoke/*.spec.ts`
- Page objects: `*.po.ts` (unit) or `pages/*.ts` (E2E/smoke)

---

## Folder Structure

```
convex/__tests__/
  setup.ts              # convex-test setup
  *.test.ts             # Convex function tests
src/test/
  setup.ts              # Global test setup
  test-utils.tsx        # Custom render with router
  mocks/                # Mock factories
  pages/                # Unit test page objects
  components/           # Component page objects
  e2e/                  # E2E test infrastructure (NO mock code in production)
    main.tsx            # E2E entry point with FakeConvexClient
    fakeConvexClient.ts # ConvexReactClientFake implementation
    mockData.ts         # Typed mock data for E2E
e2e/
  *.spec.ts             # E2E tests (FakeConvexClient)
  pages/                # E2E page objects
  fixtures.ts           # Auth and other fixtures
smoke/
  *.spec.ts             # Smoke tests (real backend)
  pages/                # Smoke page objects
  playwright.config.ts  # Smoke-specific config
```

---

## Config Locations

| Config             | Path                         |
| ------------------ | ---------------------------- |
| Vitest             | `vitest.config.ts`           |
| Vite (E2E build)   | `vite.config.e2e.ts`         |
| Playwright (E2E)   | `playwright.config.ts`       |
| Playwright (Smoke) | `smoke/playwright.config.ts` |
| Test setup         | `src/test/setup.ts`          |

---

## Sub-Documents

- [Unit Testing](./resources/unit-testing.md) - Vitest, Testing Library, convex-test, async patterns
- [E2E Testing](./resources/e2e-testing.md) - Playwright + mocked Convex, fixtures, user flows
- [Smoke Testing](./resources/smoke-testing.md) - Real backend, critical paths, PR previews
- [Page Objects](./resources/page-objects.md) - Mandatory pattern for all test types
- [Anti-Patterns](./resources/anti-patterns.md) - Common mistakes to avoid
