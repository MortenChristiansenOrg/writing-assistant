# Next Steps

## Immediate (before first real use)

- [ ] Run `npx convex dev` to generate proper types (replace stub _generated files)
- [ ] Set up GitHub OAuth app and configure env vars
- [ ] Test auth flow end-to-end
- [ ] Add error boundary at app root
- [ ] Handle Convex connection errors gracefully

## Short-term improvements

### API Key Security
Currently storing API key directly in userSettings. Plan called for WorkOS Vault:
- Integrate WorkOS Vault for HSM-backed encryption
- Keys should only be decrypted server-side in the streaming endpoint
- Never expose raw key to client

### Revision System
- Add periodic auto-revision (5s idle OR 30s max as planned)
- Diff view between revisions
- Revision pruning (keep last N per document)
- Size limits on stored content

### Editor Polish
- Keyboard shortcuts for AI actions
- Inline streaming preview (show AI output in editor as it streams)
- Undo/redo integration with revision system
- Character/word count goals

### AI Integration
- Persona selector in BubbleMenu (currently only in settings)
- Custom prompts beyond the preset actions
- Model selector per-request
- Retry on failure with exponential backoff

## Medium-term

### Performance
- Code split settings/personas (lazy load)
- Virtual scrolling for long revision lists
- Optimistic updates for document saves
- Service worker for offline draft editing

### UX
- Dark mode toggle (CSS vars are ready)
- Mobile responsive testing
- Drag-drop document reordering
- Search across documents
- Export to markdown/docx

### Collaboration (if needed)
- TipTap has Yjs integration for real-time collab
- Would need Convex subscriptions for presence
- Cursor positions, user avatars

## Investigate later

### Effect Library
Plan noted it's overkill for MVP but revisit if:
- AI streaming layer gets complex retry/recovery logic
- Need sophisticated error handling patterns
- Resource management becomes painful

### Alternative Editors
TipTap abstraction layer exists, could swap to:
- Lexical (better perf for huge docs)
- Novel (TipTap-based but with more built-in AI UX)

### Cost Tracking Accuracy
Current token estimation is rough (`length / 4`). Options:
- Use actual usage from OpenRouter response headers
- tiktoken for accurate pre-request estimates
- Store prompt + completion tokens separately

### Testing
Plan called for:
- Unit tests: Convex mutations with convex-test
- Integration: AI streaming with mocks
- E2E: Playwright for auth, create doc, AI rewrite
None implemented yet.

## Architecture notes

### Why no WorkOS Vault yet
Adds dependency, needs account setup. For MVP, direct storage works but is less secure. Prioritize before any real user data.

### Why stub _generated files
Can't run `convex codegen` without deployment. Stubs let TypeScript compile. Real types appear after `npx convex dev`.

### BubbleMenu API changed in TipTap 3.x
Had to import from `@tiptap/react/menus` instead of main export. `tippyOptions` removed, uses Floating UI now.

## Questions to resolve

- Spending threshold: warn only or hard block?
- Revision granularity: time-based auto-save vs explicit save button?
- Multi-model support: let users add custom OpenRouter models or curate list?
- Persona scope: per-user only or share between team members later?
