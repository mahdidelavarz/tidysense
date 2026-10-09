# Step 11 Evidence and Operational Hardening Acceptance Contract

**Status:** Implemented and verified on 2026-10-08 with automated tests and one recorded drill run on an isolated database; extended on 2026-10-09 to close the twelve gaps the first version left open (see "Gap closure of 2026-10-09"). This contract covers operator access, the pilot metric dictionary, retention and maintenance, account erasure, alerts and their delivery, the operator page, consent for the AI provider, the privacy notice, the in-app pilot questions, the pilot deployment definition, runbooks and drills. It does not declare pilot readiness; that is STEP-12.

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

16. Alert rules are pure (`OperationsAlertRules`) and are evaluated on every read of `/health` and after every maintenance run, where each active alert is logged as `OPS_ALERT` and stored in the run's record. Rules, thresholds and responses are in `operations/runbooks.md`.
17. A rate is evaluated only over at least `MinimumSample` provider calls in the last hour. A family on the sample provider has no budget alert.
17a. When `Operations:AlertDigest` is enabled, one e-mail is sent per UTC day from its hour: every alert the runs of the last 24 hours raised (how often, the last value, whether it is still active), alerts active now that no run saw yet, and the number of runs and failed runs. It is sent also when there is nothing to report. Each send is one `ALERT_DIGEST` record; a failed send is recorded, retried after an hour and raises `ALERT_DIGEST_FAILED` until a send succeeds. The message holds rule names and counts only.
17b. Outside Development and Testing the backend does not start without an enabled digest (`To`, `From`, `SmtpHost`) and without `Pilot:SupportContact`.

### Consent for the AI provider

17c. Consent is required exactly when planning is model-backed. `CurrentUserDto` carries `aiConsentRequired` and `aiConsentGranted`. Consent names one provider key and one notice version (`AiConsentPolicy.NoticeVersion`); a different provider or a changed notice is not consented to.
17d. `PUT /api/v1/users/me/ai-consent` grants or withdraws. Granting with a notice version other than the current one is `409 AI_CONSENT_NOTICE_CHANGED`; when no provider receives text it is `422 AI_CONSENT_NOT_REQUIRED`. Each decision is the R1 event `AI_CONSENT_CHANGED` (`granted`, `provider`, `noticeVersion`); the account row holds the current state.
17e. Without consent, starting a planning attempt is `403 AI_CONSENT_REQUIRED`: nothing is stored and no provider call is made. The check runs again where the text would leave, so an attempt queued before a withdrawal ends `FAILED` with `AI_CONSENT_REQUIRED` and no call. Manual creation is unaffected. The Reconcile explanation sends codes and counts only and is not gated.
17f. The Planning page shows the consent card in place of the intention form: the provider's name, that the text leaves the country, what is and is not sent, and the manual path. The privacy page shows the current state and withdraws after a confirmation.

### Privacy notice

17g. `GET /api/v1/pilot/notice` needs no session and returns what users are told, read from the running configuration: the notice version, the provider's display name (null when none receives text), the three retention durations, the erasure limit (`Pilot:ErasureCompletionDays`, 30) and the contact channel. `/privacy` renders it, signed in or not, and is linked from the login page and the account menu.

### Pilot questions

17h. `POST /api/v1/pilot/feedback` stores one answer (1 to 5) to `H1_USEFULNESS` about a planning draft the account applied, or to `H2_UNDERSTANDING` about a Reconcile session the account completed. Anything else is `404`; an unknown instrument or an answer off the scale is `400`; an instrument version other than the server's is `409 FEEDBACK_INSTRUMENT_CHANGED`. A second answer about the same subject changes nothing. A row is R2, holds no text and writes no event.
17i. The question is shown under the result right after applying a plan and on the closed-session screen right after the user ended a session, never on a later visit, and never blocks the next step. `H1.USEFULNESS_RESPONSE` and `H2.UNDERSTANDING_RESPONSE` report every answer and the unanswered subjects apart.

### Operator page

