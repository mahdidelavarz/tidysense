# Adaptive Planner Mind Map

This Obsidian vault contains the product decisions, architecture, research, migration records, and implementation planning for Adaptive Planner.

The former Reconcile-first Phase 1 MVP is deprecated. The accepted product direction is now the AI-native MVP defined by the closed Discussions 010–021 and reconciled through Discussion 022.

Start with:

1. [[00-START-HERE]]
2. [[02-Decisions/accepted-decision-inventory-001-021]]
3. [[04-Specs/ai-native-mvp-baseline]]
4. [[01-Closed-Discussions/022-updated-mvp-implementation-plan]]
5. [[00-Canvas/Planner-Mindmap-Migration-Ledger]]
6. [[02-Decisions/repository-artifact-migration-ledger]]
7. [[05-Implementation/implementation-reuse-and-supersession-matrix]]
8. [[05-Implementation/workstream-i-approval-package]]
9. [[05-Implementation/workstream-j-approval-package]]
10. [[05-Implementation/m1-entry-package]]
11. [[05-Implementation/m1-configuration-register]]

## Current state

```txt
Legacy decision reconciliation                 COMPLETE
Accepted-decision inventory                    COMPLETE
AI-native MVP baseline                         COMPLETE
Mind Map migration ledger                      APPROVED AND APPLIED
Repository Mind Map migration                  APPLIED AND VERIFIED
Cross-role Mind Map verification               COMPLETE
M0 source-of-truth freeze                      COMPLETE
Workstream I implementation planning package   APPROVED
Workstream J readiness checklist structures    APPROVED; PILOT/RELEASE NOT READY
Implementation planning authority              M1–M8 ACTIVE; M9 NOT PASSED
Final Discussion 022 resolution                PUBLISHED
M1 entry/configuration package                 READY FOR OWNER REVIEW
M1 execution authorization                     PENDING OWNER AND CONFIGURATION APPROVAL
```

The current [[00-Canvas/Planner-Mindmap.canvas]] has been migrated to the accepted AI-native baseline and passed structural and cross-role verification. It is now the verified visual projection described by the source-of-truth hierarchy.

## Current product frame

The AI-native MVP must demonstrate the complete loop:

```txt
Plan → Execute → Adapt
```

- Planning is the first-value engine.
- Today provides execution and reality evidence.
- deterministic Reconcile identifies and structures divergence.
- bounded AI may propose plans and explain permitted evidence.
- AI never owns authority or directly mutates canonical state.
- the user reviews and explicitly confirms consequential changes.
- deterministic application services revalidate and commit changes atomically.
- manual paths, safety boundaries, observability, and pilot evidence are required from the relevant first slice.

Detailed behavior belongs to the authoritative closed discussions and the accepted-decision inventory; this README is only an entry point.

## Source-of-truth hierarchy

Authority is topic-specific rather than a single universal ranking:

### Product and behavior semantics

1. authoritative closed Discussions 010–021 and their explicit ownership boundaries;
2. [[01-Closed-Discussions/001-008-legacy-surviving-decisions]] for narrowly retained compatibility decisions only.

### Migration, implementation planning, ownership, and readiness structure

1. [[01-Closed-Discussions/022-updated-mvp-implementation-plan]];
2. its approved implementation, ownership, freeze, risk, test, and readiness packages under `05-Implementation/`.

### Visual and formal projections

1. verified nodes in [[00-Canvas/Planner-Mindmap.canvas]] after migration and verification;
2. formal specifications and ADRs explicitly reconciled and adopted by Discussion 022;
3. older specifications, ADRs, implementation plans, flows, sketches, and Git history as non-normative evidence only.

Generated text, client state, stale map nodes, and legacy artifacts never outrank current canonical state or an accepted owning decision.

The consolidated index is [[02-Decisions/accepted-decision-inventory-001-021]]. The scope projection is [[04-Specs/ai-native-mvp-baseline]].

## Migration warning

Legacy implementation-facing artifacts have been migrated to current projections, explicit redirects, or archive markers. Historical content may still appear in Git history, and redirect files remain intentionally searchable so old links fail safely. In particular, do not recover behavior from:

- superseded ADR bodies in Git history;
- research-derived product claims;
- pre-migration specifications and flow versions in Git history;
- the old Phase 1 milestone plan;
- any pre-migration Canvas snapshot retained in Git history.

Current files must be read according to their status blocks. Redirect and archive markers are intentionally non-authoritative; rewritten projections remain subordinate to their accepted source decisions.

## Repository structure

- `00-Canvas/` — repository Mind Map and its migration ledger
- `01-Closed-Discussions/` — authoritative accepted product, domain, runtime, safety, validation, migration, and implementation-planning decisions
- `01-Open-Discussions/` — active unresolved work; currently empty
- `02-Decisions/` — accepted-decision inventory plus ADRs awaiting or carrying explicit reconciliation status
- Repository-wide artifact classifications and migration gates are tracked in [[02-Decisions/repository-artifact-migration-ledger]].
- `03-Research/` — non-authoritative evidence and research notes
- `04-Specs/` — current AI-native projections plus explicit legacy redirects/archive markers
- `05-Flows/` — current supporting flow projection
- `05-Implementation/` — implementation controls, approved milestone plan, readiness gates, and the reviewable M1 entry/configuration package
- `06-References/` — non-authoritative source notes and references

## Change rule

Do not silently change an accepted behavior while migrating documentation or implementing code. A behavior change must reopen or explicitly amend its authoritative source discussion. Migration documents project accepted decisions; they do not create new product semantics.