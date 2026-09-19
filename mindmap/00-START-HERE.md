# Start Here — TidySense

## Product frame

TidySense turns an intention into a credible plan, supports execution through Today, and adapts through Reconcile. AI may propose and explain within bounded contracts; the user authorizes consequences; deterministic backend services validate and mutate canonical state.

```text
Plan → Execute → Adapt
```

## Canonical reading order

1. [[02-Decisions/accepted-decision-inventory-001-021]] — consolidated Discussions 001–026
2. [[04-Specs/ai-native-mvp-baseline]] — current scope and model
3. [[01-Closed-Discussions/023-persistent-planning-facts-and-rolling-execution-context]] through [[01-Closed-Discussions/026-backlog-removal-parent-owned-undated-tasks-and-quick-capture]] — latest product amendments
4. [[01-Closed-Discussions/022-updated-mvp-implementation-plan]] — consolidated implementation sequence/status
5. [[05-Implementation/backend-domain-package/README]] — canonical schema projection
6. [[../devmap/README]] and [[../devmap/decisions/README]] — development architecture and technical decisions

## Current canonical amendments

- `PlanningFact` persists approved planning constraints; AI generation uses the current rolling weekly context.
- Routines may have zero or more unique local wall-clock `timesOfDay`; timed occurrence identity includes the time slot.
- Tasks may form same-scope linear sequences through `sequenceId` and `sequenceOrder`.
- Backlog, `Task.placement`, `Task.reviewDate` and `Task.reviewDateSource` are removed.
- Parent-owned active Tasks may be undated; standalone active Tasks require `plannedDate`.
- Quick Capture creates `CaptureItem`, not a Task. Resolution creates a separate Task or Routine identity.
- Dedicated crisis UX, crisis routing and crisis-specific release gates are removed.

## Safety rules that remain

- AI never directly mutates canonical state or receives repository/command tools.
- Consequential changes require preview, user confirmation, current-version revalidation and deterministic transactional mutation.
- Imported/hostile content is data, not instruction; context is minimized and allowlisted.
- No diagnosis, hidden motivation/capacity inference, or inferred Goal achievement.
- Invalid or late AI output is unusable; failures are explicit; deterministic/manual paths remain available.
- Provider safety/moderation safeguards, authorization, privacy, rate/cost controls and observability remain normal architecture/readiness concerns. They do not create a dedicated crisis product flow.

## Implementation status

Implementation is **started but not canonically migrated**. Backend IAM/Project and frontend scaffolding exist. Their opaque sessions, integer IDs, unversioned routes, IPPanel adapter and permission-only Project access are prototype debt. No M1 or later gate is complete until its criteria are verified.

The next work is documentation-approved migration/implementation planning; this consolidation does not authorize product feature implementation by itself.
