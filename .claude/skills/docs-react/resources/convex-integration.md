# Convex Integration

Patterns for useQuery, useMutation, and authentication with Convex.

---

## useQuery Patterns

### Basic Query

```tsx
function ArtworkList() {
  const artworks = useQuery(api.artworks.list);

  if (artworks === undefined) return <Loading />;

  return (
    <ul>
      {artworks.map(artwork => (
        <ArtworkItem key={artwork._id} artwork={artwork} />
      ))}
    </ul>
  );
}
```

### Conditional Query with Skip

Use `"skip"` sentinel to conditionally skip queries:

```tsx
function ArtworkDetail({ id }: { id?: string }) {
  // Skip query if no id provided
  const artwork = useQuery(
    api.artworks.get,
    id ? { id: id as Id<"artworks"> } : "skip"
  );

  if (!id) return <SelectArtwork />;
  if (artwork === undefined) return <Loading />;
  if (artwork === null) return <NotFound />;

  return <ArtworkView artwork={artwork} />;
}
```

### Query with Pagination

```tsx
function ArtworkGrid() {
  const [cursor, setCursor] = useState<string | null>(null);

  const result = useQuery(api.artworks.paginated, {
    cursor,
    limit: 20
  });

  if (result === undefined) return <Loading />;

  return (
    <>
      <Grid items={result.items} />
      {result.nextCursor && (
        <button onClick={() => setCursor(result.nextCursor)}>
          Load more
        </button>
      )}
    </>
  );
}
```

---

## useMutation Patterns

### Basic Mutation

```tsx
function CreateArtworkButton() {
  const createArtwork = useMutation(api.artworks.create);

  const handleCreate = async () => {
    await createArtwork({
      title: "New Artwork",
      year: 2024,
    });
  };

  return <button onClick={handleCreate}>Create</button>;
}
```

### Mutation with Loading State

```tsx
function SaveButton({ data }: Props) {
  const updateArtwork = useMutation(api.artworks.update);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await updateArtwork(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button onClick={handleSave} disabled={isLoading}>
        {isLoading ? "Saving..." : "Save"}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </>
  );
}
```

### Mutation Wrapper Hook

```tsx
function useMutationWithState<Args, Result>(
  mutationFn: UseMutation<Args, Result>
) {
  const mutation = useMutation(mutationFn);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async (args: Args): Promise<Result | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await mutation(args);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading, error };
}

// Usage
function SaveButton({ data }: Props) {
  const { execute, isLoading, error } = useMutationWithState(api.artworks.update);

  return (
    <button onClick={() => execute(data)} disabled={isLoading}>
      {isLoading ? "Saving..." : "Save"}
    </button>
  );
}
```

---

## Authentication Patterns

### Auth Context

```tsx
// src/lib/auth.tsx
import { useConvexAuth } from "convex/react";

interface AuthContext {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
}

const AuthContext = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.current);

  const value = useMemo(() => ({
    isAuthenticated,
    isLoading: isLoading || (isAuthenticated && user === undefined),
    userId: user?._id ?? null,
  }), [isAuthenticated, isLoading, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be within AuthProvider");
  return context;
}
```

### Protected Routes

```tsx
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return children;
}

// Usage
<Route path="/dashboard">
  <ProtectedRoute>
    <DashboardPage />
  </ProtectedRoute>
</Route>
```

---

## Real-Time Subscription Best Practices

```tsx
// Convex queries auto-subscribe to updates
function ArtworkList() {
  // This automatically updates when artworks change
  const artworks = useQuery(api.artworks.list);

  return <Grid items={artworks ?? []} />;
}

// For manual refresh patterns (rare)
function ManualRefresh() {
  const [key, setKey] = useState(0);
  const refresh = () => setKey(k => k + 1);

  return (
    <div>
      <button onClick={refresh}>Refresh</button>
      <ArtworkGrid key={key} />
    </div>
  );
}

function ArtworkGrid() {
  const artworks = useQuery(api.artworks.list);
  return <Grid items={artworks ?? []} />;
}
```
