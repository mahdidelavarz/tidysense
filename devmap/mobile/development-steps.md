# Mobile Development Steps (MOB-00 to MOB-12)

The execution roadmap for the React Native app. Added on 2026-10-22. Stack, folder, sharing and risk notes are in [`README.md`](README.md); read it first.

These steps use their own `MOB-` IDs so the canonical roadmap ([`../development-steps.md`](../development-steps.md)) keeps its numbering. The same execution protocol applies: **Start / Continue / Review MOB-N** stays inside one step, verifies its dependencies, updates evidence only after verification, and never advances on its own. Status values are the same: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `DONE`.

**Relation to the pilot.** No MOB step is a dependency of STEP-12, and STEP-12 is not a dependency of the MOB steps. The pilot runs on the web app on the server; the app is built beside it and reaches the pilot cohort only after the observation window ([Discussion 030](../../mindmap/01-Closed-Discussions/030-native-android-app-scope-and-local-reminders.md) §6).

**Reference implementation.** For every screen, the web feature of the same name is the reference for behaviour, copy and API use, and the boards named in STEP-15 to STEP-20 plus the design source below are the visual reference. Where the mobile design spec and an accepted decision disagree, the decision wins and the gap is reported.

**Design source.** The mobile design spec delivered on 2026-10-21 (project files, `design/tidysense-mobile-design-spec.md`) and [`../frontend/design-system.md`](../frontend/design-system.md). The spec's dock (four tabs and a centre «+») was decided by the owner on 2026-10-25 (030 §3).

Order: MOB-00 → MOB-01 → MOB-02 → MOB-03 → MOB-04 → MOB-05, then MOB-06 to MOB-09 in any order their dependencies allow, then MOB-10, then MOB-11 and MOB-12.

Rough size for one developer, honest and unmeasured: MOB-00 to MOB-05 three to four weeks, MOB-06 to MOB-10 five to seven weeks, MOB-11 and MOB-12 one to two weeks. Planning (MOB-10) is the largest single step.

---

## MOB-00 — Go/No-Go and Prerequisites

**Goal:** Decide, with evidence, that a native app is worth starting now and that it can be built, delivered and reached from where its users are.

**Scope:**
- Owner decisions, recorded on 2026-10-25 in [Discussion 030](../../mindmap/01-Closed-Discussions/030-native-android-app-scope-and-local-reminders.md): Android only; Cafe Bazaar only; the pilot runs on the web and the app waits for the end of the observation window; `CUT-06` lifted for three local reminders; dock with four tabs and a centre «+»; read-only offline Today; Share and icon shortcuts in; Focus mode out.
- Still to do: the Cafe Bazaar developer account.
- Android package name, fixed 2026-10-30: `ir.tidysense.app`, from the owner's domain `tidysense.ir`. It cannot change after the first release. The app reaches the API on the same domain as the web (`https://tidysense.ir/api/v1`); no subdomain is needed.
- Check, with a real account: Expo account creation and EAS Build from the owner's location; if blocked, prove a local Android build (`expo prebuild` + Gradle) on the owner's machine.
- A test Android phone (Android 10+) with USB debugging on, on the same Wi-Fi as the development machine. Until MOB-10 the app talks to the backend on that machine (`http://<LAN IP>:5082`), so development never writes to the pilot database. A separate staging host is a MOB-12 prerequisite, not a MOB-00 one.

**Out of scope:** Any app code, any backend change.

**Required DevMap context:** [mobile README](README.md), [deployment](../operations/deployment.md), [environments](../operations/environments-and-configuration.md).

**Required Mind Map context:** [scope-cut register](../../mindmap/05-Implementation/scope-cut-register.md) (`CUT-06`), [MVP baseline](../../mindmap/04-Specs/ai-native-mvp-baseline.md) (out-of-scope list), [mvp scope](../../mindmap/04-Specs/mvp-scope.md).

**Dependencies:** None.

