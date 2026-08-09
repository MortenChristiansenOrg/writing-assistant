# WIP: Project categories and writing-tool catalogue foundation

This document defines the intended scope of the first PR in the writing-tools stack. The implementation remains work in progress until the regular-user POC has validated the catalogue requirements.

## Scope

- Add project categories, writing tools, category assignments, statuses, ordering, and tool versions.
- Require every project to select a published category after resetting development data.
- Add server-enforced admin authorization.
- Add strict Convex validators, indexes, published catalogue queries, and admin mutations.
- Add an idempotent setup seed for representative categories and the existing AI actions.

## Out of scope

- Tool execution.
- End-user discovery UI.
- Admin authoring UI.

## Data and migrations

This is pre-production development work. We may wipe all application and Convex data as needed. The new schema may assume a clean reset and require project categories immediately. Backfills, compatibility fallbacks, dual reads, and data-preserving migration code are intentionally out of scope because migration work would be pointless for this series. The catalogue seed is application setup, not a migration.

## Completion checklist

- [ ] Schema and validators cover all catalogue variants.
- [ ] Only authorized admins can mutate catalogue data.
- [ ] Ordinary users can only read published definitions.
- [ ] Category assignments retain independent ordering.
- [ ] Project creation requires a valid published category.
- [ ] Clean setup seeds categories and tools idempotently.
- [ ] Draft, archived, invalid-reference, and cross-user cases are tested.
- [ ] Type checking and the full test suite pass.
