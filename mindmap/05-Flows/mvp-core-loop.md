# AI-Native MVP Core Loop

## Status

`REWRITTEN — CURRENT FLOW PROJECTION`

```mermaid
flowchart LR
  A[Real intention] --> B{Entry path}
  B -->|Manual| C[Manual canonical command]
  B -->|AI-assisted| D[Bounded Planning conversation]
  D --> E{Output gates pass?}
  E -->|No| F[Visible failure or manual continuation]
  E -->|Yes| G[Reviewable PlanningDraft]
  G --> H[Edit and server preview]
  C --> H
  H --> I{Explicit confirmation valid?}
  I -->|No, stale, or cancelled| H
  I -->|Yes| J[Commit-time revalidation]
  J --> K[Atomic deterministic mutation + outbox]
  K --> L[CommandResult]
  L --> M[Today execution]
  M --> N[Deterministic Reconcile facts and lanes]
  N --> O{Optional rule-gated AI?}
  O -->|No| P[Manual deterministic adaptation]
  O -->|Yes| Q[Bounded explanation/recommendation]
  Q --> R[Preview + explicit confirmation]
  P --> R
  R --> J
  N -->|Skip| M
  E -->|Crisis| S[Fixed localized fallback; zero proposal/mutation leakage]
```

## Invariants

- AI output is never permission or canonical state.
- Today never blocks on Reconcile.
- Invalid/partial output creates no reviewable resource.
- Manual and deterministic paths remain available.
- Every consequence is previewed, confirmed, revalidated, committed atomically, and evidenced.

Authority: [[04-Specs/ai-native-mvp-baseline]] and Discussions 010–020B.
