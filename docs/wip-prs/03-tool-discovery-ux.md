# WIP: Category selection and discoverable writing-tools UX

This document defines the intended scope of the third PR in the writing-tools stack. It remains work in progress until the regular-user POC has validated discoverability, desktop behavior, and mobile behavior.

## Scope

- Add category selection during project creation and in project settings.
- Add a searchable, stage-grouped tool launcher.
- Add deterministic contextual recommendations.
- Add tool details covering purpose, timing, required input, output, and draft impact.
- Explain disabled tools and the action required to enable them.
- Replace hard-coded selection actions with catalogue-driven shortcuts.
- Support responsive desktop panels and mobile full-height sheets.
- Add onboarding, empty states, keyboard navigation, and accessible focus behavior.

## Out of scope

- Admin authoring.
- New executor types beyond the typed runtime PR.
- Personalized or model-driven recommendations.

## Data and migrations

This is pre-production development work. We may wipe all application and Convex data as needed. Backfills, compatibility migrations, and data-preserving migration code are intentionally out of scope because migration work would be pointless for this series.

## Completion checklist

- [ ] Category choice is understandable and reversible.
- [ ] Changing category never deletes writing or prior results.
- [ ] Tools can be found by stage, search, and context.
- [ ] Tool cards clearly explain what happens before launch.
- [ ] Selection tools remain quickly accessible in the editor.
- [ ] Full-monitor and phone layouts are functionally complete.
- [ ] Keyboard, focus, screen-reader labels, and touch targets are tested.
- [ ] Category, discovery, launch, and apply E2E flows pass.
- [ ] Type checking and the full test suite pass.
