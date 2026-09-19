# Public Release Readiness Checklist

## Status

`CHECKLIST_STRUCTURE_APPROVED — RELEASE_NOT_READY`

Passing the pilot gate does not authorize public release. Release readiness requires stable evidence, resolved pilot findings, scalable operations, and an approved rollout strategy.

| ID | Requirement | Accountable | Required evidence | State |
|---|---|---|---|---|
| `REL-001` | Pilot hard gates remained acceptable throughout the observation window | Product owner | signed pilot outcome package | `NOT_STARTED` |
| `REL-002` | H1/H2 results support the claimed release scope without forbidden causal/diagnostic claims | Research owner | reviewed analysis and claims | `NOT_STARTED` |
| `REL-003` | Pilot safety, privacy, security and authorization findings resolved | Safety/Policy owner | closure records and retests | `NOT_STARTED` |
| `REL-004` | Public cohort/locale eligibility and crisis resources approved | Safety/Policy owner | localization and policy package | `NOT_STARTED` |
| `REL-005` | Legal basis, terms, privacy notice, deletion/export and retention operations approved | Security/Privacy owner | legal/privacy package | `NOT_STARTED` |
| `REL-006` | Capacity, latency, availability and provider quotas support rollout | Backend owner | production load/capacity report | `NOT_STARTED` |
| `REL-007` | Cost model, spend cap, abuse/rate controls and financial stop conditions approved | Product owner | cost/abuse model | `NOT_STARTED` |
| `REL-008` | Monitoring, on-call, support, incident, status communication and escalation scale | Product owner | staffing/runbook/drill evidence | `NOT_STARTED` |
| `REL-009` | Backup, restore, migration, rollback and disaster recovery meet release objectives | Backend owner | rehearsals and recovery objectives | `NOT_STARTED` |
| `REL-010` | Accessibility findings resolved for supported platforms | Product Design owner | accessibility conformance report | `NOT_STARTED` |
| `REL-011` | Supported browsers/devices, compatibility and upgrade policy documented | Frontend owner | compatibility matrix | `NOT_STARTED` |
| `REL-012` | API/event/schema compatibility and data migration policy approved | Backend owner | versioning/migration package | `NOT_STARTED` |
| `REL-013` | Known pilot-only constraints removed or explicitly retained with user-facing disclosure | Product owner | release scope register | `NOT_STARTED` |
| `REL-014` | Feature flags, staged rollout, kill switches and rollback thresholds tested | Backend owner | controlled rollout drill | `NOT_STARTED` |
| `REL-015` | Release metrics, alert thresholds, stop conditions and decision owner locked | Research owner | release measurement plan | `NOT_STARTED` |
| `REL-016` | Security assessment and dependency/image vulnerability review passed | Security/Privacy owner | signed assessment | `NOT_STARTED` |
| `REL-017` | Public documentation, onboarding, help, limitations and support routes reviewed | Product owner | documentation sign-off | `NOT_STARTED` |
| `REL-018` | Final rollout strategy and accountable release commander approved | Product owner | signed rollout plan | `NOT_STARTED` |

## Final release approval

Product, Design, Frontend, Backend/Operations, Safety/Policy, Security/Privacy, and Research must all approve the exact release manifest. Any unresolved critical safety, privacy, security, authorization, data-integrity, accessibility, or rollback defect blocks release.

Current decision: `RELEASE_NOT_READY`.
