# Smoke Testing

Playwright against real Convex backend via PR preview environments. Limited scope.

---

## What to Test

Critical happy paths only (~5-10 tests):

- App loads and displays document list
- User can login
- User can create new document
- Document editor loads and saves
- User can manage personas
- Settings page works

---

## File Location

```
smoke/
  app.spec.ts
  auth.spec.ts
  pages/
  playwright.config.ts
```

---

## Configuration

```ts
// smoke/playwright.config.ts
export default defineConfig({
  use: {
    baseURL: process.env.PREVIEW_URL || "https://preview.example.com",
  },
  testDir: "./smoke",
});
```

---

## Run Conditions

- **Not on every commit** - too slow, too flaky
- Run on: PR creation, PR update, deploy to staging/production
- Configure in CI pipeline

---

## Key Differences from E2E

| Aspect  | E2E (FakeConvexClient)       | Smoke (real backend)   |
| ------- | ---------------------------- | ---------------------- |
| Backend | FakeConvexClient (separate entry) | Real Convex backend    |
| Build   | `vite build --config vite.config.e2e.ts` | Standard build         |
| Data    | Deterministic mock data      | Real production-like   |
| Scope   | All flows + errors           | Critical happy paths   |
| Speed   | Medium                       | Slow                   |
| When    | Every commit                 | PR/deploy only         |
