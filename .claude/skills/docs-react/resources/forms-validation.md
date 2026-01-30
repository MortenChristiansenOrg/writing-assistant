# Forms & Validation

Form state management, file uploads, and drag-drop patterns.

---

## Controlled Input Patterns

### Basic Form State

```tsx
interface FormData {
  title: string;
  year: string;
  description: string;
}

function ArtworkForm() {
  const [data, setData] = useState<FormData>({
    title: "",
    year: "",
    description: "",
  });

  const setField = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form>
      <Input
        label="Title"
        value={data.title}
        onChange={e => setField("title", e.target.value)}
      />
      <Input
        label="Year"
        value={data.year}
        onChange={e => setField("year", e.target.value)}
      />
      <Textarea
        label="Description"
        value={data.description}
        onChange={e => setField("description", e.target.value)}
      />
    </form>
  );
}
```

### Form with Validation

```tsx
interface FormErrors {
  title?: string;
  year?: string;
}

function useFormValidation(data: FormData) {
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!data.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (data.year && isNaN(Number(data.year))) {
      newErrors.year = "Year must be a number";
    } else if (data.year) {
      const year = Number(data.year);
      if (year < 1000 || year > new Date().getFullYear()) {
        newErrors.year = "Year must be between 1000 and current year";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field: keyof FormErrors) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  return { errors, validate, clearError };
}
```

---

## File Upload Handling

### Basic File Input

```tsx
function ImageUpload({ onUpload }: { onUpload: (file: File) => void }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <input
      type="file"
      accept="image/*"
      onChange={handleChange}
    />
  );
}
```

### File Validation

```tsx
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "File must be JPEG, PNG, or WebP";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File must be under 10MB";
  }
  return null;
}

function ImageUpload({ onUpload, onError }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      onError(error);
      return;
    }

    onUpload(file);
  };

  return <input type="file" accept="image/*" onChange={handleChange} />;
}
```

---

## useDropzone Hook

Extract drag-drop logic into reusable hook:

```tsx
// src/hooks/useDropzone.ts
interface UseDropzoneOptions {
  onDrop: (files: File[]) => void;
  accept?: string[];
  maxSize?: number;
  multiple?: boolean;
}

interface UseDropzoneReturn {
  isDragging: boolean;
  getRootProps: () => {
    onDragEnter: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  getInputProps: () => {
    type: "file";
    accept: string;
    multiple: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
}

export function useDropzone({
  onDrop,
  accept = ["image/*"],
  maxSize = 10 * 1024 * 1024,
  multiple = false,
}: UseDropzoneOptions): UseDropzoneReturn {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const files = Array.from(fileList).filter(file => {
      if (file.size > maxSize) return false;
      if (
        accept.length &&
        !accept.some(type =>
          type.endsWith('/*')
            ? file.type.startsWith(type.slice(0, -1))
            : file.type === type,
        )
      ) {
        return false;
      }
      return true;
    });

    onDrop(multiple ? files : files.slice(0, 1));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  return {
    isDragging,
    getRootProps: () => ({
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    }),
    getInputProps: () => ({
      type: "file" as const,
      accept: accept.join(","),
      multiple,
      onChange: handleChange,
    }),
  };
}
```

### Using the Dropzone

```tsx
function ImageDropzone({ onUpload }: Props) {
  const { isDragging, getRootProps, getInputProps } = useDropzone({
    onDrop: files => files[0] && onUpload(files[0]),
    accept: ["image/jpeg", "image/png", "image/webp"],
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
        isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
      )}
    >
      <input {...getInputProps()} className="hidden" />
      <p className="text-gray-600">
        {isDragging
          ? "Drop your image here"
          : "Drag & drop or click to upload"}
      </p>
    </div>
  );
}
```

---

## Form Submission Pattern

```tsx
function ArtworkForm({ onSuccess }: { onSuccess?: () => void }) {
  const [data, setData] = useState<FormData>(initialData);
  const { errors, validate, clearError } = useFormValidation(data);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createArtwork = useMutation(api.artworks.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await createArtwork({
        title: data.title,
        year: data.year ? Number(data.year) : undefined,
        description: data.description || undefined,
      });
      onSuccess?.();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      {submitError && <p className="text-red-500">{submitError}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

