# Mobile App (React Native)

The technical HOW for the native TidySense app. Added on 2026-10-22 when the owner chose React Native over Kotlin. The numbered steps are in [`development-steps.md`](development-steps.md). Product behaviour still comes from the Mind Map; this track adds no behaviour of its own, and anything new (reminders above all) needs a Mind Map decision first.

## Why React Native and not Kotlin (decision record)

- The web client is React 19 + TypeScript + TanStack Query + React Hook Form + Zod. The same skills, the same generated OpenAPI types and most pure client logic carry over. Kotlin starts every screen, type and rule again in a second language.
- One developer. Kotlin gives Android only.
- All product rules live in the .NET backend (planning gate, Reconcile rules, cascades, ActionConfirmation). The app is a form-and-list client and needs no native performance.
- Kotlin would only win if home-screen widgets or exact alarms were the core of the product. They are not.

## What the app is, and is not

Decided by the owner on 2026-10-25 in [Discussion 030](../../mindmap/01-Closed-Discussions/030-native-android-app-scope-and-local-reminders.md). Rules, copy, AI behaviour, confirmations and events are identical to the web (030 §2); only interaction differs.

| In | Out |
|---|---|
| Phone layouts of every user screen: welcome, login, first entry, Today, Tasks, Routines, Goals, Projects, Capture, Reconcile, Planning (four steps, redo, continuation), privacy, account | Desktop layouts (STEP-21) and the operator page (`/operations`) |
| One dock: four tabs and a centre «+» (the phone web app adopts it too); 220 px Today hero | Offline writes or a mutation queue |
| Swipe on a Task row (shortcut only), draggable sheets, pull to refresh, Android back, haptic on done, OTP autofill | Focus mode (030 §5) |
| Read-only offline Today from the device cache | Server push, home-screen widget (after the first release), biometric lock, voice input |
| Share from another app into quick capture; long-press icon shortcuts | Task or Reconcile reminders |
| Three local reminders: Routine slot, next-week offer, optional morning summary (030 §4) | iOS |
| Android only, published on Cafe Bazaar only | Other stores |

## Stack

| Concern | Choice | Note |
|---|---|---|
| Runtime | Expo (managed, latest stable SDK at MOB-02, pinned), Hermes | `expo prebuild` stays possible for local builds |
| Language | TypeScript strict | same `tsconfig` strictness as `/frontend` |
| Navigation | Expo Router (file routes under `mobile/app/`) | mirrors `frontend/src/routes` names |
| Server state | TanStack Query v5 | same query-key factories and hook shapes as the web features |
| Forms | React Hook Form + Zod | Zod schemas taken from the web feature `types/` |
| Client state | Zustand, only where the web uses it (`ui-store`) | |
| HTTP | Axios instance with bearer interceptor | [ADR-008](../decisions/ADR-008-native-client-authentication.md) |
| Secure storage | `expo-secure-store` | token only |
| Styling | NativeWind, pinned; fallback a typed token module + `StyleSheet` | MOB-02 spike decides (see below) |
| Sheets | `@gorhom/bottom-sheet` | create/edit stay in sheets (design system rule) |
| Gradient (moonstone) | `expo-linear-gradient` | AI is always the moonstone, never a button colour |
| Icons | Solar set rendered with `react-native-svg`, one `shared/ui/icons` module | same names as the web module |
| Fonts | Vazirmatn + Noto Naskh Arabic via `expo-font` | |
| Dates | `date-fns-jalali`, same helpers as `frontend/src/shared/lib/date.ts` | |
| Ids | `expo-crypto` `randomUUID()` for `Idempotency-Key` | Hermes has no `crypto.randomUUID` |
| Network state | `@react-native-community/netinfo` | replaces `use-online.ts` |
| Notifications | `expo-notifications`, **local schedules only** | MOB-11 |
| Offline read cache | TanStack Query persister on device storage, Today only | read-only, labelled with its time |
| Share target and icon shortcuts | an Expo config plugin for the Android share intent; `expo-quick-actions` | needs a development build, not Expo Go |
| Tests | Jest (`jest-expo`) + React Native Testing Library; Maestro for device flows | Maestro flows mirror `frontend/e2e/*.spec.ts` |
| Lint/format | Biome, same config as `/frontend` | |

