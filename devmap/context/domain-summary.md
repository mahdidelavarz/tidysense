# Domain Summary

- Goal/Project are user-owned parents with system-managed review-date snapshots.
- Task is Goal-owned, Project-owned or standalone; standalone active requires plannedDate, parent-owned may be undated. No Backlog/placement/Task review date. Optional sequenceId/order forms a same-scope hard linear dependency.
- Routine has local timezone/effective dates and zero or more unique timesOfDay. Occurrence identity is date+slot when timed and date when untimed.
- PlanningFact belongs to exactly one Goal or standalone Project and is separately user-approved.
- CaptureItem is unresolved input; resolution creates a separate Task/Routine identity.
- Today is a derived local-date view. Reconcile groups Project → Sequence → Task and keeps Capture separate from execution severity.
- AI output is non-canonical; preview, confirmation, current validation and atomic deterministic application are required.

## Related Mind Map

- [AI-native MVP baseline](../../mindmap/04-Specs/ai-native-mvp-baseline.md) — canonical concise domain projection.
- [Canonical data model and invariants](../../mindmap/01-Closed-Discussions/019a-canonical-data-model-and-invariants.md) — detailed ownership and lifecycle authority.