**Implementation checklist:**
- [x] Owner decisions recorded (Discussion 030, 2026-10-25).
- [ ] Cafe Bazaar developer account created.
- [x] Package name recorded here (`ir.tidysense.app`, 2026-10-30).
- [ ] EAS or local build check run.
- [ ] Test phone ready with USB debugging.

**Verification:** Decisions linked from this step; build check log (which path worked, errors seen).

**Completion criteria:** All decisions recorded and both technical checks pass, or status `BLOCKED` naming the failed check.

**Status:** `IN_PROGRESS` — decisions recorded 2026-10-25; package name fixed 2026-10-30; account, build check and test phone remain. Owner's to-do list: <https://claude.ai/artifact/MqoqbuN7AwhJVtB9GLaNEK>.

**Evidence:** [Discussion 030](../../mindmap/01-Closed-Discussions/030-native-android-app-scope-and-local-reminders.md).

---

## MOB-01 — Native Client Authentication

**Goal:** Let a native client sign in and write through `/api/v1` without weakening the browser's cookie and Origin protection.

**Scope:** [ADR-008](../decisions/ADR-008-native-client-authentication.md): the `X-TidySense-Client: native` header, bearer header in `JwtCookieEvents`, `POST /auth/otp/verify-native` returning `NativeSessionDto` without a cookie, Origin/Referer check skipped only for native-header-without-cookie requests, OpenAPI regenerated, web types regenerated. The user's first native sign-in instant is stored (`Users.FirstNativeSignInAt`, set once, never changed) so pilot analysis can split before and after the app (030 §6).

**Out of scope:** Refresh tokens, device registry, token lifetime change, any mobile code.

**Required DevMap context:** [ADR-001](../decisions/ADR-001-authentication-session-contract.md), [ADR-008](../decisions/ADR-008-native-client-authentication.md), [auth/security](../backend/auth-security-transactions.md), [API contracts](../shared/api-contracts.md), [new API workflow](../workflows/new-api.md), [backend testing](../backend/testing.md).

**Required Mind Map context:** [auth spec](../../mindmap/04-Specs/auth-phase-1.md).

**Dependencies:** MOB-00 `DONE`. Started on 2026-10-28 at the owner's request while MOB-00's account, package name, build check and phone were still open: none of them touches this backend change.

**Implementation checklist:**
- `OnMessageReceived`: cookie first, then `Authorization: Bearer`.
- OTP verify request gains optional `client`; the response DTO gains optional `accessToken`, `expiresAt`.
- `ApiRequestSecurityMiddleware`: the exemption, with a comment naming ADR-008.
- Integration tests for the five cases listed in ADR-008, plus: OTP rate limits apply identically to native verify.
- `FirstNativeSignInAt`: migration per the [schema workflow](../workflows/schema-change.md); set on the first native verify only; a later native or web sign-in leaves it unchanged; erasure handles it like the other user columns.
- Security review note appended to [security review](../quality/security-review-2026-10-09.md) or a new dated file.
- ADR-008 status → Accepted after owner approval.

**Verification:** Backend suite on real PostgreSQL; `./auth-e2e.ps1` (web path unchanged); frontend typecheck after type regeneration.

**Completion criteria:** All tests pass, the web login is byte-for-byte unchanged in behaviour, ADR-008 accepted.

**Status:** `DONE` — verified on 2026-10-28 on Linux. Still owed: `./dev.ps1 check` and `./auth-e2e.ps1` on Windows.

**Evidence:**
- [`NativeClientAuthTests`](../../backend.Tests/NativeClientAuthTests.cs): 8 tests, the ADR-008 cases plus the attempt limit and `FirstNativeSignInAt`.
- Backend suite on PostgreSQL 16: 315 passed, 2 skipped. `AuthenticationCompletionTests` unchanged and passing (web sign-in, cookie flags, Origin refusal).
- Migration `NativeClientSignIn` (nullable `Users.FirstNativeSignInAt`); OpenAPI and `frontend/src/shared/api/generated.ts` regenerated; frontend typecheck clean.
- ADR-008 accepted; security note in [security review](../quality/security-review-2026-10-09.md), "Native client (2026-10-28)".

