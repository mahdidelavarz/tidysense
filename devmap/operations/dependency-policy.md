# Dependency Policy

Preference order:

1. existing project capability;
2. existing dependency;
3. small local implementation;
4. new dependency with explicit justification.

Before adding a meaningful package, record:

- the concrete problem and affected modules;
- existing dependency/platform alternatives;
- why a local implementation is insufficient;
- maintenance/release/security posture;
- compatibility with .NET/Node/browser targets;
- runtime, image, bundle and operational impact;
- licensing and transitive dependencies where relevant;
- removal/migration cost.

Do not add overlapping HTTP, state, form, validation, ORM, mapping, logging, date, UI or test stacks. Pin via manifests/lockfiles and review upgrades with tests and migration notes. Security fixes may be expedited but still require compatibility verification.
