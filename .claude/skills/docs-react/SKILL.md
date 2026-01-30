---
name: docs-react
description: React best practices reference. Use when implementing components, handling state, integrating Convex, or optimizing React code. Covers type safety, build-time correctness, and React Compiler adoption.
---

# React Best Practices Reference

Canonical guide for React development in this project. Prioritizes type safety, build-time correctness, and modern React patterns.

---

## Rules of React

Foundational rules that must be followed. Violations cause bugs.

### 1. Components and Hooks Must Be Pure

- **Idempotent**: Same inputs → same output
- **No side effects during render**: Side effects go in event handlers or useEffect
- **Props and state are immutable**: Never mutate directly

```tsx
// BAD - mutates during render
function Counter({ items }) {
  items.push(newItem); // NEVER mutate props
  return <List items={items} />;
}

// GOOD - immutable updates
function Counter({ items }) {
  const handleAdd = () => setItems([...items, newItem]);
  return <List items={items} onAdd={handleAdd} />;
}
```

### 2. React Calls Components and Hooks

- **Never call components directly**: Use JSX `<Component />` not `Component()`
- **Never pass hooks as values**: Hooks are called, not passed

```tsx
// BAD - calling component as function
function Parent() {
  return <div>{ChildComponent()}</div>;
}

// GOOD - JSX element
function Parent() {
  return (
    <div>
      <ChildComponent />
    </div>
  );
}
```

### 3. Rules of Hooks

- **Only at top level**: No hooks in loops, conditions, or nested functions
- **Only from React functions**: Components or custom hooks

```tsx
// BAD - conditional hook
function Component({ showData }) {
  if (showData) {
    const data = useQuery(api.data.get); // NEVER
  }
}

// GOOD - conditional inside, hook at top
function Component({ showData }) {
  const data = useQuery(api.data.get);
  if (!showData) return null;
  return <Data data={data} />;
}
```

---

## Tech Stack

| Technology     | Version     | Purpose           |
| -------------- | ----------- | ----------------- |
| React          | 19.2        | UI framework      |
| Vite           | 7.2         | Build tool        |
| TypeScript     | strict mode | Type safety       |
| Convex         | -           | Backend/real-time |
| Tailwind CSS   | v4          | Styling           |
| React Compiler | enabled     | Auto-memoization  |

---

## Quick Reference

| Topic                | Resource                                                        | Key Points                          |
| -------------------- | --------------------------------------------------------------- | ----------------------------------- |
| Splitting components | [Component Architecture](./resources/component-architecture.md) | 200-line threshold, hook extraction |
| Error handling       | [Error Handling](./resources/error-handling.md)                 | Error boundaries, suspense          |
| Convex patterns      | [Convex Integration](./resources/convex-integration.md)         | useQuery/useMutation, auth          |
| Forms                | [Forms & Validation](./resources/forms-validation.md)           | State management, file uploads      |
| Environment          | [Environment Setup](./resources/environment-setup.md)           | Env validation at startup           |
| Performance          | [React Compiler](./resources/react-compiler.md)                 | Auto-memoization, what to avoid     |
| Mistakes             | [Anti-Patterns](./resources/anti-patterns.md)                   | Common issues to avoid              |

---

## File Naming

| Type       | Pattern                   | Example                                |
| ---------- | ------------------------- | -------------------------------------- |
| Components | PascalCase                | `ArtworkCard.tsx`                      |
| Hooks      | camelCase with use prefix | `useArtworks.ts`                       |
| Utilities  | camelCase                 | `formatDate.ts`                        |
| Types      | PascalCase                | `types.ts` exports `Artwork`           |
| Constants  | SCREAMING_SNAKE           | `constants.ts` exports `MAX_FILE_SIZE` |

---

## Project Structure

```
src/
  components/           # Reusable UI components
    ui/                 # Base components (Button, Input, etc.)
    editor/             # Editor-specific components
    sidebar/            # Sidebar components
    personas/           # Persona management
    settings/           # Settings components
  hooks/                # Custom hooks
  lib/                  # Utilities and helpers
    editor/             # Editor adapter layer
  pages/                # Route components
convex/                 # Convex functions (backend)
```

---

---

## Sub-Documents

- [Component Architecture](./resources/component-architecture.md) - Splitting, composition, hook extraction
- [Error Handling](./resources/error-handling.md) - Error boundaries, suspense, error states
- [Convex Integration](./resources/convex-integration.md) - useQuery/useMutation patterns, auth
- [Forms & Validation](./resources/forms-validation.md) - Form state, file uploads, drag-drop
- [Environment Setup](./resources/environment-setup.md) - Env validation at startup
- [React Compiler](./resources/react-compiler.md) - Migration guide, removing manual memo
- [Anti-Patterns](./resources/anti-patterns.md) - Common mistakes to avoid
