# TidySense AI Guardrails

Status: **Canonical** (2026-09-19). This replaces older crisis-specific product guidance.

## Authority and mutation

- AI may propose, classify within a closed vocabulary, organize permitted recommendations and explain deterministic evidence.
- AI receives no repository, command or mutation tools. Its output is never permission or canonical state.
- Consequential changes require a server preview, visible consequences, explicit confirmation, commit-time ownership/version/invariant checks and deterministic atomic mutation.
- Invalid, partial, stale, cancelled or late output is unusable. No intent-changing repair is allowed.

## Context and input safety

- Context builders are bounded, allowlisted and versioned; raw/free-text Reconcile context is excluded.
- Imported or hostile text is data, never instruction, and cannot expand authority.
- Minimize personal data and apply accepted access, retention and deletion rules.
- The model must not diagnose, infer hidden motivation/capacity, infer Goal achievement, or present unsupported causes as facts.

## Operational safeguards

- Use provider safety/moderation capabilities appropriate to the selected model and document their limits.
- Enforce timeouts, bounded retries, rate/circuit/spend limits, artifact/version pinning and safe observability.
- Preserve deterministic/manual paths and show explicit unavailable/degraded states.
- Authorization, privacy, security review, incident response and kill switches remain required.

## Removed product behavior

TidySense has no dedicated crisis page, crisis gate, crisis routing/fallback flow, crisis-specific emergency-resource screen or crisis-specific analytics/data product. Provider/general AI safeguards do not authorize building an independent crisis detection/response system.
