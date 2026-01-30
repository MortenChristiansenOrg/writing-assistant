# React Compiler

React Compiler is enabled in this project. It automatically handles memoization.

---

## What React Compiler Does

- Automatically memoizes components and hooks
- Eliminates need for `useMemo`, `useCallback`, `React.memo`
- Enforces Rules of React at compile time
- Zero runtime overhead

---

## What NOT to Use

Don't add manual memoization - the compiler handles it:

```tsx
// DON'T - unnecessary with React Compiler
const MemoizedCard = React.memo(function DocumentCard({ document }) {
  return <div>{document.title}</div>;
});

function ParentComponent({ items }) {
  const sortedItems = useMemo(
    () => items.sort((a, b) => a.title.localeCompare(b.title)),
    [items]
  );

  const handleClick = useCallback((id) => {
    console.log("clicked", id);
  }, []);
}

// DO - let the compiler optimize
function DocumentCard({ document }) {
  return <div>{document.title}</div>;
}

function ParentComponent({ items }) {
  const sortedItems = [...items].sort((a, b) => a.title.localeCompare(b.title));
  const handleClick = (id) => console.log("clicked", id);
}
```

---

## What to Keep

### useRef

`useRef` is for DOM refs and mutable values, not memoization:

```tsx
const inputRef = useRef<HTMLInputElement>(null);
const intervalRef = useRef<number | null>(null);
```

### useEffect Dependencies

Dependency arrays in `useEffect` are still required:

```tsx
useEffect(() => {
  document.title = `${count} items`;
}, [count]);
```

---

## Common Violations

React Compiler will error on Rules of React violations:

### Mutating During Render

```tsx
// ERROR - mutates props
function BadComponent({ items }) {
  items.push(newItem); // Compiler error
  return <List items={items} />;
}

// FIX
function GoodComponent({ items }) {
  const allItems = [...items, newItem];
  return <List items={allItems} />;
}
```

### Hooks in Conditions

```tsx
// ERROR - conditional hook
function BadComponent({ showData }) {
  if (showData) {
    const data = useQuery(api.data.get); // Compiler error
  }
}

// FIX
function GoodComponent({ showData }) {
  const data = useQuery(showData ? api.data.get : "skip");
}
```

### Side Effects During Render

```tsx
// ERROR - side effect in render
function BadComponent() {
  localStorage.setItem("visited", "true"); // Compiler error
  return <div>Hello</div>;
}

// FIX
function GoodComponent() {
  useEffect(() => {
    localStorage.setItem("visited", "true");
  }, []);
  return <div>Hello</div>;
}
```

---

## Opting Out (Escape Hatch)

For edge cases, use `"use no memo"` directive:

```tsx
function SpecialComponent() {
  "use no memo";
  // Compiler won't optimize this component
  return <div>...</div>;
}
```

Use sparingly. If you need this often, you likely have Rules of React violations.
