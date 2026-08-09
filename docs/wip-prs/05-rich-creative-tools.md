# WIP: Rich creative-tool interactions and initial activity pack

This document defines the intended scope of the fifth PR in the writing-tools stack. The regular-user POC must determine the final interaction and result contracts before this PR leaves WIP.

## Scope

- Add option-list, structured-input, guided-session, and scratchpad result patterns.
- Save runs and exact tool-version provenance.
- Support pin, reject, remix, compare, insert, replace, and partial acceptance where appropriate.
- Ensure no result changes the manuscript without explicit action.
- Include representative tools for alternate POV, subtext or emotion through action, dialogue voice review, scene goal-conflict-turn, what-if fan-out, character interview, and scene scaffolding.

## Out of scope

- Free-form custom React screens per tool.
- Canvas-based planning.
- Audio or table reads.
- Autonomous multi-character simulation.

## Data and migrations

This is pre-production development work. We may wipe all application and Convex data as needed. Backfills, compatibility migrations, and data-preserving migration code are intentionally out of scope because migration work would be pointless for this series.

## Completion checklist

- [ ] Every result variant has a strict shared validator and explicit renderer.
- [ ] Tools remain usable on full-monitor and phone layouts.
- [ ] Applying, partially applying, and dismissing results are unambiguous.
- [ ] Historical results can be reopened safely.
- [ ] Guided sessions survive navigation or clearly warn before loss.
- [ ] Loading, cancellation, retry, provider failure, and stale-selection states work.
- [ ] No AI result mutates the draft without explicit confirmation.
- [ ] Each interaction pattern has component and E2E coverage.
- [ ] Type checking and the full test suite pass.
