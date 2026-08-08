# Writing Assistant

An AI-assisted prose editor with rich-text projects and documents, selection-based rewrites, editorial personas, review notes, revisions, and provider-reported spending.

## Stack

- Bun, Vite 8, React 19, React Compiler, and TypeScript 7
- Convex for the backend and real-time data
- Clerk for authentication
- TipTap 3 and the official TipTap Markdown extension
- AI SDK 7 with the official OpenRouter provider
- Tailwind CSS 4 and shadcn/ui

Users bring their own OpenRouter key. The key is sent once to an authenticated Convex HTTP action, encrypted with AES-256-GCM and identity-bound associated data, and stored only as ciphertext. It is never returned to the browser.

## Local setup

1. Install dependencies with `bun install`.
2. Copy `.env.example` to `.env.local` and set `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, and `VITE_CLERK_PUBLISHABLE_KEY`.
3. In the Clerk dashboard, activate the Convex integration and ensure its JWT template is named `convex`.
4. Configure the Convex deployment environment:

   ```bash
   bunx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-instance.clerk.accounts.dev
   bunx convex env set CLIENT_ORIGIN http://localhost:5178
   bunx convex env set CREDENTIAL_ENCRYPTION_KEY <base64-encoded-32-byte-key>
   ```

   `CREDENTIAL_ENCRYPTION_KEY` is one application-level encryption key, not a
   user's OpenRouter key. Generate it once with `openssl rand -base64 32` and
   keep it backed up and stable; changing it makes existing stored credentials
   unreadable. Each user supplies and manages their own OpenRouter key from the
   app's Settings page.
5. Run the user-managed Convex development process, then start the UI with `bun dev`.

There is no data migration. Clerk identities create their local Convex user record on first authenticated load.

## Verification

```bash
bun run lint
bunx tsc -b
bunx tsc -p convex/tsconfig.json
bun run test:run
bun run build
```

Browser tests use the real Clerk integration through `@clerk/testing`, not an application auth bypass. Use Clerk development keys and a dedicated `+clerk_test` user, then run `bun e2e`.

## Layout

- `convex/` — schema, authenticated data functions, encrypted credentials, and AI HTTP actions
- `src/components/editor/` — TipTap editor and AI selection UI
- `src/hooks/` — AI streaming, review, auth, and serialized autosave logic
- `src/pages/` — projects, documents, settings, and app shell
- `tests/convex/` — in-memory Convex ownership and security tests
- `e2e/` — Clerk-backed Playwright flows
- `.agents/skills/` — pinned official technology skills for coding agents
