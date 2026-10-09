# Step 11 Evidence and Operational Hardening Acceptance Contract

**Status:** Implemented and verified on 2026-10-08 with automated tests and one recorded drill run on an isolated database. This contract covers operator access, the pilot metric dictionary, retention and maintenance, account erasure, alerts, the operator page, runbooks and drills. It does not declare pilot readiness; that is STEP-12.

## Canonical behavior

### Operator access

1. An operator is an account whose phone number is listed in `Operations:OperatorPhones`. The list is configuration supplied outside tracked files. `CurrentUserDto.isOperator` tells the client.
2. `GET /api/v1/operations/metrics`, `/ai` and `/health` answer an operator. Anyone else signed in gets `404`, the answer for a resource that is not theirs; without a session the answer is `401`.
3. Every response is an aggregate. None contains a user id, a phone number, a title or other user text, or a context manifest. The endpoints are read-only.

### Metrics

4. The metric dictionary is `PilotMetricCatalog`: one versioned SQL definition per metric, returning `(segment, numerator, denominator)` for a window and a population. Definitions are described in `operations/metric-dictionary.md`.
5. Accounts in `OperatorPhones` or `InternalPhones` are computed apart and never enter a primary row.
6. Acceptance and application are separate rows; "applied" is read only from a linked `CommandResult` with status `SUCCEEDED`.
7. Required metrics that need a research instrument are returned as `external` with what they need, never as a number.
8. No threshold exists in the product.
8a. The first time on a local date that Reconcile is eligible when an account reads its overview, one `ReconcileExposures` row (R2) is stored with the severity band; reading again that day stores nothing. It is what `H2.ELIGIBLE_START_RATE` counts, and it is not a domain event: nothing was decided.

### Retention and maintenance

9. Every persisted record type has one class in `RetentionCatalog`. A type without one fails the test suite.
10. A maintenance run fails explanations and planning attempts whose process was lost, expires drafts past their expiry, then purges in one transaction: R4 after 90 days (AI invocations, finished and expired idempotency records, outbox rows, OTP challenges, maintenance records), R3 30 days after a draft ended (draft, revisions, its confirmations, then attempts nothing refers to), R2 180 days after a session closed (session, facts, rule matches, explanations, recommendations, its confirmations; prompts by local date; exposures). Each statement removes at most `Retention:BatchSize` rows (5,000), oldest first; the rest waits for the next run.
11. R1 events and command results, planning details and canonical work are never purged. A reviewable draft, an open session and an unfinished idempotency record are never purged.
12. Each run writes one `OperationsRecords` row with counts. The hosted service runs 30 seconds after start and hourly; a failed run is recorded as `FAILED`. `run-maintenance` runs it once from the command line.

### Erasure

13. `erase-user` deletes, in one transaction, the account and everything it owns except R1 events and command results; on those the user id becomes a new tombstone id. Registered event payloads hold codes and counts only, so nothing the user wrote remains.
14. The erasure record names the operator, a reason code and the tombstone. It never holds the account id or phone number. Free-text reasons are refused.
15. Erasing an unknown account changes nothing and reports it.

### Alerts

16. Alert rules are pure (`OperationsAlertRules`) and are evaluated on every read of `/health` and after every maintenance run, where each active alert is logged as `OPS_ALERT`. Rules, thresholds and responses are in `operations/runbooks.md`.
17. A rate is evaluated only over at least `MinimumSample` provider calls in the last hour. A family on the sample provider has no budget alert.

### Operator page

18. `/operations` exists only for an operator; anyone else sees the not-found state and no request is made. The navigation entry is shown to operators only and has no tab.
19. The page shows alerts and maintenance state, the AI runtime per family, and each metric as numerator and denominator columns. Internal accounts are in a separate, collapsed block.

## Configuration

`Operations:OperatorPhones[]`, `Operations:InternalPhones[]`, `Operations:Retention { Enabled, R4Days, R3DaysAfterExpiry, R2DaysAfterClose, BatchSize }`, `Operations:Alerts { BudgetWarningPercent, RejectionRatePercent, FailureRatePercent, MinimumSample, MaintenanceMissingHours }`.

## Recorded deviations and assumptions

Decided with the owner on 2026-10-08 unless marked otherwise.

