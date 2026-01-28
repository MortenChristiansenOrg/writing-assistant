# Anti-Patterns

Common React mistakes to avoid.

---

## Rules of React Violations

### Mutating Props/State Directly

```tsx
// BAD - mutates props
function BadComponent({ items }) {
  items.push(newItem);
  return <List items={items} />;
}

// BAD - mutates state
function BadCounter() {
  const [state, setState] = useState({ count: 0 });

  const increment = () => {
    state.count++; // NEVER
    setState(state);
  };
}

// GOOD - immutable updates
function GoodComponent({ items }) {
  const allItems = [...items, newItem];
  return <List items={allItems} />;
}

function GoodCounter() {
  const [state, setState] = useState({ count: 0 });

  const increment = () => {
    setState(prev => ({ ...prev, count: prev.count + 1 }));
  };
}
```

### Side Effects During Render

```tsx
// BAD - side effect in render body
function BadComponent() {
  console.log("rendered"); // Runs unpredictably
  localStorage.setItem("key", "value"); // Side effect!
  fetchData(); // Network request during render!

  return <div>Content</div>;
}

// GOOD - side effects in handlers or useEffect
function GoodComponent() {
  useEffect(() => {
    console.log("mounted");
    localStorage.setItem("key", "value");
  }, []);

  const handleClick = () => {
    fetchData();
  };

  return <button onClick={handleClick}>Load</button>;
}
```

### Calling Components as Functions

```tsx
// BAD - calling component as function
function Parent() {
  return <div>{ChildComponent()}</div>;
}

// GOOD - JSX element
function Parent() {
  return <div><ChildComponent /></div>;
}
```

### Hooks in Conditions/Loops

```tsx
// BAD - hook in condition
function BadComponent({ isLoggedIn }) {
  if (isLoggedIn) {
    const user = useQuery(api.users.current); // NEVER
  }
}

// BAD - hook in loop
function BadList({ ids }) {
  return ids.map(id => {
    const item = useQuery(api.items.get, { id }); // NEVER
    return <Item key={id} item={item} />;
  });
}

// GOOD - hook at top level
function GoodComponent({ isLoggedIn }) {
  const user = useQuery(
    api.users.current,
    isLoggedIn ? {} : "skip"
  );
}

// GOOD - child component with hook
function ItemWithQuery({ id }) {
  const item = useQuery(api.items.get, { id });
  return <Item item={item} />;
}

function GoodList({ ids }) {
  return ids.map(id => <ItemWithQuery key={id} id={id} />);
}
```

---

## useEffect for Derived State

```tsx
// BAD - effect for derived state
function BadComponent({ items }) {
  const [filteredItems, setFilteredItems] = useState([]);

  useEffect(() => {
    setFilteredItems(items.filter(i => i.active));
  }, [items]);
}

// GOOD - compute during render
function GoodComponent({ items }) {
  const filteredItems = items.filter(i => i.active);
}
```

---

## Missing Loading/Error States

```tsx
// BAD - assumes data exists
function BadComponent() {
  const data = useQuery(api.data.get);
  return <div>{data.title}</div>; // Crashes if undefined
}

// GOOD - handle all states
function GoodComponent() {
  const data = useQuery(api.data.get);

  if (data === undefined) return <Loading />;
  if (data === null) return <NotFound />;

  return <div>{data.title}</div>;
}
```

---

## Using Index as Key

```tsx
// BAD - index key causes bugs with reordering
function BadList({ items }) {
  return items.map((item, index) => (
    <Item key={index} item={item} />
  ));
}

// GOOD - stable unique key
function GoodList({ items }) {
  return items.map(item => (
    <Item key={item._id} item={item} />
  ));
}
```

---

## Giant Components

```tsx
// BAD - 500+ line component
function BadForm() {
  // 50 lines of state
  // 100 lines of handlers
  // 50 lines of validation
  // 300 lines of JSX
}

// GOOD - split into focused pieces
function GoodForm() {
  const form = useFormState();
  const validation = useFormValidation(form.data);

  return (
    <form onSubmit={form.handleSubmit}>
      <PersonalFields {...form} errors={validation.errors} />
      <AddressFields {...form} errors={validation.errors} />
      <SubmitButton loading={form.isSubmitting} />
    </form>
  );
}
```

---

## Validation on Every Render

```tsx
// BAD - expensive validation every render
function BadForm({ data }) {
  const isValid = expensiveValidation(data); // Runs every render

  return <button disabled={!isValid}>Submit</button>;
}

// GOOD - validate on change or submit
function GoodForm({ data }) {
  const [isValid, setIsValid] = useState(true);

  const handleChange = (newData) => {
    setData(newData);
    setIsValid(expensiveValidation(newData));
  };

  return <button disabled={!isValid}>Submit</button>;
}
```

---

## Prop Drilling vs Context

```tsx
// BAD - passing through many levels
function App() {
  const [user, setUser] = useState(null);
  return <Layout user={user} setUser={setUser} />;
}
function Layout({ user, setUser }) {
  return <Header user={user} setUser={setUser} />;
}
function Header({ user, setUser }) {
  return <UserMenu user={user} setUser={setUser} />;
}

// GOOD - context for global state
const UserContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Layout />
    </UserContext.Provider>
  );
}

function UserMenu() {
  const { user, setUser } = useContext(UserContext);
}
```

---

## Premature Optimization

```tsx
// BAD - memoizing everything (pre-React Compiler)
const MemoizedItem = React.memo(({ item }) => <div>{item.name}</div>);

function List({ items }) {
  const sortedItems = useMemo(() =>
    items.sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  const handleClick = useCallback((id) => {
    console.log(id);
  }, []);
}

// GOOD - let React Compiler handle it
function Item({ item }) {
  return <div>{item.name}</div>;
}

function List({ items }) {
  const sortedItems = items.sort((a, b) => a.name.localeCompare(b.name));
  const handleClick = (id) => console.log(id);
}
```

---

## Inline Object/Array in JSX

```tsx
// BAD - creates new object every render
<Component style={{ color: "red" }} />
<Component items={[1, 2, 3]} />

// OK in most cases with React Compiler
// For truly static values, extract:
const style = { color: "red" };
const items = [1, 2, 3];

<Component style={style} />
<Component items={items} />
```

---

## Summary Checklist

- [ ] Never mutate props or state
- [ ] No side effects during render
- [ ] Use JSX, don't call components as functions
- [ ] Hooks only at top level of components/hooks
- [ ] Derive state during render, not in useEffect
- [ ] Handle loading/error/empty states
- [ ] Use stable keys (not array index)
- [ ] Split components > 200 lines
- [ ] Don't validate on every render
- [ ] Use context for deeply shared state