**NativeWind caveat.** The web is on Tailwind 4. NativeWind's stable line has targeted Tailwind 3, so class names will mostly but not entirely match. The MOB-02 spike must prove, on a real Android device: logical spacing (`ms-`/`me-`, `start-`/`end-`) under forced RTL, the `dark:` variant driven by our own theme setting (not only the system), and CSS-variable tokens. If any of the three fails, use a typed token module and `StyleSheet` instead and record it here. Do not run both.

## Folder

```text
mobile/
  app/                      # Expo Router routes only; thin, compose features
  src/
    features/<feature>/     # same four parts as the web: types/, services/, hooks/, components/
    shared/
      api/                  # http.ts (bearer, 401, ApiError), generated.ts
      lib/                  # date, theme, ui-store, online, secure-session
      ui/                   # primitives: Sheet, Toaster, ConfirmationDialog, StateUi, PageHeader, DateField, icons
  assets/
  app.json
```

Feature names match `frontend/src/features/*` one to one, so a change to a web feature names its mobile twin.

## Sharing with the web client

- **Types:** `mobile` runs `openapi-typescript ../backend/openapi/TidySense.json -o src/shared/api/generated.ts`, exactly like the web. One OpenAPI file, two generated copies, never hand-edited.
- **Pure code** (Zod schemas, `planning.phase.ts`, `planning.format.ts`, Jalali/date helpers, `toApiError`): copied into the matching mobile feature in MOB-02 with a header comment naming the web source file. When a third copy or a second drift appears, extract a workspace package (`/packages/client-core`) and switch both apps to it in one change. Not before: AGENTS.md forbids premature abstraction, and moving web code now risks web regressions before the pilot.
- **Components:** never shared. DOM and native primitives differ; the boards and `design-system.md` are the shared source, not the code.

## Conventions (in addition to `active-conventions.md`)

- The backend stays authoritative. The app never derives Reconcile facts, planning review states or cascades; it renders what the API returns, as the web does.
- Every write sends `Content-Type: application/json` and, where the web sends one, a fresh `Idempotency-Key`.
- One layout per screen (phone). No `useIsDesktop()`.
- RTL is forced at startup (`I18nManager.forceRTL(true)` plus the `expo-localization` config so a first launch does not need a restart). Back arrows point right.
- Text respects the system font scale up to 1.3; touch targets at least 44 pt; every icon-only control has an accessibility label.
- No model or provider name on any screen (same rule as the web).
- Errors use the same codes and Persian titles as the web (`toApiError`).
- A screen is done only when its Maestro flow passes on a real Android device in light and dark.

## Compatibility rule (new, because installed apps outlive deploys)

A web deploy replaces every client at once; an installed app does not. From the first store release:

- a `/api/v1` response field the app reads is never removed or renamed while a supported app version reads it;
- a new required request field is a breaking change: add it as optional, ship the app, then require it;
- `GET /api/v1/client/requirements` (MOB-12) returns the minimum supported app version; below it the app shows one «به‌روزرسانی لازم است» screen and nothing else.

## Risks (read before starting)

| Risk | Why it is real | What the steps do about it |
|---|---|---|
| The core is still moving | The pilot runs on the web (since before 2026-10-25); planning changes found in it land twice. | Planning (MOB-10) is the last feature step. The app reaches the pilot cohort only after the observation window (030 §6). |
| Testing against the pilot server | The pilot server is live; development must not create test data in the pilot's database. | Until MOB-10 the app uses the backend on the development machine over LAN; a separate staging VPS is part of MOB-12. |
| iOS distribution from Iran | Apple's developer program is generally not available to residents of sanctioned countries. | Android first. iOS only when an account exists; the code stays cross-platform. |
| Expo cloud services from Iran | EAS Build/Update/Push are US services; availability for an Iranian account must be checked, not assumed. | MOB-00 checks it. Fallback: local builds (`expo prebuild` + Gradle), self-hosted update manifest or store updates only, local notifications only. |
| Push delivery in Iran | FCM is unreliable on many Iranian networks and devices without Google services. | No server push. The three approved reminders (030 §4) are local schedules computed on the device. |
| Doubling UI work | ~15,600 lines of web components; every future screen change is two changes. | Feature parity gate in MOB-12; the web stays the reference implementation. |
| 14-day sign-in | ADR-001 has no refresh token; native users re-enter an OTP every 14 days. | Accepted for the pilot (ADR-008). |