- **Dashboards are an in-app operator page.** No external monitoring stack is introduced (`DEC-011`).
- **Operator identity is a configured phone list**, not a role in the database. *(Chosen during implementation.)*
- **Retention durations are provisional** (90 / 30 / 180 days) pending legal and security review.
- **Kill switches stay configuration.** The audit line records scope, value and time; the person is recorded in the incident or drill record, not by the application.
- **Erasure is an operator command.** There is no user-facing deletion.
- **`ActionConfirmation` is purged as R2** with its session or draft, although 019C §20 lists it as R1. The durable decision evidence is the R1 event and command result. `ReconcileExplanation` rows carry the stored label `R3` and are purged with their R2 session. *(Chosen during implementation; not yet reviewed.)*
- **No outbox publisher.** No consumer exists; metrics read the R1 events directly. Outbox rows stay `PENDING` and are purged as R4. A later publisher would have to start from the events.
- **The query window is "last N days"** (`days`, 1–366), not arbitrary dates. *(Chosen during implementation.)*
- **Metric definitions are shown in English** on the otherwise Persian page: they are the dictionary's own text. *(Chosen during implementation.)*
- **`H1.NON_TRIVIAL_PLAN` is classifier v0** and `H1.REVERSAL_7D` uses a seven-day window; both are proposals for the Research owner.
- **`auth-e2e.ps1` makes the development test account an operator**, so that account's activity is "internal" in the browser-test database.
- **Idempotency records are purged only when finished, expired and older than the R4 window.** *(Chosen during implementation.)*
- **An exposure is an overview read, not a screen view.** The client reads the overview on every page for the navigation badge, so "exposed" means the account used the application on a day Reconcile was eligible; whether the offer was looked at is not known. *(Chosen during the follow-up of 2026-10-08.)*
- **Tracked token prices are the DeepSeek prices recorded in STEP-09** (0.3 / 1.2 USD per million tokens), so the daily budget is meaningful without local overrides. They must be changed when the provider or its prices change.

## Verification evidence

Environment for everything below: Windows 11, .NET SDK 10.0.401, Node 22.20.0, local PostgreSQL 18, AI providers `mock` (deterministic samples) except where a test scripts the HTTP transport.

| Test family (coverage matrix) | Suite | Last result 2026-10-08 |
|---|---|---|
| pilot evidence: numerator/denominator reproduction, stage separation, exclusions, severity segmentation, edited vs unchanged, manual escape | [`OperationsMetricsTests`](../backend.Tests/OperationsMetricsTests.cs) | passed |
| retention/deletion/restricted access | [`OperationsRetentionTests`](../backend.Tests/OperationsRetentionTests.cs), [`OperationsApiTests`](../backend.Tests/OperationsApiTests.cs) | passed |
| logs/traces/alerts | [`OperationsApiTests`](../backend.Tests/OperationsApiTests.cs) (alert thresholds, kill-switch alert, kill-switch audit line) | passed |
| database constraints/migrations/rollback | [`DeliveryMigrationTests`](../backend.Tests/DeliveryMigrationTests.cs) (STEP-11 round trip), drill 4 | passed |
| rollback/kill-switch/drill | [`ops-drill.ps1`](../ops-drill.ps1) | passed, record below |
| frontend states | [`OperationsPage.test.tsx`](../frontend/src/features/operations/components/OperationsPage.test.tsx) | passed |
| end-to-end slice, responsive | [`operations.spec.ts`](../frontend/e2e/operations.spec.ts) | passed |

- [Metrics tests](../backend.Tests/OperationsMetricsTests.cs): one fixed fixture (two primary accounts, one internal) reproduces every catalog metric exactly; a later attempt of a flow is not a second flow; a conflicted apply is not an applied plan; accepted-and-conflicted is not applied; bands are separate; the internal account is in no primary row; a second computation is identical; an empty window gives `0 / 0` or no row; every definition states its unit, numerator, denominator, window and missing-data rule.
- [Retention tests](../backend.Tests/OperationsRetentionTests.cs): the catalog equals the EF model; each class is purged just past its boundary and kept just inside it; unfinished, reviewable and open records stay; lost work is failed; R1 rows survive; a second run does nothing; erasure through real API-created data leaves no table referring to the account, keeps every event and result under the tombstone, records operator and reason without the account, refuses a free-text reason and leaves another account intact.
- [API tests](../backend.Tests/OperationsApiTests.cs): `401`/`404`/`200` by caller on all three endpoints; no id, phone, title or manifest in any response; a real open-session command feeds the availability metric; kill switches as alerts; each alert rule at and below its threshold; the kill-switch audit line on change, on repeat and at start.
- Follow-up tests (same day): a purge bounded to two rows per statement removes the oldest first and continues on the next run; an eligible overview read twice in a day stores one exposure, which erasure removes; `H2.ELIGIBLE_START_RATE` is reproduced from the fixture; the exposure's one-per-day index is in the STEP-11 migration round trip; the page shows no negative number for maintenance that never ran.
- [Keyboard acceptance](../frontend/e2e/keyboard.spec.ts): with no pointer after load, a destination is opened from the sidebar, the create sheet takes and traps focus, Escape returns focus to its opener, a Task is created with a date chosen in the calendar, completed from Today, and a focused link shows a focus indicator. It covers the manual Task flow on desktop only.
- Dependency audit, 2026-10-08: `dotnet list package --vulnerable --include-transitive` reported no vulnerable package for the backend and the test project (source `api.nuget.org`). `npm audit` reported one high-severity advisory in the build-time transitive package `source-map-js` (GHSA-68fv-2mgg-jv7q, through Tailwind, PostCSS and jsdom; not shipped to the browser); `npm audit fix` updated it in `package-lock.json` and the audit then reported none.
- Full regression after the follow-up: `./dev.ps1 check` passed with 215 backend tests (2 skipped: the two real-provider smokes) and 61 frontend tests plus typecheck, lint, build and OpenAPI generation; `./auth-e2e.ps1` passed all 14 Chrome scenarios on an isolated PostgreSQL database; EF reported no pending model changes. The operator page screenshot (desktop) was inspected before the follow-up.

