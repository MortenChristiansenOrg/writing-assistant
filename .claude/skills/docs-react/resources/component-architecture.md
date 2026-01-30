# Component Architecture

Guidelines for structuring, splitting, and composing React components.

---

## 200-Line Threshold

Components exceeding ~200 lines should be evaluated for splitting. Signs you need to split:

- Multiple unrelated responsibilities
- Deeply nested JSX
- Many useState/useEffect hooks
- Hard to understand at a glance

---

## Container/Presentational Separation

```tsx
// Container - handles data and logic
function ArtworkListContainer() {
  const artworks = useQuery(api.artworks.list);
  const deleteArtwork = useMutation(api.artworks.remove);

  if (!artworks) return <Loading />;

  return (
    <ArtworkList
      artworks={artworks}
      onDelete={deleteArtwork}
    />
  );
}

// Presentational - pure rendering
function ArtworkList({ artworks, onDelete }: Props) {
  return (
    <ul>
      {artworks.map(artwork => (
        <ArtworkItem
          key={artwork._id}
          artwork={artwork}
          onDelete={() => onDelete({ id: artwork._id })}
        />
      ))}
    </ul>
  );
}
```

---

## Hook Extraction Patterns

Extract complex logic into custom hooks:

```tsx
// BAD - logic cluttering component
function ArtworkForm() {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => { /* 20 lines */ };
  const handleSubmit = async () => { /* 30 lines */ };
  // ... 50+ more lines of form logic

  return <form>...</form>;
}

// GOOD - extracted hook
function useArtworkForm(initialData?: Artwork) {
  const [formData, setFormData] = useState({
    title: initialData?.title ?? "",
    year: initialData?.year ?? "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createArtwork = useMutation(api.artworks.create);
  const updateArtwork = useMutation(api.artworks.update);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (formData.year && isNaN(Number(formData.year))) {
      newErrors.year = "Year must be a number";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      if (initialData) {
        await updateArtwork({ id: initialData._id, ...formData });
      } else {
        await createArtwork(formData);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return { formData, setFormData, errors, isSubmitting, handleSubmit };
}

// Clean component
function ArtworkForm({ artwork }: Props) {
  const { formData, setFormData, errors, isSubmitting, handleSubmit } =
    useArtworkForm(artwork);

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={formData.title}
        onChange={e => setFormData(d => ({ ...d, title: e.target.value }))}
        error={errors.title}
      />
      {/* ... */}
    </form>
  );
}
```

---

## Composition Over Props

```tsx
// BAD - prop explosion
<Card
  title="Artwork"
  subtitle="Details"
  headerAction={<Button>Edit</Button>}
  footerContent={<Button>Save</Button>}
  showBorder
  padding="large"
/>

// GOOD - composition
<Card>
  <Card.Header>
    <Card.Title>Artwork</Card.Title>
    <Button>Edit</Button>
  </Card.Header>
  <Card.Body>
    {/* content */}
  </Card.Body>
  <Card.Footer>
    <Button>Save</Button>
  </Card.Footer>
</Card>
```

---

## Component File Structure

For complex components, use a folder:

```text
ComplexForm/
  index.tsx           # Main component, re-exports
  ComplexForm.tsx     # Core component
  FormFields.tsx      # Sub-components
  useComplexForm.ts   # Custom hook
  types.ts            # TypeScript types
```
