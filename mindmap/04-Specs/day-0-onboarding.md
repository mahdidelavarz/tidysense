# Day-0 Onboarding

Status: **Current high-level projection**.

`Welcome → Guide 1–3 (phones, first open only) → Login → OTP verification → First Entry / Initial Setup when required → Today`.

The welcome screen and three guide pages are shown on phones before login, once per device, and never to an existing session or on desktop. Each guide states one promise that must hold in the measured product; otherwise its copy changes. Nothing about them is recorded on the server. See [[01-Closed-Discussions/028-clarification-quick-replies-first-run-guides-and-desktop]] §4.

First Entry is a one-time setup state, not persistent Quick Create. It is shown on an account's first sign-in only: an account that already existed signs in to Today, even if First Entry was skipped (owner decision 2026-10-19). It may offer manual entry or bounded AI Planning. AI questions only for material ambiguity, produces a structured editable draft and never creates canonical state before review/apply. Failure or unavailable AI preserves manual setup. General provider safeguards, hostile-input isolation and privacy apply; there is no dedicated crisis page/fallback route.

Required states: OTP errors/rate limits, existing/new user, skip/manual path, AI loading/cancellation/invalid output, draft edit, confirmation/conflict and authoritative success. The setup-complete decision remains backend authoritative.
