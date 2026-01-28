# Anti-Patterns

Common testing mistakes to avoid.

---

## Index-Based Mock Routing

```ts
// BAD - fragile, unclear
mockUseQuery.mockReturnValueOnce(documents);
mockUseQuery.mockReturnValueOnce(personas);

// GOOD - explicit per-query mocking
mockUseQuery.mockImplementation((query) => {
  if (query === api.documents.list) return documents;
  if (query === api.personas.list) return personas;
});
```

---

## Type Casts

```ts
// BAD
const result = something as any;

// GOOD - proper typing or assertion
const result: ExpectedType = something;
expect(result).toBeDefined();
```

---

## Testing Implementation Details

```ts
// BAD - tests internal state
expect(component.state.isLoading).toBe(true);

// GOOD - tests what user sees
expect(screen.getByRole("progressbar")).toBeVisible();
```

---

## Excessive Timeouts

```ts
// BAD
await waitFor(() => {...}, { timeout: 10000 })

// GOOD - fix the root cause, use reasonable timeout
await waitFor(() => {...}, { timeout: 1000 })
```

---

## Fragile CSS Selectors

```ts
// BAD
page.locator(".btn-primary.mt-4.flex");

// GOOD
page.getByRole("button", { name: "Submit" });
```

---

## Property-Based Testing (Optional)

For pure utility functions where exhaustive testing is valuable.

### When to Use

- Slug generation
- Filtering/sorting logic
- Input validation/sanitization
- Price/currency calculations
- AI-generated code (test invariants)

### fast-check Integration

```ts
import { fc } from "@fast-check/vitest";
import { test } from "vitest";
import { slugify } from "./slugify";

test.prop([fc.string()])("slugify produces valid URL segments", (input) => {
  const slug = slugify(input);
  expect(slug).toMatch(/^[a-z0-9-]*$/);
});

test.prop([fc.string()])("slugify is idempotent", (input) => {
  const once = slugify(input);
  const twice = slugify(once);
  expect(once).toBe(twice);
});
```

### Custom Arbitraries

```ts
const documentArb = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }),
  content: fc.string(),
});

test.prop([documentArb])("document validation accepts valid data", (document) => {
  expect(() => validateDocument(document)).not.toThrow();
});
```
