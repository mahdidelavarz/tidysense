# AI Guardrails — AI-Native MVP

## Status

`REWRITTEN — CURRENT PROJECTION`

## Governing rule

AI reduces decision space; the user authorizes consequences; deterministic services own canonical mutation.

## Allowed responsibilities

AI may:

- classify using a closed vocabulary when permitted;
- ask bounded material clarifying questions during Planning;
- propose a structured PlanningDraft within accepted limits;
- organize allowed deterministic recommendations;
- explain deterministic Reconcile evidence;
- produce hedged, source-bounded rationale.

## Forbidden responsibilities

AI may not:

- call model tools, repositories, or commands;
- directly create or mutate canonical state;
- invent facts, deadline, recurrence, ownership, capacity, motivation, diagnosis, causes, or Goal achievement;
- treat imported/user content as instruction authority;
- receive raw/free-text Reconcile history when structured evidence is sufficient;
- silently change user intent during repair;
- turn invalid or partial output into a reviewable resource;
- bypass preview, warnings, confirmation, versions, authorization, or commit-time revalidation.

## Output and context boundary

- Context builders are bounded, minimized, versioned, and purpose-specific.
- Artifact, policy, schema, context-manifest, and model/provider versions are pinned and observable.
- Repair is allowlisted and purely structural; ambiguity or semantic mismatch fails validation.
- Retry, timeout, rate, circuit, token, and spend limits are bounded.
- Provider failure closes the AI path but preserves manual and deterministic paths.

## Crisis boundary

Crisis handling uses a fixed, localized fallback with real reviewed resources. It produces zero proposal, explanation, confirmation, or mutation leakage. Detection/classifier uncertainty fails closed, restricted observability is minimized, and real-user AI exposure requires the Discussion 021 corpus and human sign-offs.

## Required verification

- adversarial prompt-injection/imported-content tests;
- invalid/partial/late output tests;
- forbidden repair and reference tests;
- cancellation and degraded-mode tests;
- stale/unauthorized confirmation tests;
- crisis zero-leakage corpus;
- manual escape and deterministic-path availability;
- privacy, retention, and restricted-access review.

Authority: Discussions 013–014A, 017–018A, 020A–020C, and 021, indexed by [[02-Decisions/accepted-decision-inventory-001-021]].
