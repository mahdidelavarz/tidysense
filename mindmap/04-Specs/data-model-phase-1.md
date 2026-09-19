# Phase 1 Data Model — Legacy Redirect

## Status

`SUPERSEDED — DO NOT IMPLEMENT`

The former Goal/Task-only persistence model and its event assumptions are incompatible with the accepted AI-native MVP.

Current canonical model authority:

- [[01-Closed-Discussions/012-core-product-model]]
- [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]
- [[01-Closed-Discussions/015-task-and-routine-execution-model]]
- [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]
- [[01-Closed-Discussions/015b-routine-local-date-and-daily-occurrence-amendment]]
- [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]]
- [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]]
- [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]

Canonical work entities are Goal, Project, Task, Routine and RoutineOccurrence; durable supporting records include PlanningFact and CaptureItem, and Task sequences are metadata. There is no Plan or Backlog. Use Discussions 019A and 023–026 plus the backend domain package for implementation detail. Historical content remains in Git history.
