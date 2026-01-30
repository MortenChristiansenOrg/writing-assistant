# Unit/Component Testing

Vitest + Testing Library + convex-test for fast, isolated tests.

---

## Query Priority

Prefer accessible queries in this order:

```ts
// Best - accessible by role
getByRole("button", { name: "Submit" });
getByRole("heading", { name: "Documents" });
getByRole("textbox", { name: "Email" });

// Good - semantic
getByPlaceholderText("Search documents...");
getByLabelText("Email address");

// Acceptable - content-based
getByText("No documents found");

// Last resort - test ID
getByTestId("document-list");
```

---

## Convex Function Tests (convex-test)

Test Convex queries/mutations in `convex/__tests__/`:

```ts
// convex/__tests__/setup.ts
import { convexTest } from "convex-test";
import schema from "../schema";

export function createTestContext() {
  return convexTest(schema, modules);
}

// convex/__tests__/documents.test.ts
import { createTestContext } from "./setup";
import { api } from "../_generated/api";

it("creates document", async () => {
  const t = createTestContext();
  const id = await t.mutation(api.documents.create, { ... });
  const document = await t.query(api.documents.get, { id });
  expect(document?.title).toBe("Test Document");
});
```

## React Component Tests (vi.mock)

Mock Convex hooks in `src/**/*.test.tsx`. This is for isolated component tests, NOT E2E (E2E uses FakeConvexClient via separate entry point).

```ts
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

const mockUseQuery = vi.mocked(useQuery);
mockUseQuery.mockReturnValue([createMockDocument()]);
```

---

## Async Patterns

```ts
// Setup userEvent at test start
const user = userEvent.setup();

// Prefer userEvent over fireEvent
await user.click(submitButton);
await user.type(input, "text");

// Wait for async updates
await waitFor(() => {
  expect(screen.getByText("Success")).toBeInTheDocument();
});

// Fake timers for debounce/throttle
vi.useFakeTimers();
await user.type(searchInput, "monet");
vi.advanceTimersByTime(300);
vi.useRealTimers();
```

---

## Nested Describe Pattern

```ts
describe("DocumentCard", () => {
  describe("rendering", () => {
    it("displays title and date", () => {});
    it("shows loading state", () => {});
  });

  describe("interactions", () => {
    it("opens document on click", () => {});
    it("shows hover state", () => {});
  });
});
```

---

## Best Practices

- Test behavior, not implementation
- One assertion focus per test (multiple assertions OK if testing same behavior)
- Avoid testing internal state - test what user sees
- Use `screen` instead of destructuring from `render()`
- Clean up mocks in `beforeEach`/`afterEach`

---

## Common Queries

```ts
// By role (preferred)
getByRole("button", { name: "Submit" });
getByRole("heading", { level: 1 });
getByRole("link", { name: /learn more/i });
getByRole("textbox", { name: "Email" });

// By label
getByLabelText("Password");

// By placeholder
getByPlaceholderText("Search...");

// By text
getByText("No results");
getByText(/loading/i);

// Query variants
queryByRole(); // returns null if not found
findByRole(); // returns promise, waits for element
getAllByRole(); // returns array
```

---

## Common Assertions

```ts
// Visibility
expect(element).toBeVisible();
expect(element).toBeInTheDocument();
expect(element).not.toBeInTheDocument();

// Content
expect(element).toHaveTextContent("text");
expect(element).toHaveValue("input value");

// Attributes
expect(element).toHaveAttribute("href", "/path");
expect(element).toBeDisabled();
expect(element).toHaveClass("active");
```
