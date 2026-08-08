# Next opportunities

The stabilization branch completed the Clerk migration, encrypted per-user BYOK storage, current dependency/toolchain upgrades, authenticated AI actions, provider-reported usage, safe document switching, serialized autosave, and structured selection replacement.

## Highest value

- Add OpenRouter OAuth PKCE so users can authorize a key without exposing the generated credential to browser JavaScript; keep paste-as-key as a fallback.
- Replace the static model picker with a curated catalog refreshed from OpenRouter metadata, including capability and price changes.
- Add revision comparison, pruning, and explicit save/recovery status to make long-form work feel durable.
- Code-split the editor, settings, history, and persona surfaces; the current production JavaScript chunk is still about 421 kB gzip.
- Define a strict recursive TipTap document validator instead of `v.any()` for document and revision content.

## Product upside

- Pass project, document, and selected persona context consistently into rewrites.
- Render a genuinely progressive streaming diff rather than waiting for a complete proposal.
- Add export to Markdown/DOCX, project search, and local crash-recovery drafts.
- Add model retry/fallback policy with sanitized provider errors and explicit cancellation state.

## Security and operations

- Consider moving key encryption to managed envelope-key infrastructure such as WorkOS Vault before broad production use; the current AES-GCM design is secure but makes master-key rotation and audit policy an application responsibility.
- Add CSP and session-replay redaction around the API-key input to reduce exposure while a user is typing.
- Add a key-version rotation job before changing `CREDENTIAL_ENCRYPTION_KEY`.
- Decide whether spending thresholds are warnings or hard server-side limits.

Collaboration, dark mode, drag-and-drop ordering, and an editor replacement are lower priority. TipTap, Convex, React, and Vite remain good fits for the product.
