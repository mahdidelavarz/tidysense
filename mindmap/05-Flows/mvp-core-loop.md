# TidySense MVP Core Loop

Status: **Canonical flow projection**.

```mermaid
flowchart TD
  A[Intent or manual entry] --> B{AI planning wanted and available?}
  B -->|No| C[Entity-specific manual creation]
  B -->|Yes| D[Bounded conversation and approved PlanningFacts]
  D --> E[Validated editable PlanningDraft]
  E --> F[Server preview and explicit confirmation]
  C --> G[Deterministic validation and atomic commit]
  F --> G
  G --> H[Today: planned Tasks and due Routine slots]
  H --> I[Execution evidence]
  I --> J[Deterministic Reconcile facts and grouping]
  J --> K{Optional bounded AI explanation?}
  K -->|No| L[Manual review]
  K -->|Yes| M[Validated recommendations]
  L --> N[Preview and confirmation]
  M --> N
  N --> O[Atomic adaptation and events]
  O --> H
```

Failure or invalid AI output returns to a manual/deterministic path and never mutates state. CaptureItem resolution, Task sequence actions and all other consequential changes use the same preview/confirmation/revalidation boundary. There is no dedicated crisis branch.
