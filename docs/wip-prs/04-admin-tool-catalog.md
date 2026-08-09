# WIP: Admin catalogue authoring and publishing

This document defines the intended scope of the fourth PR in the writing-tools stack. It remains work in progress until the regular-user POC has confirmed which fields and contracts the administrator must configure.

## Scope

- Add category and tool authoring.
- Add assignment, ordering, featured-tool, and archive controls.
- Render definition forms from the supported executor variants.
- Add draft, validation, preview-as-user, publish, version, and archive workflows.
- Prevent destructive deletion of referenced definitions.
- Enforce authorization in Convex mutations independently of route visibility.

## Out of scope

- Uploading JavaScript or arbitrary executable plugins.
- Defining new executor or result-schema types through the UI.
- Regular-user creative workflows.

## Data and migrations

This is pre-production development work. We may wipe all application and Convex data as needed. Backfills, compatibility migrations, and data-preserving migration code are intentionally out of scope because migration work would be pointless for this series.

## Completion checklist

- [ ] Non-admin users cannot access admin mutations.
- [ ] Invalid definitions cannot be published.
- [ ] Draft content never appears in the user catalogue.
- [ ] Preview accurately reflects the regular-user experience.
- [ ] Publishing creates an auditable tool version.
- [ ] Archiving does not break projects or historical runs.
- [ ] Ordering and assignments update correctly.
- [ ] Authorization and publishing E2E tests pass.
- [ ] Type checking and the full test suite pass.
