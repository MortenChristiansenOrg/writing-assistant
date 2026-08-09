# Writing tools UX POC

This branch validates the regular-writer experience for category-aware, extensible writing tools. It intentionally does not implement catalogue administration, production AI execution, durable tool runs, or data migrations.

## Open the evaluation route

Run the existing development server and open `/prototype/tools`. The route is registered only when `import.meta.env.DEV` is true. It uses the real TipTap editor and writing-tool surfaces without Clerk, Convex writes, or an AI provider key.

## Interaction contracts represented

- Alternate point of view: captured selection, non-destructive transform preview, explicit replacement, and stale-selection refusal.
- Dialogue audit: selection-or-document input and structured read-only review notes.
- What-if paths: structured options with pin, dismiss, remix, and move-to-scratchpad actions.
- Scene blueprint: required guided fields producing an editable scratchpad and explicit append.
- Continue from here: captured cursor input, editable scratchpad, and explicit insertion.

Categories and the catalogue are static in this POC. Project category choice is stored in local storage so project creation and settings can be evaluated without introducing a temporary backend schema. The production catalogue and required `projects.categoryId` belong to the WIP PR stack; pre-production data may be wiped, so no migrations or compatibility layer should be added.

## Browser findings applied

- A persistent labelled Tools button is necessary because selection-only shortcuts are not discoverable.
- Tool details must state Helps with, Best time, Needs, Produces, and Draft impact before launch.
- Disabled tools remain visible and explain the action needed to enable them.
- Desktop uses a 448px non-modal rail so the manuscript remains visible and editable; apply rejects stale captured context.
- Phone uses a modal full-viewport sheet with one scroll owner, no horizontal overflow, safe-area padding, and 44px minimum controls.
- Result variants are separate renderers rather than one boolean-driven component.
- Guided fields are executor parameters, not a distinct AI executor contract.

The collaborative browser pass covered 1440×900 and 390×844 viewports, including catalog discovery, option-to-scratchpad-to-append, selection shortcut discovery, editing while the rail is open, stale-apply refusal, guided fields, scrolling, and touch-target measurements.
