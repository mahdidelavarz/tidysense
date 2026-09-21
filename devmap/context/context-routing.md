# Context Routing

Always start with `/AGENTS.md`, `active-conventions.md`, and the requested entry in `../development-steps.md`. Then use the smallest applicable route below.

| Task type | Minimum DevMap context | Product context | Source scope |
|---|---|---|---|
| authentication/security | `../backend/auth-security-transactions.md`, `../shared/api-contracts.md`, `../shared/error-contract.md`, `../backend/testing.md` | auth spec and retained auth/API decisions linked by the step | auth controller/services/options, user/OTP persistence, auth UI/tests |
| new backend module | `../04-module-implementation-loop.md`, `../backend/architecture.md`, `../backend/domain-model-and-persistence.md`, `../backend/api-validation-errors.md` | only the module sources listed by its step | closest feature pattern plus affected persistence/API/tests |
| frontend feature | `../frontend/stack-architecture-folder.md`, `../frontend/routing-state-api.md`, `../frontend/forms-components-pages.md`, `../frontend/design-system-accessibility.md` | module flow/spec listed by its step | feature route/components/service/hooks/tests |
| API/contract change | `../shared/api-contracts.md`, `../shared/error-contract.md`, `../workflows/new-api.md` | owning API/lifecycle source | DTO, endpoint, generated OpenAPI/types and consumers |
| schema/persistence | `../workflows/schema-change.md`, `../backend/domain-model-and-persistence.md`, `../operations/migrations-and-deployment.md`, `../backend/testing.md` | owning entity/invariant sources | EF model, migration, affected queries and PostgreSQL tests |
| temporal logic | `../shared/data-types-and-datetime.md`, `../backend/domain-model-and-persistence.md` | relevant Task/Today/Routine/Reconcile sources listed by the step | clock, temporal rules, persistence and boundary tests |
| AI Planning/Reconcile | `../02-architecture.md`, `../backend/architecture.md`, `../backend/auth-security-transactions.md`, `../shared/api-contracts.md`, `../backend/logging-observability.md` | AI guardrails, runtime, structured-output and flow sources listed by the step | relevant orchestration port/adapter, validators, manifests and tests |
| bug fix | `../workflows/bug-fix.md` plus the implicated authority | only when behavior is unclear or disputed | failing path and regression tests only |
| local environment | `../workflows/local-development.md`, `../operations/environments-and-configuration.md` | none unless a product boundary changes | scripts/configuration and affected startup tests |
| step review | requested step plus `../quality/definition-of-done.md` | sources linked by that step | evidence links and changed code only |

For an architectural decision, also read `../decisions/README.md`; create an ADR only when its stated threshold is met. Stop on a material unresolved conflict rather than broadening context speculatively.
