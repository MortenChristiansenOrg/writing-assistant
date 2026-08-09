# WIP: Typed writing-tool runtime and legacy AI migration

This document defines the intended scope of the second PR in the writing-tools stack. It depends on the catalogue foundation and remains work in progress until the regular-user POC has validated the runtime contracts.

## Scope

- Add discriminated executor, scope, result, and apply contracts.
- Implement the initial `transform` and `review` executors.
- Keep prompts and authoritative configuration server-side.
- Validate project/category compatibility and document ownership.
- Centralize provider calls, limits, usage accounting, and errors.
- Migrate existing rewrite and review actions to catalogue tool IDs.
- Reuse the existing diff and review-note interfaces.

## Out of scope

- New catalogue or discovery UX.
- Arbitrary executable tools or database-defined result schemas.
- Options, guided sessions, canvas, audio, or multi-character simulation.

## Data and migrations

This is pre-production development work. We may wipe all application and Convex data as needed. Backfills, compatibility migrations, and data-preserving migration code are intentionally out of scope because migration work would be pointless for this series.

## Completion checklist

- [ ] The client cannot supply an authoritative prompt.
- [ ] Unpublished, unknown, or incompatible tools are rejected.
- [ ] Project and document ownership are enforced.
- [ ] Tool outputs are validated before reaching the client.
- [ ] Existing AI interactions behave as before.
- [ ] Provider, spending-limit, and malformed-output failures are tested.
- [ ] Tool ID and version are retained for provenance.
- [ ] Type checking and the full test suite pass.
