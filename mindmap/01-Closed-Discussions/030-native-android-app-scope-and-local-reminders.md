# Discussion 030 — Native Android App: Scope, Local Reminders and the Running Pilot

## Status

**CLOSED — decided by the owner on 2026-10-25.**

```txt
STATUS = CLOSED
DECIDED_BY = OWNER
MIND_MAP = APPLIED_2026-10-25
OPEN_QUESTIONS = 0
DEVMAP_GATES = MOB-00 decisions (devmap/mobile/development-steps.md)
IMPLEMENTATION = NOT_AUTHORIZED_FROM_THIS_FILE_ALONE
```

This discussion is authoritative product direction. It amends:

- [[05-Implementation/scope-cut-register]] — `CUT-06` is lifted for three local reminders in the Android app only (§4);
- [[04-Specs/ai-native-mvp-baseline]] §7 — "PWA/offline-first … reminders" stays post-pilot except the read-only Today cache (§3) and the reminders of §4, both in the Android app;
- the phone navigation of the web app (§3, dock).

The analysis it rests on is the owner's document «تفاوت‌های اپ اندروید با وب» (2026-10-25, <https://claude.ai/artifact/VjVvbACkyaViSk5gadMEsb>, private to the owner).

---

## 1. Context

- The pilot runs on the web app on the server since before 2026-10-25.
- The owner chose a React Native app (2026-10-22). Its technical track is `devmap/mobile/` (MOB-00 to MOB-12).
- The question was which parts of the app may differ from the web.

## 2. What stays identical

The app and the web share, without exception:

1. every server rule (Reconcile facts, cascades, the planning gate) — the app derives nothing;
2. every user-facing text and button label;
3. AI behaviour, prompts and models;
4. explicit confirmation of every multi-entity change (`ActionConfirmation`); a gesture never bypasses it;
5. events and metrics — the app writes through the same API and has no metric of its own.

Any later exception needs a discussion first.

## 3. What may differ (interaction only)

- **Platform:** Android only. Distribution: Cafe Bazaar only.
- **Dock:** one floating action. Four tabs and a centre «+»: امروز · کارها · [+] · روتین‌ها · هدف‌ها. The create sheet's first card is the moonstone planning entry. **The phone web app adopts the same dock**, so the product has one phone navigation.
- **Today hero:** 220 px instead of 300 px, on the phone web app too.
- **Gestures:** swipe on a Task row for «انجام شد» and «فردا». It is a shortcut only: the buttons stay (screen readers) and the undo toast is shown exactly as for a tap.
- **Native conventions:** draggable bottom sheets, pull to refresh, Android back (sheet → page → tab → exit; a filled form asks before closing), a short haptic on a done tick, OTP autofill from SMS.
- **Read-only offline Today:** the last loaded Today is shown from the device cache, labelled «آخرین به‌روزرسانی …». Nothing can be changed offline; every action says it needs a connection.
- **Input from outside the app:** text shared from another app (Share) opens quick capture prefilled; long-press icon shortcuts «کار جدید», «یادداشت سریع», «برنامه‌ریزی». Both use existing capture and create flows.

## 4. Local reminders (`CUT-06` lifted for these only)

All three are scheduled on the device from data the app already reads. There is no server push.

| Reminder | When | Default |
|---|---|---|
| Routine slot | at each pending slot's time, in the Routine's timezone | on |
| Next-week offer | on the planned week's second-to-last day, when a continuation is offered (029 §3) | on |
| Morning summary «برنامهٔ امروزت را ببین» | once a day at a time the user picks; no counts, since the device cannot know them fresh | off |

Rules:

- each kind can be turned off on its own, in the account sheet;
- the notification permission is asked the first time a Routine is created or a reminder is turned on, never at launch;
- no reminder for a done slot, a stopped Routine, a decided week, or after logout;
- no Task reminder: Tasks have no time of day, and adding one is a separate decision;
- no Reconcile reminder in the first version: the device cannot know reliably whether anything waits.

## 5. Not now

- **Focus mode.** Undefined (timer, do-not-disturb, single-task screen and app blocking are different products), outside the job to be done, and without pilot evidence. Reconsidered only if the pilot interviews show people stall at starting a Task. If so, the smallest fitting form is «فقط همین کار»: one Task of Today full screen with «انجام شد» and «بعداً», no timer, nothing new stored.
- Home-screen widget (after the first release), biometric lock, voice input, server push.

## 6. The running pilot

- The app is not given to the pilot cohort during the pilot's observation window. If that changes, the date is written into the pilot protocol first.
- The server records each user's first native sign-in, so analysis can split before and after the app.
- Pilot insights decide the priority of reminders: unanswered next-week offers and missed Routine slots are the evidence. If both rates are low, §4 is lowered in priority.

## 7. Before MOB-02

- The Cafe Bazaar developer account exists.
- The Android package name is fixed; it cannot change after the first release.
