# Reconcile UX — AI-Native MVP

## Status

`REWRITTEN — CURRENT UX PROJECTION`

## Purpose

Help users adapt when reality diverges without blocking Today, fabricating causes, or handing authority to AI.

## Deterministic entry and lanes

Reconcile first derives and cleans eligible facts, deduplicates them, calculates LIGHT/MEDIUM/RECOVERY execution severity, and separately groups commitment-review checkpoints. Review due is not execution overdue.

Today remains accessible at every severity. Skip is explicit and never counts as resolution. Primary presentation is bounded by the accepted local-day suppression and urgent-exception rules.

## Presentation

- Show deterministic facts and reason codes before recommendations.
- Keep execution and commitment-review lanes distinct.
- Group and chunk review checkpoints.
- Protect items and disclose parent/child consequences.
- Show exact selected entities, warnings, versions, and consequences before confirmation.
- Preserve manual resolution and escape from AI failure.

## Optional AI

Rule-gated AI may explain structured deterministic evidence or organize allowed recommendations. It receives minimized structured context and may not create facts, hidden causes, free-text history, authority, or mutation.

## Application

Recommendations require a server-authoritative preview and explicit confirmation. Commit-time revalidation may return conflict/refresh instead of applying. Bulk commands are all-or-nothing and return an authoritative CommandResult.

## Required states

```txt
unavailable
available by lane/severity
shown
skipped
deterministic review
AI explanation pending/available/unavailable
preview
confirming
applying
applied
stale/conflict
cancelled/expired
degraded/manual escape
crisis fallback
```

## Verification

Test eligibility cleanup, severity, suppression, Today access, skip, chunking, protected items, parent consequences, stale confirmation, atomic bulk, correction/reversal, accessibility, event evidence, manual escape, hostile input, and crisis zero leakage.

Authority: Discussions 015–018A and 020B.