18. `/operations` exists only for an operator; anyone else sees the not-found state and no request is made. The navigation entry is shown to operators only and has no tab.
19. The page shows alerts and maintenance state, the AI runtime per family, and each metric as numerator and denominator columns. Internal accounts are in a separate, collapsed block.

## Configuration

`Operations:OperatorPhones[]`, `Operations:InternalPhones[]`, `Operations:Retention { Enabled, R4Days, R3DaysAfterExpiry, R2DaysAfterClose, BatchSize }`, `Operations:Alerts { BudgetWarningPercent, RejectionRatePercent, FailureRatePercent, MinimumSample, MaintenanceMissingHours }`, `Operations:AlertDigest { Enabled, HourUtc, To, From, SmtpHost, SmtpPort, SmtpUser, SmtpPassword, SmtpTls }`, `Pilot { SupportContact, ErasureCompletionDays }`, `Ai:Providers:<key>:DisplayName`. The deployment's variables are in `deploy/.env.example`.

## Recorded deviations and assumptions

Decided with the owner on 2026-10-08 unless marked otherwise. Entries marked 2026-10-09 are the owner's acceptance of the gap recommendations that day.

- **Dashboards are an in-app operator page.** No external monitoring stack is introduced. Alerts leave the application as a daily e-mail and through one external uptime check (ADR-007, 2026-10-09).
- **The pilot runs on one server under Docker Compose with a single backend instance** (`DEC-011` resolved by ADR-007, 2026-10-09). Per-process circuit, spend-latch, concurrency and queue state is therefore correct as it is, and is a constraint on the deployment.
- **No CI service.** The release gate is run by hand and recorded (2026-10-09).
- **Operator identity is a configured phone list**, not a role in the database. *(Chosen during implementation.)*
- **Retention durations are fixed for the pilot** at 90 / 30 / 180 days and stated in the privacy notice (2026-10-09). No legal review was held; the owner decided as the accountable person.
- **Logs and backups live 30 days, and users are told erasure is complete everywhere within 30 days** (2026-10-09). Neither is rewritten on erasure.
- **Without consent planning is refused, not served by the sample generator.** The recommendation offered either; refusing was chosen during implementation because a canned sample plan applied into a real account is worse than no plan and would enter the H1 metrics as if it were AI-assisted. *(Chosen during implementation, 2026-10-09; not yet reviewed.)*
- **Consent gates planning only.** The Reconcile explanation receives codes and counts, no user text; the notice says so. *(Chosen during implementation, 2026-10-09.)*
- **The pilot questions use a five-point scale and proposed Persian wording** (instrument version 1). The wording is not yet approved by the owner. *(Chosen during implementation, 2026-10-09.)*
- **The digest is sent by the backend through SMTP** (`System.Net.Mail`, no new dependency), not by a host job, so it is covered by tests and its failure is visible on the operator page. *(Chosen during implementation, 2026-10-09.)*
- **Database access for the pilot is the operator alone, through a read-only role, with a written access record.** Views, further roles and a database-side access log are deferred (2026-10-09).
- **Kill switches stay configuration.** The audit line records scope, value and time; the person is recorded in the incident or drill record, not by the application.
- **Erasure is an operator command.** There is no user-facing deletion for the pilot; the privacy notice names the contact channel (confirmed 2026-10-09).
- **`ActionConfirmation` is purged as R2** with its session or draft. 019C §20 was amended on 2026-10-09 to say so: the stored preview holds Task titles, so keeping it forever conflicts with erasure, and the decision survives as the R1 event and command result. `ReconcileExplanation` rows carry the stored label `R3` and are purged with their R2 session.
- **No outbox publisher.** No consumer exists; metrics read the R1 events directly. Outbox rows stay `PENDING` and are purged as R4. A later publisher would have to start from the events.
- **The query window is "last N days"** (`days`, 1–366), not arbitrary dates. *(Chosen during implementation.)*
- **Metric definitions are shown in English** on the otherwise Persian page: they are the dictionary's own text. *(Chosen during implementation.)*
- **`H1.NON_TRIVIAL_PLAN` is classifier v1** and `H1.REVERSAL_7D` uses a seven-day window; the owner accepted both as v1 on 2026-10-09. The dictionary is a lock candidate (catalog `2026-10-09.1`) and becomes `PILOT_LOCKED` with the owner's signature in the freeze register.
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

