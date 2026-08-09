# WIP: Project categories and writing-tool catalogue foundation

This document defines the intended scope of the first PR in the writing-tools stack. The implementation remains work in progress until the regular-user POC has validated the catalogue requirements.

## Scope

- Add project categories, writing tools, category assignments, statuses, ordering, and tool versions.
- Add optional project-category selection with a General Writing fallback.
- Add server-enforced admin authorization.
- Add strict Convex validators, indexes, published catalogue queries, and admin mutations.
- Seed representative categories and the existing AI actions.

## Out of scope

- Tool execution.
- End-user discovery UI.
- Admin authoring UI.

## Data and migrations

This is pre-production development work. We may wipe all application and Convex data as needed. Backfills, compatibility migrations, and data-preserving migration code are intentionally out of scope because migration work would be pointless for this series.

## Completion checklist

- [ ] Schema and validators cover all catalogue variants.
- [ ] Only authorized admins can mutate catalogue data.
- [ ] Ordinary users can only read published definitions.
- [ ] Category assignments retain independent ordering.
- [ ] Existing uncategorized projects resolve to General Writing.
- [ ] Draft, archived, invalid-reference, and cross-user cases are tested.
- [ ] Type checking and the full test suite pass.
