# Error Handling

Error boundaries, suspense, and error state patterns.

---

## Error Boundary Implementation

Custom class component for catching render errors:

```tsx
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 text-center">
          <h2 className="text-lg font-semibold text-red-600">
            Something went wrong
          </h2>
          <p className="mt-2 text-gray-600">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Placement Strategy

### Global Boundary (App.tsx)

Catches catastrophic errors, shows "something went wrong":

```tsx
function App() {
  return (
    <ErrorBoundary fallback={<GlobalErrorFallback />}>
      <ConvexProvider client={convex}>
        <Router>
          <Routes />
        </Router>
      </ConvexProvider>
    </ErrorBoundary>
  );
}
```

### Route-Level Boundaries

Isolate errors to specific pages:

```tsx
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={
        <ErrorBoundary fallback={<PageError />}>
          <EditorPage />
        </ErrorBoundary>
      } />
      <Route path="/settings" element={
        <ErrorBoundary fallback={<PageError />}>
          <SettingsPage />
        </ErrorBoundary>
      } />
    </Routes>
  );
}
```

### Feature-Level Boundaries

Wrap risky components:

```tsx
function DocumentDetail() {
  return (
    <div>
      <DocumentHeader document={document} />
      <ErrorBoundary fallback={<EditorError />}>
        <Editor document={document} />
      </ErrorBoundary>
    </div>
  );
}
```

---

## Convex Query Error Handling

```tsx
function DocumentList() {
  const documents = useQuery(api.documents.list);

  // Loading state
  if (documents === undefined) {
    return <Loading />;
  }

  // Empty state
  if (documents.length === 0) {
    return <EmptyState message="No documents found" />;
  }

  return (
    <ul>
      {documents.map(document => (
        <DocumentItem key={document._id} document={document} />
      ))}
    </ul>
  );
}
```

### Mutation Error Handling

```tsx
function DeleteButton({ documentId }: Props) {
  const deleteDocument = useMutation(api.documents.remove);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteDocument({ id: documentId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  return (
    <>
      <button onClick={handleDelete}>Delete</button>
      {error && <p className="text-red-500">{error}</p>}
    </>
  );
}
```

---

## Error State Components

```tsx
// Reusable error display
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

function ErrorState({ title = "Error", message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-2 text-gray-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Try again
        </button>
      )}
    </div>
  );
}
```

---

## Migration: Add Boundaries to App.tsx

```tsx
// Before
function App() {
  return (
    <ConvexProvider client={convex}>
      <AuthProvider>
        <Router>
          <Routes />
        </Router>
      </AuthProvider>
    </ConvexProvider>
  );
}

// After
function App() {
  return (
    <ErrorBoundary fallback={<GlobalErrorFallback />}>
      <ConvexProvider client={convex}>
        <AuthProvider>
          <Router>
            <ErrorBoundary fallback={<PageError />}>
              <Routes />
            </ErrorBoundary>
          </Router>
        </AuthProvider>
      </ConvexProvider>
    </ErrorBoundary>
  );
}
```
