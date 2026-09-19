# Start Here — AI-Native MVP Reconciliation

## Current state

The old Reconcile-first Phase 1 MVP and its implementation-ready framing are deprecated.

The accepted AI-native direction, repository documentation migration, and final Discussion 022 resolution are complete. M1–M8 are authoritative for implementation planning. Implementation execution remains blocked until the applicable M1 owner and configuration review gates pass.

```txt
Accepted product decisions       Closed Discussions 010–021
Legacy compatibility decisions  001–008 surviving-decisions record
Decision index                   Complete
AI-native MVP baseline           Complete
Mind Map                         Migrated and verified
Discussion 022                   Closed
Implementation plan              M1–M8 authoritative for planning
M0 source-of-truth freeze        Complete
M1 execution authorization       Pending owner and configuration approval
```

## Required reading order

### Orientation

1. [[02-Decisions/accepted-decision-inventory-001-021]] — authoritative discussion index, decision IDs, ownership boundaries, and conflict resolutions
2. [[04-Specs/ai-native-mvp-baseline]] — MVP-required, pilot-required, post-pilot, removed, and unresolved scope
3. [[01-Closed-Discussions/022-updated-mvp-implementation-plan]] — final migration, implementation-planning, and readiness resolution

### Mind Map migration

4. [[00-Canvas/Planner-Mindmap-Migration-Ledger]] — prepared migration operations and traceability
5. [[00-Canvas/Planner-Mindmap.canvas]] — migrated and verified AI-native visual projection
6. [[02-Decisions/repository-artifact-migration-ledger]] — classifications, required reviewers, migration gates, and unresolved-configuration ownership for the rest of the vault
7. [[05-Implementation/implementation-reuse-and-supersession-matrix]] — retained technical foundations, superseded behavior, and new implementation work
8. [[05-Implementation/workstream-i-approval-package]] — dependency, milestone, ownership, freeze, test, scope-cut, and risk approval package
9. [[05-Implementation/workstream-j-approval-package]] — pilot/release readiness criteria and hard-gate structure; no readiness claim
10. [[05-Implementation/m1-entry-package]] — named ownership, repository boundary, and M1 entry sequence
11. [[05-Implementation/m1-configuration-register]] — confirmed Kavenegar choice and proposed stack/auth values requiring review

### Detailed behavior

Read the relevant authoritative closed discussion directly. Use the accepted-decision inventory to find the owner of each subject:

- product direction and scope: Discussions 010–011;
- product and temporal models: Discussions 012–012A;
- AI Planning flow and output: Discussions 013–014A;
- Today, Task, and Routine execution: Discussions 015–015B;
- deterministic and AI-assisted Reconcile: Discussions 016–017A;
- authority, reversibility, privacy, hostile input, and crisis safety: Discussions 018–018A;
- canonical persistence, transactions, events, and retention: Discussions 019A–019C;
- runtime, API/frontend state, structured output, reliability, and cost: Discussions 020A–020C;
- validation, metrics, and decision gates: Discussion 021.

For narrowly retained authentication, API, research, development, and pilot-operation compatibility decisions, read [[01-Closed-Discussions/001-008-legacy-surviving-decisions]]. Do not reconstruct legacy authority from deleted discussions or old artifacts.

## Product invariant

The MVP must preserve the complete loop:

```txt
Plan → Execute → Adapt
```

The minimum interpretation is:

1. a user can manually plan or enter a bounded AI Planning flow;
2. AI output becomes a validated, reviewable proposal—not canonical state;
3. the user reviews and confirms visible consequences;
4. deterministic services revalidate and commit the command;
5. Today supports execution and records reality;
6. deterministic Reconcile derives facts and severity;
7. optional bounded AI may explain or organize permitted recommendations;
8. adaptation requires preview, confirmation, deterministic mutation, and events.

Manual escape, confirmation boundaries, crisis fail-closed behavior, access control, idempotency, events, observability, and pilot evidence are cross-cutting requirements rather than later cleanup.

## Historical and redirect artifacts

The following paths now contain explicit redirects, archive markers, or rewritten projections. Their historical Git versions remain non-authoritative:

- [[02-Decisions/ADR-001-reconcile-on-open]]
- [[02-Decisions/ADR-002-phase-1-technical-foundation]]
- [[02-Decisions/ADR-003-phase-0-closure]]
- [[05-Implementation/phase-1-plan]]
- [[05-Flows/mvp-core-loop]]
- redirect/archive specifications under `04-Specs/`
- pre-migration Canvas versions retained in Git history

Follow each current file's status block. Reusable code or design does not reactivate deprecated product behavior.

## Next authorized documentation step

The Mind Map, repository migration, M0 freeze, reuse classification, Workstream I planning package, Workstream J checklist structures, and final Discussion 022 resolution are complete. M1–M8 are authoritative for implementation planning. M1 names are instantiated and its configuration package is ready for owner review; contracts still lock at their recorded gates. Pilot and release remain `NOT_READY`.

Next: review [[05-Implementation/m1-entry-package]] and [[05-Implementation/m1-configuration-register]]. After Reza and Mahdi acknowledge the package and all M1 parameters are approved, scaffold implementation inside this repository and begin the authenticated ownership slice.

## Change rule

Use the accepted-decision inventory to identify the owning discussion before changing behavior.

- A documentation migration may clarify or project accepted decisions.
- It may not silently introduce new behavior.
- A genuine behavior change must reopen or explicitly amend the authoritative source discussion.