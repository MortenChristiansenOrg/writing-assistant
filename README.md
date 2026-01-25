# Writing Assistant

AI-powered prose writing/editing app. Users edit text, select passages for AI rewriting, define personas, and track spending.

## Tech Stack

- Bun + Vite + React 19 + TypeScript
- React Compiler for automatic memoization
- Tailwind 4 + shadcn/ui
- Convex (backend, auth, realtime)
- TipTap (rich text editor)
- Vercel AI SDK + OpenRouter

## Setup

1. Install dependencies:
```bash
bun install
```

2. Set up Convex:
```bash
npx convex dev
```
Follow prompts to create/link a Convex project.

3. Configure GitHub OAuth in Convex dashboard:
   - Create OAuth app at github.com/settings/developers
   - Add `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` as environment variables

4. Start dev server:
```bash
bun dev
```

## Project Structure

```
├── api/ai/          # Vercel serverless (AI streaming)
├── convex/          # Backend (schema, functions)
├── src/
│   ├── components/
│   │   ├── editor/  # TipTap editor + AI menu
│   │   ├── sidebar/ # Navigation
│   │   ├── personas/
│   │   └── settings/
│   ├── hooks/       # useAI, useAuth
│   ├── lib/         # Editor abstraction, utils
│   └── pages/
```

## Features

- Rich text editing with TipTap
- AI text rewriting (rewrite, shorter, longer, formal, casual, fix grammar)
- Project/document organization
- Revision history with restore
- Custom AI personas
- Spending tracking by model
