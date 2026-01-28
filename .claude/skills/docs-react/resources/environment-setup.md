# Environment Setup

Environment variable validation and startup configuration.

---

## Fail-Fast Validation

Validate environment variables at app startup. Fail immediately with clear messages.

```tsx
// src/lib/env.ts

// Type-safe environment definition
interface Env {
  VITE_CONVEX_URL: string;
  VITE_CLERK_PUBLISHABLE_KEY?: string;
  VITE_SENTRY_DSN?: string;
}

// Validation with clear error messages
function validateEnv(): Env {
  const errors: string[] = [];

  // Required variables
  const convexUrl = import.meta.env.VITE_CONVEX_URL;
  if (!convexUrl || typeof convexUrl !== "string") {
    errors.push("VITE_CONVEX_URL is required");
  }

  // Optional with format validation
  const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (clerkKey && !clerkKey.startsWith("pk_")) {
    errors.push("VITE_CLERK_PUBLISHABLE_KEY must start with 'pk_'");
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map(e => `  - ${e}`).join("\n")}`
    );
  }

  return {
    VITE_CONVEX_URL: convexUrl,
    VITE_CLERK_PUBLISHABLE_KEY: clerkKey,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  };
}

// Export validated env (runs once at import)
export const env = validateEnv();
```

---

## Type Guards for Validation

```tsx
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateEnv(): Env {
  const errors: string[] = [];

  const convexUrl = import.meta.env.VITE_CONVEX_URL;
  if (!isValidUrl(convexUrl)) {
    errors.push("VITE_CONVEX_URL must be a valid URL");
  }

  // ...
}
```

---

## Usage Pattern

Import env once in main.tsx to trigger validation:

```tsx
// src/main.tsx
import { env } from "./lib/env"; // Validates on import
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>
);
```

---

## Development vs Production

```tsx
interface Env {
  VITE_CONVEX_URL: string;
  VITE_API_URL: string;
  isDev: boolean;
  isProd: boolean;
}

function validateEnv(): Env {
  const mode = import.meta.env.MODE;
  const isDev = mode === "development";
  const isProd = mode === "production";

  // Dev-only variables
  if (isDev) {
    // Optional in dev...
  }

  // Prod requirements
  if (isProd) {
    const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
    if (!sentryDsn) {
      errors.push("VITE_SENTRY_DSN is required in production");
    }
  }

  return {
    VITE_CONVEX_URL: convexUrl,
    VITE_API_URL: apiUrl,
    isDev,
    isProd,
  };
}
```

---

## Example .env Files

```bash
# .env.example (committed to repo)
VITE_CONVEX_URL=
VITE_CLERK_PUBLISHABLE_KEY=
VITE_SENTRY_DSN=

# .env.local (gitignored, dev values)
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx

# .env.production (CI/CD, or platform env vars)
VITE_CONVEX_URL=https://prod-project.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## Migration: Add env.ts

1. Create `src/lib/env.ts` with validation
2. Update `src/main.tsx` to import env first
3. Replace direct `import.meta.env` usage with `env.*`

```tsx
// Before (scattered throughout codebase)
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// After (validated, type-safe)
import { env } from "./lib/env";
const convex = new ConvexReactClient(env.VITE_CONVEX_URL);
```

---

## Error Display

For dev experience, show clear errors in UI:

```tsx
// src/main.tsx
try {
  const { env } = await import("./lib/env");
  // ... render app
} catch (error) {
  // Show error in DOM for dev visibility
  document.getElementById("root")!.innerHTML = `
    <div style="padding: 2rem; font-family: monospace;">
      <h1 style="color: red;">Environment Error</h1>
      <pre>${error instanceof Error ? error.message : "Unknown error"}</pre>
    </div>
  `;
}
```