---

## MOB-02 — Mobile Workspace and Client Foundation

**Goal:** A running Expo app in `/mobile` that signs in against the development backend and reads `/users/me`, with every cross-cutting convention in place before any screen.

**Scope:**
- Expo app (TypeScript strict, Expo Router, Hermes), Biome, Jest + RNTL, Maestro.
- `shared/api`: generated types from `backend/openapi/TidySense.json`; Axios instance with base URL from config, bearer interceptor, `Idempotency-Key` via `expo-crypto`, 401 → session cleared → login, `toApiError` copied from the web.
- `shared/lib`: secure session (`expo-secure-store`), online state (NetInfo), theme setting (light/dark/system, persisted), Jalali date helpers copied from the web with source comments.
- Forced RTL from first launch; Vazirmatn and Noto Naskh Arabic loaded before first render.
- Styling spike (NativeWind vs token module) decided and recorded in the README.
- `dev.ps1` gains `mobile-backend` (backend on the LAN, login code readable), `mobile` (Metro) and `mobile-check` (typecheck, lint, Jest); `/mobile/README.md` explains device setup.
- One placeholder screen: login by OTP against the development backend, then shows `/users/me`.

**Out of scope:** Real screens and design, notifications, store builds.

**Required DevMap context:** [mobile README](README.md), [frontend stack](../frontend/stack-architecture-folder.md), [routing/state/API](../frontend/routing-state-api.md), [local development](../workflows/local-development.md), [dependency policy](../operations/dependency-policy.md).

**Required Mind Map context:** None.

**Dependencies:** MOB-01 `DONE`.

**Implementation checklist:** Scaffold; pin versions per the dependency policy; http client and its unit tests (bearer added, 401 clears session, idempotency header unique per call, `toApiError` mapping); RTL and font proof on a physical Android device; styling spike with screenshots in both themes.

**Verification:** `mobile` lint, typecheck and Jest pass; a Maestro flow signs in with the loopback test session or a test number and sees the user id; screenshots of RTL text, Persian digits and dark mode on a device.

**Completion criteria:** Sign-in works end to end on a device against the development backend; styling decision recorded.

