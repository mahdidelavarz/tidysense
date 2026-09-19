# Technical Debt Policy

Debt is an explicit bounded tradeoff, not an undocumented shortcut.

A debt record must state: current limitation, reason, affected contract/risk, safe boundary, owner, trigger/deadline, and removal evidence. Debt may not waive authorization, ownership, data integrity, migration safety, secret handling, accessibility of critical flows, or accepted product behavior.

Avoid premature abstraction. A new reusable abstraction normally needs demonstrated repetition, stable semantics, clear reduction in duplication/complexity, and preserved readability. Document its problem, scope, exclusions, and why existing code is insufficient.

Under-abstraction warning signs: duplicate API clients/query-key schemes, repeated auth checks with different semantics, multiple error normalizers, scattered raw tokens/colors, or lifecycle logic copied into controllers/components.

Over-abstraction warning signs: generic repositories hiding required queries/locks, universal forms/hooks, deeply parameterized components, provider-neutral layers before a stable port exists, and factories that erase domain names.