### Evidence of 2026-10-09 (gap closure)

- [Pilot readiness tests](../backend.Tests/PilotReadinessTests.cs), against a host whose planning generator is the model-backed one with a scripted HTTP transport: without consent an attempt is `403`, nothing is stored and the provider is not called; an outdated notice version is refused; after consent one call is made; the decision is an R1 event without identity; withdrawal refuses again; consent to one provider or notice does not cover another; erasure leaves the decisions under the tombstone as user and as aggregate; an attempt already queued is failed with `AI_CONSENT_REQUIRED` and no call. With the sample generator no consent is asked. The notice endpoint answers without a session with the configured values. A pilot answer is accepted once, only about the account's own applied plan or completed session, only for the current instrument version, and is counted by the two new metrics. The digest message is reproduced from fixed runs; the digest is sent once a day from its hour, a failed send is recorded, raised as an alert and retried after an hour; a disabled digest sends nothing. A production-profile host does not start without the contact channel or any required digest setting.
- Extended suites: the [metric fixture](../backend.Tests/OperationsMetricsTests.cs) reproduces `H1.USEFULNESS_RESPONSE` and `H2.UNDERSTANDING_RESPONSE` including unanswered subjects and the internal account apart; [retention](../backend.Tests/OperationsRetentionTests.cs) purges a pilot answer and a digest record at their boundaries and keeps an old erasure record; [migration](../backend.Tests/DeliveryMigrationTests.cs) `Step11PilotGaps` round-trips with its constraints (one answer per subject, the scale, the consent triple) and keeps accounts and maintenance records; the [alert rules](../backend.Tests/OperationsApiTests.cs) include the failed digest.
- Frontend: [Planning page](../frontend/src/features/planning/components/PlanningPage.test.tsx) (the consent card replaces the form, a changed notice is said, the manual path stays, the usefulness question is answered once), [Reconcile page](../frontend/src/features/reconcile/components/ReconcilePage.test.tsx) (the question only right after ending the session), [privacy page](../frontend/src/features/pilot/components/PrivacyPage.test.tsx) (configured numbers, provider, contact, withdrawal after confirmation, readable signed out).
- Browser: [privacy](../frontend/e2e/privacy.spec.ts) (from the login page signed out, from the account menu signed in, phone width), [consent card](../frontend/e2e/consent.spec.ts) (rendered in Chrome at phone width with the two driving reads answered as a real-provider backend would; the server rule is not exercised there), and the usefulness question answered in the [planning](../frontend/e2e/planning.spec.ts) scenario against the real backend.
- [Security review](quality/security-review-2026-10-09.md): twelve findings, four fixed in this change, two needing the owner (credentials in git history; the four-digit login code).
- Dependency audit, 2026-10-09: no vulnerable package for the backend and the test project; `npm audit` found 0 vulnerabilities.
- Deployment definition, built and run locally on 2026-10-09 (Docker Desktop 29.4, Windows; `deploy/docker-compose.local.yml` with `deploy/local.env`): both images build; from an empty database `migrate` applied all 15 migrations and exited 0 before the backend started; `/health/ready` answered `Healthy` through the proxy; HTTP redirected to HTTPS; HSTS, `nosniff`, frame denial and the content security policy were sent, and the application loaded in Chrome under that policy with no violation after one fix (Zod's `eval` probe is switched off at the entry, [`zod-config.ts`](../frontend/src/shared/lib/zod-config.ts)); sign-in with a code read inside the backend container, creating a Task and the operator view worked, a foreign `Origin` was refused with `403` and the development code endpoint answered `404` through the proxy; the daily digest arrived in the local mail catcher ("no alerts in the last 24 h", 3 runs); `backup once` wrote a dump; the read-only role read `Tasks`, was denied `OtpChallenges` and could not delete; `erase-user` tombstoned the account and its session was refused. In the Production profile the backend started, the development session endpoint and the OpenAPI document answered `404`, a foreign `Host` was refused with `400`, an OTP request with a placeholder SMS key answered `503`, and the image refused to start without `Pilot:SupportContact`. Compose itself rejects a missing required variable.
- Full regression on the final code, 2026-10-09: `./dev.ps1 check` passed with 227 backend tests (2 skipped: the two real-provider smokes) and 66 frontend tests plus typecheck, lint, build and OpenAPI generation; `./auth-e2e.ps1` passed all 16 Chrome scenarios on an isolated PostgreSQL database; `./ops-drill.ps1` passed (third run below).

### Drill record

`./ops-drill.ps1`, operator `Lenovo`, reason `DRILL`, isolated database and backend, sample AI providers. Run twice on 2026-10-08: 14:02Z (global switch only) and, after the script was extended, 15:54Z–15:55Z. All assertions passed both times; the figures below are from the first run unless marked. A third run on 2026-10-09, 09:10:49Z–09:11:22Z, on the schema with `Step11PilotGaps`, passed every assertion: 15 migrations in the history, the dump restored with identical counts (`Users=1 Tasks=2 ReconcileSessions=1 PlanningAttempts=3 DomainEvents=8 CommandResults=3 OperationsRecords=1`), rollback to the STEP-10 schema and forward again kept both Tasks, and erasure tombstoned 8 events and 3 command results.

1. **Kill switch.** An attempt was accepted (`202`). `Ai:GlobalKillSwitch` was set in the running backend's settings file at 14:02:11Z: planning answered `503 PLANNING_AI_UNAVAILABLE`; a Reconcile session opened and reported `DISABLED`; a Task was created by hand; the operator view raised `AI_KILL_SWITCH_ACTIVE`; the log held `AI_KILL_SWITCH_CHANGED. Scope: GLOBAL, Active: True`. Switched off at 14:02:12Z: an attempt was accepted again and the `Active: False` line was logged. *Second run (15:54:51Z–15:54:56Z), additionally:* the planning switch alone refused planning (`503`) and left the Reconcile AI layer enabled; the Reconcile switch alone disabled that layer, left planning accepting attempts, and was the only scope the operator view named; the `deepseek` provider switch produced its audit lines on and off (no provider call exists to refuse on the sample providers); no kill-switch alert remained afterwards.
2. **Maintenance.** `run-maintenance` returned zero for every count (nothing was due) and the operator view showed the run as succeeded with no maintenance alert.
3. **Backup and restore.** `pg_dump` (custom format) restored into a new database with identical counts: `__EFMigrationsHistory=13 Users=1 Tasks=2 ReconcileSessions=1 PlanningAttempts=2 DomainEvents=6 CommandResults=3 OperationsRecords=1`. A backend started on the copy became ready, accepted the existing session and returned the seeded Task.
4. **Rollback.** On the copy, `database update 20261008130508_Step10RecommendationEvidence` removed `OperationsRecords` and kept both Tasks; `database update` restored the table and kept both Tasks.
5. **Erasure.** `erase-user --phone … --operator Lenovo --reason DRILL` deleted 1 user, 2 Tasks, 1 Reconcile session, 2 drafts, 2 attempts and 3 idempotency records and tombstoned 6 events and 3 command results. Afterwards: no `Users` row, no Task, all 6 events under the tombstone, one erasure record with operator and reason and without the phone number, and the old session refused with `401`.

## Gap closure of 2026-10-09

The twelve gaps the first version of this contract left open, and where each stands. "Closed" means decided and, where code or a document was needed, done and verified as stated above. Nothing here declares pilot readiness.

| # | Gap | State | What was done | What is still owed |
|---|---|---|---|---|
| 1 | Alert delivery, CI, deployment | Decided, built and run locally, **not deployed** | ADR-007; `deploy/` (Compose, images, proxy, backup, env example, local override); daily digest built, tested and seen arriving locally; `migrate` command; [deployment procedure](operations/deployment.md) and [Docker guide](operations/docker-guide.md) | Deploy once on a server, create the uptime check, see the first digest arrive through a real mail server |
| 2 | Single or multiple instances | Closed | Single instance written down as a constraint in ADR-007, the deployment page and the Compose file | — |
| 3 | Retention durations | Closed | 90 / 30 / 180 kept; the privacy notice states them from the running configuration | A legal review was not held |
| 4 | Confirmations as R2 or R1 | Closed | Kept R2; 019C §20 amended | — |
| 5 | Erasure in backups and logs | Decided, **not observed** | 30-day limit for both (journal setting, backup container), stated in the notice and the erasure runbook | Set and observe both on the server |
| 6 | User-facing account deletion | Closed | Not for the pilot; contact channel is configuration the backend requires and the notice shows | The channel's value |
| 7 | Database access classes | Decided, **not applied** | Operator only; read-only role script; access record in runbook 8 | Create the role on the server; views and access log deferred |
| 8 | Metric dictionary lock | Prepared, **not signed** | Classifier v1 and the seven-day window accepted; catalog `2026-10-09.1`; register row prepared | The owner's signature before collection |
| 9 | Instruments for five metrics | Built and written, **not approved, not held** | Two in-app questions with their metrics; [research protocol](operations/pilot-research-protocol.md) for the moderated sessions | Approval of the wording; the sessions themselves |
| 10 | Freeze-register sign-offs | Prepared, **not signed** | Sign-off table with what to read per row | The owner's statement of roles and signatures |
| 11 | Security review and screen-reader pass | Review done; pass **not done** | [Security review](quality/security-review-2026-10-09.md); [screen-reader checklist](quality/screen-reader-pass.md) | Findings 1 and 2; a person with NVDA for about an hour |
| 12 | Consent and data location for the AI provider | Closed in code | Server-side consent gate, consent card, privacy page, R1 decision event | Approval of the consent wording; never shown against the real provider |

## Not covered by this evidence

- **Nothing is deployed.** The stack was built and exercised on a developer machine only. No server exists: no public certificate was issued, the journal limit was never set, the backup loop never ran for more than minutes, no real SMS left a container, and the digest was never sent through a real mail server or over TLS. The 30-day promise in the privacy notice rests on two server settings nobody has yet made.
- **A critical alert can wait a day.** The digest is daily and the uptime check sees only whether the server answers. A failed backup is a journal line and nothing else.
- **The consent card and both pilot questions use wording nobody approved.** The consent flow was exercised by backend tests with a scripted provider and in a browser with simulated reads, never end to end against the real provider.
- **Two security findings are open**: credentials in the first commit's history, and the guessability of a four-digit login code. Both need the owner.
- **No signature exists** on the metric dictionary or any other `DRAFT` row of the freeze register. Collection must not start before the dictionary is signed.
- **No moderated session was held**, so the three metrics that depend on them have no data, and the two composites have only their self-report part.
- **No legal review** of the retention durations, the erasure mechanics or the consent text. The owner decided them for the pilot.
- **No manual operator check on the development database.** The page was exercised only by automated tests and screenshots; nobody compared a figure on it with the same query run by hand, and it was never opened with real provider data.
- **Kill switches on the server need a restart**, because they are environment variables there; that path was not drilled. The drill flips them through a reloading settings file. The provider switch was drilled for its audit line only.
- **Purge was never run on a large table**: batching is tested with a batch of two, and one run still holds all its statements in one transaction.
- **Real provider:** failure paths were never exercised against it, and the Reconcile env-gated smoke test was still not run (the owner must run it; the key is not read from user-secrets).
- **Accessibility:** role-based automated tests, phone no-horizontal-scroll checks and one keyboard pass over the manual Task flow on desktop. Planning, Reconcile, Routines and the phone layout have no keyboard test, and nothing was checked with a screen reader.
- **Stale statements elsewhere.** Several Mind Map documents still call `DEC-011` deferred (README, baseline, release checklist and others); only 019C and the freeze register were changed.