**Status:** `IN_PROGRESS` — code done 2026-10-28 (PR #19); the device checks below remain, and only a phone can do them.

**Evidence (2026-10-28, cloud):**
- `mobile/`: Expo SDK 58, package `ir.tidysense.app`, routes in `src/app`, features and shared layer as in the README folder layout.
- `npm run typecheck`, `npm run lint`, `npm test` pass: 14 Jest tests (bearer header and native header, 401 clears the session but a wrong code does not, `toApiError`, idempotency key, keystore session and expiry, Jalali dates, login screen: invalid number, full sign-in with the development code, wrong code). The login test caught a countdown that started one second high; fixed.
- `expo export --platform android` bundles to Hermes bytecode; `expo prebuild` produces `applicationId ir.tidysense.app` (renamed from the provisional `com.tidysense.app` on 2026-10-30), `supportsRtl` with `forcesRTL`, and cleartext HTTP in debug builds only.
- The phone's backend path, run from a non-loopback address: `otp/request` 202 → `dev/otp/latest` → `otp/verify-native` → `GET /users/me` 200 with the bearer → `logout` 204; no HTTPS redirect on the `http` profile.
- Not done (needs the phone): first `npx expo run:android`, Maestro `maestro/login.yaml`, screenshots of RTL text, Persian digits and dark mode.

**Evidence:** None.

---

## MOB-03 — Design Tokens and Primitives

**Goal:** The native equivalents of `shared/ui`, so feature steps only compose.

**Scope:** Tokens from `frontend/src/index.css` (light «روز», dark «شب», `--ai-*` moonstone) in one source; `Sheet`, `ConfirmationDialog`, `TerminalDialog`, `Toaster`, `StateUi` (loading/empty/error/offline), `PageHeader`, `PhotoHero` (220 px per the spec unless the owner keeps 300 px), `SegmentedControl`, `SelectField`, `DateField` + `Calendar` (Jalali), `DayChoice`, `FactRow`, `Stepper`, `EntityUi`, icons module.

**Out of scope:** Feature screens.

**Required DevMap context:** [design system](../frontend/design-system.md), [components](../frontend/components.md), [accessibility](../frontend/design-system-accessibility.md), [mobile README](README.md).

**Required Mind Map context:** None.

**Dependencies:** MOB-02 `DONE`.

**Implementation checklist:** One component at a time, each with an RNTL test that mirrors its web test where one exists (`ConfirmationDialog`, `DateField`, `Stepper`); a hidden `/dev/gallery` route showing every primitive in both themes.

**Verification:** Jest; gallery screenshots light and dark at 360×640 and a large phone; TalkBack pass over the gallery (labels, focus order, RTL reading order); contrast spot check of text tokens at 4.5:1.

**Completion criteria:** Every primitive the feature steps need exists, is tested and passes the TalkBack pass.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## MOB-04 — Welcome, Login, First Entry, Privacy, Account

**Goal:** A new and a returning user can get in, read the privacy notice and sign out, exactly as on the web.

**Scope:** Welcome guides (phones only, once per device, nothing sent to the server — 028 §4); phone and OTP screens with Android SMS autofill (SMS User Consent API) and iOS `oneTimeCode`; first entry on first sign-in only, Today afterwards; privacy page from `GET /api/v1/pilot/notice`; account sheet with theme, privacy, logout and logout-all.

**Out of scope:** Display-name editing (no accepted UI), any new account feature.

**Required DevMap context:** [auth/security](../backend/auth-security-transactions.md), [forms/pages](../frontend/forms-components-pages.md), [runbooks](../operations/runbooks.md) (runbook 9, privacy notice).

**Required Mind Map context:** [auth spec](../../mindmap/04-Specs/auth-phase-1.md), [day-0 onboarding](../../mindmap/04-Specs/day-0-onboarding.md), [Discussion 027](../../mindmap/01-Closed-Discussions/027-ai-disclosure-response-feedback-and-product-insights.md), [Discussion 028](../../mindmap/01-Closed-Discussions/028-clarification-quick-replies-first-run-guides-and-desktop.md) §4.

**Dependencies:** MOB-03 `DONE`.

**Implementation checklist:** Reuse the web Zod phone/OTP schemas; error copy from the same codes (rate limit, expired, wrong code); welcome-seen flag stored on the device only.

**Verification:** Jest for schemas and routing decisions; Maestro flows mirroring `auth.spec.ts`, `welcome.spec.ts`, `privacy.spec.ts`; logout-all from the web ends the app session.

**Completion criteria:** All three flows pass on a device; no model or provider name appears.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## MOB-05 — Shell and Navigation

**Goal:** The app frame: tabs, create flow, account entry, offline banner, deep links.

**Scope:** The dock decided in 030 §3 (امروز · کارها · [+] · روتین‌ها · هدف‌ها; the create sheet's first card is the moonstone planning entry); the same dock and the 220 px Today hero on the phone web app, with its tests and `layout-and-navigation.md` updated in the same change; create sheet; offline banner; Android back behaviour (sheet → page → tab → exit); deep links `tidysense://today`, `…/tasks/{id}`, `…/planning`; long-press icon shortcuts «کار جدید», «یادداشت سریع», «برنامه‌ریزی».

**Out of scope:** Feature content behind the tabs (placeholders until their steps).

**Required DevMap context:** [layout and navigation](../frontend/layout-and-navigation.md), [design system](../frontend/design-system.md).

**Required Mind Map context:** [Discussion 030](../../mindmap/01-Closed-Discussions/030-native-android-app-scope-and-local-reminders.md) §3.

**Dependencies:** MOB-04 `DONE`.

**Implementation checklist:** Tabs, create sheet, back handling, deep link table, offline banner using NetInfo.

**Verification:** Maestro: every tab reachable, back closes a sheet before leaving a page, a deep link opens the right screen after sign-in; offline toggle shows the banner.

**Completion criteria:** App and phone web show the same dock; one floating primary action, not two; each icon shortcut opens its sheet.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## MOB-06 — Today and Tasks

**Goal:** Daily execution on the phone: Today, Tasks list, Task detail, create and edit, move to another day, done with undo, sequences.

**Scope:** Phone parity with STEP-16 and STEP-23 screens: Today list and its Reconcile entry card, Task sheets, «فردا/روز دیگر» move sheet, done tick with `UNDO_COMPLETE_TASK` on the same tick, sequence actions (`CHANGE_TASK_SEQUENCE`, follow on create with `sequence-preview`), optimistic version handling (`CONFLICT_STALE_VERSION` → refetch and say so). Native interaction (030 §3): swipe on a Task row for «انجام شد» and «فردا» as a shortcut beside the buttons, with the same undo toast; pull to refresh; haptic on done; read-only offline Today from the persisted query cache, labelled «آخرین به‌روزرسانی …», with every action disabled offline.

**Out of scope:** Desktop tiles; search; task times.

**Required DevMap context:** [routing/state/API](../frontend/routing-state-api.md), [forms/pages](../frontend/forms-components-pages.md), [step-07 acceptance](../step-07-capture-reconcile-acceptance.md) for quick actions only.

**Required Mind Map context:** [Discussion 015](../../mindmap/01-Closed-Discussions/015-task-and-routine-execution-model.md), [Discussion 025](../../mindmap/01-Closed-Discussions/025-task-dependency-sequences-and-hierarchical-reconcile-grouping.md), [Discussion 026](../../mindmap/01-Closed-Discussions/026-backlog-removal-parent-owned-undated-tasks-and-quick-capture.md), [Discussion 029](../../mindmap/01-Closed-Discussions/029-planning-quality-rolling-horizon-and-sequences.md) §9.

**Dependencies:** MOB-05 `DONE`.

**Implementation checklist:** Copy the `tasks` and `today` feature `types/` and hook shapes; screens; tests.

**Verification:** Jest for hooks' cache updates and the offline cache (written only from a successful read, never shown as fresh); Maestro mirroring `undo-tick.spec.ts`, `sequence.spec.ts` and the Today parts of `responsive.spec.ts`; swipe-then-undo; airplane mode shows the cached Today and refuses a tick.

**Completion criteria:** Every Task action available on the phone web is available in the app with the same result on the server.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## MOB-07 — Routines

**Goal:** Routine list, detail, create/edit/stop, slot done/undo/correction.

**Scope:** Parity with STEP-06/STEP-16 phone screens: times of day, slots on Today, `UNDO_ROUTINE_OCCURRENCE_DONE`, missed correction, stop (pending slots leave Today at once).

**Out of scope:** Skipping a slot (not built on the web), reminders (MOB-11).

**Required DevMap context:** [step-06 acceptance](../step-06-routine-acceptance.md), [data types and dates](../shared/data-types-and-datetime.md).

**Required Mind Map context:** [Discussion 024](../../mindmap/01-Closed-Discussions/024-multi-time-daily-routine-scheduling-and-occurrence-semantics.md), [Discussion 015b](../../mindmap/01-Closed-Discussions/015b-routine-local-date-and-daily-occurrence-amendment.md).

**Dependencies:** MOB-06 `DONE` (slots render on Today).

**Implementation checklist:** Feature port; time display in the routine's `recurrenceTimezone`, never the device's, when they differ.

**Verification:** Jest; Maestro mirroring `routines.spec.ts`; one run with the device timezone set away from `Asia/Tehran`.

**Completion criteria:** Parity, and correct slot times with a foreign device timezone.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## MOB-08 — Goals and Projects

**Goal:** Structure screens: lists, details, create/edit, progress percentage, stop with its cascade preview.

**Scope:** Parity with STEP-04/STEP-17 phone screens and the 2026-10-19 owner fixes: stop preview (`ActionConfirmation`, `CONFIRMATION_STALE`), Project completes by its Tasks only, progress percentage.

**Out of scope:** Desktop timelines.

**Required DevMap context:** [step-04 acceptance](../step-04-goal-project-acceptance.md), owner fixes 2026-10-19 in [`../development-steps.md`](../development-steps.md).

**Required Mind Map context:** [Discussion 012](../../mindmap/01-Closed-Discussions/012-core-product-model.md) §4.

**Dependencies:** MOB-06 `DONE`.

**Implementation checklist:** Feature port (`goals`, `projects`, `structure`); stale-preview handling.

**Verification:** Jest; Maestro mirroring `parents.spec.ts`.

**Completion criteria:** Parity, including a stale stop preview shown and refused.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## MOB-09 — Capture and Reconcile

**Goal:** Quick capture and the full Reconcile session, one-tap actions with undo included.

**Scope:** Parity with STEP-07, STEP-10 and STEP-19: capture, Reconcile session, one-tap «انجام شد» and «امروز» with undo, review and apply via `ActionConfirmation`, AI recommendation as a moonstone prefill only, feedback on AI responses (STEP-14). Android share target: text shared from another app opens quick capture prefilled; the user still taps to save (030 §3).

**Out of scope:** New rules or actions.

**Required DevMap context:** [step-07 acceptance](../step-07-capture-reconcile-acceptance.md), [step-10 acceptance](../step-10-ai-reconcile-acceptance.md).

**Required Mind Map context:** [Discussion 016](../../mindmap/01-Closed-Discussions/016-reconcile-trigger-and-severity.md), [Discussion 017](../../mindmap/01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions.md), [Reconcile UI/UX spec](../../mindmap/04-Specs/reconcile-ui-ux-specification.md), [Discussion 027](../../mindmap/01-Closed-Discussions/027-ai-disclosure-response-feedback-and-product-insights.md).

**Dependencies:** MOB-06, MOB-07, MOB-08 `DONE`.

**Implementation checklist:** Feature port (`captures`, `reconcile`, `feedback`); the app derives nothing (no client-side severity or carry count).

**Verification:** Jest; Maestro mirroring `reconcile.spec.ts`; share text from another app, save, and see it in captures.

**Completion criteria:** Parity; apply refuses a stale preview exactly as the web does.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## MOB-10 — Planning

**Goal:** The four-step planning flow on the phone: write, questions, review, confirm; redo; next-week continuation.

**Scope:** Parity with STEP-18, STEP-22, STEP-24 and the redo fix: intent form, choice-based clarification with «چیز دیگر…», building state and its failure state, draft review with proposal edit sheet, redo («اصلاح» and whatever replaces «نسخهٔ دیگر» when PR #17 or its successor is merged), apply dialog, continuation offer.

**Out of scope:** Any prompt, model or gate change (those stay in the main roadmap and `tools/planning-eval`).

**Required DevMap context:** [step-08 acceptance](../step-08-planning-acceptance.md), [step-09 acceptance](../step-09-ai-planning-acceptance.md).

**Required Mind Map context:** [Discussion 013](../../mindmap/01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow.md), [Discussion 028](../../mindmap/01-Closed-Discussions/028-clarification-quick-replies-first-run-guides-and-desktop.md) §2–3, [Discussion 029](../../mindmap/01-Closed-Discussions/029-planning-quality-rolling-horizon-and-sequences.md).

**Dependencies:** MOB-06, MOB-08 `DONE`; the redo options on `main` are settled (do not port a redo UI that is about to change).

**Implementation checklist:** Copy `planning.phase.ts`, `planning.format.ts`, `planning.schema.ts`; port components; a long-running request survives the app going to background and returning (refetch the attempt, never resend).

**Verification:** Jest including the copied phase tests; Maestro mirroring `planning.spec.ts`, `continuation.spec.ts`, `time-to-draft.spec.ts` (mock provider on staging), plus background/foreground during building.

**Completion criteria:** Parity; backgrounding never creates a second draft.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## MOB-11 — Local Reminders

**Goal:** The three local reminders of [Discussion 030](../../mindmap/01-Closed-Discussions/030-native-android-app-scope-and-local-reminders.md) §4: Routine slot, next-week offer, optional morning summary.

**Scope:** `expo-notifications` local schedules only, computed on the device from the Routines, today's slots and the continuation offers the app already reads; rescheduled on app start, foreground, sign-in, and after any Routine, slot or continuation change; all cleared on logout; one switch per kind in the account sheet (slot and next-week on, morning off; the morning time chosen by the user); notification permission asked at the first Routine creation or the first switch turned on, never at launch. Tapping a reminder opens Today, or the planning continuation for the next-week offer.

**Out of scope:** Server push, Task and Reconcile reminders, snooze, any server-side setting.

**Required DevMap context:** [mobile README](README.md), [data types and dates](../shared/data-types-and-datetime.md), [step-24 in the roadmap](../development-steps.md) (continuation offer dates).

**Required Mind Map context:** [Discussion 030](../../mindmap/01-Closed-Discussions/030-native-android-app-scope-and-local-reminders.md) §4, [Discussion 024](../../mindmap/01-Closed-Discussions/024-multi-time-daily-routine-scheduling-and-occurrence-semantics.md), [Discussion 029](../../mindmap/01-Closed-Discussions/029-planning-quality-rolling-horizon-and-sequences.md) §3.

**Dependencies:** MOB-07 and MOB-10 `DONE`.

**Implementation checklist:** One pure scheduling function (slots, times, timezone, offers and settings → triggers for the next 7 days, under the Android limit) with unit tests; scheduler glue; account-sheet switches; morning text without counts.

**Verification:** Unit tests: an `Asia/Tehran` day boundary, a device in another timezone, a done slot, a stopped Routine, a decided week, all switches off. On a device: a slot at now+2 minutes notifies; done before its time cancels it; stopping the Routine cancels all; logout clears all; the next-week reminder opens the continuation.

**Completion criteria:** No reminder for a done slot, a stopped Routine, a decided week, a switched-off kind, or after logout.

**Status:** `NOT_STARTED`

**Evidence:** None.

---

## MOB-12 — Release Readiness

**Goal:** A signed Android build users can install and keep updated, with the compatibility rule enforced.

**Scope:** A staging host separate from the pilot server (own VPS, fresh secrets, AI providers `mock`), reachable from an Iranian mobile network; signing key generated and backed up outside the repo; release build (EAS or local); the Cafe Bazaar listing; privacy text consistent with `/pilot/notice`; `GET /api/v1/client/requirements` (minimum app version) and the update-required screen; crash reporting through a service reachable from Iran, with no token, phone number or user text in reports; update path decided (store only, or self-hosted Expo update manifest); feature-parity checklist against the web phone screens.

**Out of scope:** iOS release (until an account exists), marketing.

**Required DevMap context:** [Definition of Done](../quality/definition-of-done.md), [dependency policy](../operations/dependency-policy.md), [new API workflow](../workflows/new-api.md), [mobile README](README.md) compatibility rule.

**Required Mind Map context:** [release checklist](../../mindmap/05-Implementation/release-readiness-checklist.md).

**Dependencies:** MOB-04 to MOB-11 `DONE`.

**Implementation checklist:** Requirements endpoint + test; update-required screen; release pipeline; parity checklist filled screen by screen; a fresh install on two low-end Android devices.

**Verification:** Full Maestro suite on a release build against staging; cold start under 3 s on the low-end device; APK size recorded; parity checklist with no open row.

**Completion criteria:** A signed release passes the suite and the parity checklist, and the owner approves publishing. It reaches the pilot cohort only after the observation window, or on a date written into the pilot protocol first (030 §6).

**Status:** `NOT_STARTED`

**Evidence:** None.