### Drill record

`./ops-drill.ps1`, operator `Lenovo`, reason `DRILL`, isolated database and backend, sample AI providers. Run twice on 2026-10-08: 14:02Z (global switch only) and, after the script was extended, 15:54Z–15:55Z. All assertions passed both times; the figures below are from the first run unless marked.

1. **Kill switch.** An attempt was accepted (`202`). `Ai:GlobalKillSwitch` was set in the running backend's settings file at 14:02:11Z: planning answered `503 PLANNING_AI_UNAVAILABLE`; a Reconcile session opened and reported `DISABLED`; a Task was created by hand; the operator view raised `AI_KILL_SWITCH_ACTIVE`; the log held `AI_KILL_SWITCH_CHANGED. Scope: GLOBAL, Active: True`. Switched off at 14:02:12Z: an attempt was accepted again and the `Active: False` line was logged. *Second run (15:54:51Z–15:54:56Z), additionally:* the planning switch alone refused planning (`503`) and left the Reconcile AI layer enabled; the Reconcile switch alone disabled that layer, left planning accepting attempts, and was the only scope the operator view named; the `deepseek` provider switch produced its audit lines on and off (no provider call exists to refuse on the sample providers); no kill-switch alert remained afterwards.
2. **Maintenance.** `run-maintenance` returned zero for every count (nothing was due) and the operator view showed the run as succeeded with no maintenance alert.
3. **Backup and restore.** `pg_dump` (custom format) restored into a new database with identical counts: `__EFMigrationsHistory=13 Users=1 Tasks=2 ReconcileSessions=1 PlanningAttempts=2 DomainEvents=6 CommandResults=3 OperationsRecords=1`. A backend started on the copy became ready, accepted the existing session and returned the seeded Task.
4. **Rollback.** On the copy, `database update 20261008130508_Step10RecommendationEvidence` removed `OperationsRecords` and kept both Tasks; `database update` restored the table and kept both Tasks.
5. **Erasure.** `erase-user --phone … --operator Lenovo --reason DRILL` deleted 1 user, 2 Tasks, 1 Reconcile session, 2 drafts, 2 attempts and 3 idempotency records and tombstoned 6 events and 3 command results. Afterwards: no `Users` row, no Task, all 6 events under the tombstone, one erasure record with operator and reason and without the phone number, and the old session refused with `401`.

## Not covered by this evidence

- **No manual operator check on the development database.** The page was exercised only by automated tests and one screenshot; nobody compared a figure on it with the same query run by hand, and it was never opened with real provider data.
- **Alerts reach nobody.** They appear on the page and in the log. There is no paging, e-mail or external monitor, no dashboard outside the application, no CI and no deployment (`DEC-011`).
- **Everything was rehearsed on one developer machine.** No drill ran against a staging or production topology, a managed secret store, a real backup schedule or a multi-instance deployment. Circuit state, the spend latch and the concurrency limit are still per process.
- **Kill switches were drilled through a reloading settings file only.** A switch supplied as an environment variable needs a restart. The provider switch was drilled for its audit line only; refusing a call to a disabled provider is covered by the scripted-provider tests.
- **Retention durations, and treating confirmations as R2, are not reviewed** by legal or Security/Privacy. Purge was never run on a large table: batching is tested with a batch of two, and one run still holds all its statements in one transaction.
- **Erasure does not reach backups or logs.** Structured log lines contain user and entity ids; their retention is whatever the log sink does.
- **Access to the database itself is not controlled by this step.** The 019C access classes (engineering, analytics, restricted) have no roles, views or access log; the operator page is the only enforced boundary.
- **The metric dictionary is a draft.** No Research review, no threshold, cohort or window; five required metrics have no instrument. The freeze-register rows remain `DRAFT`.
- **Real provider:** failure paths were never exercised against it, and the Reconcile env-gated smoke test was still not run (the owner must run it; the key is not read from user-secrets).
- **Accessibility:** role-based automated tests, a phone no-horizontal-scroll check and one keyboard pass over the manual Task flow on desktop. Planning, Reconcile, Routines and the phone layout have no keyboard test, and nothing was checked with a screen reader.
- **No security review** was performed beyond the automated authorization and non-disclosure tests and one dependency audit; the audit is not repeated automatically.
