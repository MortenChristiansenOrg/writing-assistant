# Writing Assistant - Implementation Plan

## Overview
Prose writing/editing app with LLM integration. Users edit text, select passages for AI rewriting, define personas, and track spending.

## Tech Stack
- Bun (runtime, package manager, test runner)
- React 19 + React Compiler + Vite + TypeScript
- Tailwind 4 + shadcn/ui (component library)
- Convex (backend, auth, realtime)
- WorkOS Vault (API key storage)
- Vercel AI SDK + OpenRouter
- TipTap (rich text editor)
- Vercel (deployment)

### React Compiler
Enabled via `babel-plugin-react-compiler`. Automatically memoizes components/hooks, eliminating manual `useMemo`/`useCallback`. Particularly useful for editor performance.

### Effect Library - Not Recommended for MVP
[Effect](https://effect.website/) provides typed errors, DI, and resource management. However:
- **Steep learning curve** - significant paradigm shift
- **Convex already handles** backend complexity, transactions, retries
- **Zod + TypeScript** already provide strong validation
- **Overkill for MVP** - adds complexity without clear benefit yet

**Revisit if**: We need complex error recovery flows, sophisticated retry logic, or the AI streaming layer becomes significantly more complex. For now, standard TypeScript with Zod is sufficient.

## Why TipTap for the Editor

**TipTap** is a headless, extensible rich text editor built on ProseMirror.

### Key Advantages
1. **Headless architecture**: No default UI, full control over styling with Tailwind/shadcn
2. **BubbleMenu extension**: Built-in floating menu on text selection - perfect for "select text → AI rewrite" UX
3. **JSON document format**: Stores content as structured JSON, ideal for Convex storage and revision diffing
4. **Extension ecosystem**: 50+ official extensions (character count, placeholder, history, etc.)
5. **React-first**: `@tiptap/react` provides hooks-based API (`useEditor`)
6. **Collaboration-ready**: Yjs integration if we add real-time collab later

### Alternatives Considered
- **Lexical** (Meta): Newer, good performance, but less mature extension ecosystem
- **Slate**: More low-level, requires more boilerplate
- **Quill**: Opinionated styling, harder to customize
- **ProseMirror raw**: Too low-level, TipTap wraps it nicely

### TipTap Structure for This App
```tsx
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

const editor = useEditor({
  extensions: [StarterKit, Placeholder, CharacterCount],
  content: document.currentContent,
  onUpdate: ({ editor }) => saveToConvex(editor.getJSON()),
})

// BubbleMenu appears on selection
<BubbleMenu editor={editor}>
  <Button onClick={() => rewriteSelection('formal')}>More formal</Button>
  <Button onClick={() => rewriteSelection('concise')}>Shorter</Button>
</BubbleMenu>
```

The BubbleMenu pattern maps directly to the core "select → AI action" workflow.

## Architectural Principles

### 1. Editor Abstraction Layer
Isolate editor choice behind an interface to enable swapping implementations:

```typescript
// src/lib/editor/types.ts
interface EditorAdapter {
  getContent(): DocumentContent
  setContent(content: DocumentContent): void
  getSelection(): Selection | null
  replaceSelection(text: string): void
  onContentChange(callback: (content: DocumentContent) => void): void
  destroy(): void
}

interface Selection {
  text: string
  start: number
  end: number
}

type DocumentContent = {
  type: 'json'
  data: Record<string, unknown>
} | {
  type: 'html'
  data: string
}
```

```
src/lib/editor/
├── types.ts              # EditorAdapter interface
├── tiptap-adapter.ts     # TipTap implementation
├── lexical-adapter.ts    # Future: Lexical implementation
└── index.ts              # Factory function
```

Components use `EditorAdapter`, not TipTap directly. Can swap editors without touching UI code.

### 2. Testability Requirements
- **Unit tests**: All Convex mutations/queries with mocked db
- **Integration tests**: AI streaming with mock OpenRouter responses
- **E2E tests**: Playwright for critical flows (auth, create doc, AI rewrite)
- **Component tests**: React Testing Library for UI components

Test structure:
```
tests/
├── unit/
│   ├── convex/           # Mutation/query logic
│   └── lib/              # Utilities, adapters
├── integration/
│   └── ai/               # AI streaming with mocks
└── e2e/
    └── flows/            # Playwright critical paths
```

Convex testing pattern:
```typescript
// tests/unit/convex/documents.test.ts
import { convexTest } from "convex-test"
import { api } from "../convex/_generated/api"

test("createDocument returns document id", async () => {
  const t = convexTest(schema)
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {...}))
  const docId = await t.mutation(api.documents.create, { title: "Test", projectId })
  expect(docId).toBeDefined()
})
```

### 3. Type Safety
- **Strict TypeScript**: `strict: true`, `noUncheckedIndexedAccess: true`
- **Convex validators**: All args validated with `v.*`, inferred types
- **Zod schemas**: For API boundaries and runtime validation
- **No `any`**: ESLint rule `@typescript-eslint/no-explicit-any: error`
- **Branded types**: For IDs to prevent mixing document/project/revision IDs

```typescript
// src/lib/types.ts
type Brand<T, B> = T & { __brand: B }
type DocumentId = Brand<string, 'DocumentId'>
type ProjectId = Brand<string, 'ProjectId'>

// Convex already provides Id<"documents"> which serves similar purpose
```

ESLint config additions:
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/strict-boolean-expressions": "error",
    "@typescript-eslint/no-floating-promises": "error"
  }
}
```

## Project Structure
```
writing-assistant/
├── api/ai/stream.ts           # Vercel serverless for AI streaming
├── convex/
│   ├── schema.ts              # Database schema
│   ├── auth.ts                # Convex Auth config
│   ├── projects.ts            # Project CRUD
│   ├── documents.ts           # Document CRUD + autosave
│   ├── revisions.ts           # Event-sourced history
│   ├── personas.ts            # LLM persona definitions
│   └── spending.ts            # Token/cost tracking
├── src/
│   ├── components/
│   │   ├── editor/
│   │   │   ├── Editor.tsx     # TipTap wrapper
│   │   │   └── BubbleMenu.tsx # Selection -> AI menu
│   │   ├── sidebar/
│   │   │   ├── ProjectList.tsx
│   │   │   └── HistoryPanel.tsx
│   │   ├── personas/
│   │   └── settings/
│   ├── hooks/
│   │   └── useAI.ts           # AI streaming hook
│   └── pages/
├── vite.config.ts
└── vercel.json
```

## Database Schema (Convex)

### Tables
1. **users** - Convex Auth tables
2. **userSettings** - Default model, spending threshold (API keys in WorkOS Vault)
3. **projects** - Writing projects per user
4. **documents** - Docs within projects, stores current TipTap JSON
5. **revisions** - Immutable snapshots (event sourcing), tracks changeType (manual/ai_rewrite/ai_insert/restore)
6. **aiFeedback** - LLM suggestions linked to revisions, with status (pending/accepted/rejected)
7. **personas** - Character or assistant personas with systemPrompt
8. **spendingSessions** - Daily aggregated token/cost tracking

### Key Indexes
- documents by_project, by_user
- revisions by_document, by_document_time
- aiFeedback by_revision

## AI Integration Architecture

### Flow
1. User selects text in editor
2. BubbleMenu appears with options (Rewrite, Shorten, Expand, etc.)
3. User picks action + optional persona
4. Frontend calls `/api/ai/stream` with prompt + encrypted API key
5. Serverless function decrypts key, calls OpenRouter via AI SDK
6. Streams response back; UI shows inline preview
7. User accepts/rejects; if accepted, creates new revision
8. Token usage logged to spendingSessions

### API Key Security (WorkOS Vault)
- User enters OpenRouter key in Settings
- Stored via [WorkOS Vault](https://workos.com/docs/vault) - HSM-backed encryption
- Each user's key cryptographically isolated via key context
- Envelope encryption (DEK encrypted by KEK in HSM)
- Retrieved only in serverless function, never exposed to client
- BYOK option later if needed (AWS KMS, GCP KMS, etc.)

WorkOS Vault handles:
- Encryption at rest with per-secret unique keys
- Audit logging
- Key rotation
- No custom crypto code to maintain

### Key Packages
```
@openrouter/ai-sdk-provider
ai @ai-sdk/react
@tiptap/react @tiptap/starter-kit @tiptap/extension-bubble-menu
```

## Implementation Phases

### Phase 1: Foundation
- [ ] `npm create vite@latest` with React + TS
- [ ] Tailwind 4 setup
- [ ] `npx convex dev` init
- [ ] Convex Auth (GitHub OAuth)
- [ ] Basic routing (react-router-dom)
- [ ] Vercel project + deploy pipeline

### Phase 2: Editor MVP
- [ ] TipTap editor with StarterKit
- [ ] Document CRUD mutations
- [ ] Project list sidebar
- [ ] Autosave (debounced 500ms)
- [ ] Document switching

### Phase 3: AI Integration
- [ ] Settings page with API key input
- [ ] Encrypted key storage in Convex
- [ ] `/api/ai/stream.ts` serverless endpoint
- [ ] `useAI` hook with useCompletion
- [ ] BubbleMenu with Rewrite action
- [ ] Streaming preview in editor
- [ ] Accept/reject flow
- [ ] Usage tracking mutation

### Phase 4: History & Personas
- [ ] Revision creation on save + AI ops
- [ ] HistoryPanel timeline UI
- [ ] Restore from revision
- [ ] Persona CRUD
- [ ] Persona selector in BubbleMenu
- [ ] System prompt injection

### Phase 5: Polish
- [ ] SpendingDashboard (daily/weekly)
- [ ] Dialog writing helpers
- [ ] Loading/error states
- [ ] Responsive design
- [ ] Edge cases

## Critical Files to Create

| File | Purpose |
|------|---------|
| `convex/schema.ts` | All table definitions |
| `src/components/editor/Editor.tsx` | TipTap + selection tracking |
| `api/ai/stream.ts` | OpenRouter streaming endpoint |
| `src/hooks/useAI.ts` | Client streaming hook |
| `convex/revisions.ts` | Event sourcing logic |

## Verification Plan
1. **Auth**: Login with GitHub, verify user created in Convex
2. **Editor**: Create project/doc, type text, verify autosave
3. **AI**: Select text, rewrite, verify streaming works and revision created
4. **History**: Check timeline shows revision, restore works
5. **Spending**: Verify token counts accumulate correctly

## Design Decisions

1. **Revision granularity**: Hybrid approach
   - AI operations: always create revision immediately
   - User typing: debounce 5s idle OR 30s max
   - Start simpler (explicit save + AI ops), evolve as needed

2. **Model selection**: Curated list (~10 models)
   - Claude 3.5 Sonnet, GPT-4o, GPT-4o-mini, Llama 3.1, etc.
   - Stored in config, easy to update
   - Enables accurate cost tracking

3. **Spending limits**: Per-session warning
   - User sets threshold in settings (default $1)
   - Warning toast when exceeded, doesn't block
