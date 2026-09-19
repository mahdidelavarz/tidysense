# M1 Entry Package

## Status

`READY_FOR_OWNER_REVIEW — IMPLEMENTATION NOT STARTED`

This package instantiates the people, repository boundary, and review decisions required to enter M1. It does not mark any M1 contract `SLICE_LOCKED` and does not authorize production authentication.

## Confirmed project inputs

| Input | Decision | Status |
|---|---|---|
| implementation location | code lives beside the Mind Map in this repository | `CONFIRMED` |
| Backend owner | Reza | `CONFIRMED` |
| Product, Frontend, Product Design, Security/Privacy, Safety/Policy, Pilot Research, Operations/Support owner | Mahdi | `CONFIRMED` |
| paid external design contributor | Alireza | `CONFIRMED` |
| SMS provider | Kavenegar | `CONFIRMED` |

Named ownership is effective for planning when this package is approved. Reza and Mahdi are the only accountable owners. Alireza supplies paid design work but does not hold approval authority or milestone accountability.

## Proposed repository layout

```txt
/
├── 00-Canvas/ ... 06-References/   existing product and decision map
├── app/
│   ├── frontend/                   React application
│   └── backend/                    ASP.NET Core application
├── infra/
│   ├── docker/                     local and deployable service definitions
│   └── nginx/                      edge configuration
└── .github/workflows/              continuous integration
```

The existing Obsidian structure stays at repository root. Application code must link to its governing contracts rather than duplicating product decisions in source comments or package READMEs.

## M1 accountable handoff

| Deliverable | Responsible | Review / approval |
|---|---|---|
| backend scaffold, migrations, auth, ownership enforcement, transaction/outbox foundation | Reza | Mahdi |
| frontend scaffold, typed API boundary, auth states | Mahdi | Reza; Alireza consulted for design fidelity |
| interaction states and accessible auth handoff | Alireza, paid contributor | Mahdi accepts; Reza reviews technical feasibility |
| security/privacy configuration and threat review | Mahdi | Reza |
| product scope and design acceptance | Mahdi | Reza reviews technical impact; Alireza consulted |
| CI, local environment, operational baseline | Mahdi | Reza |

No row means one person may self-approve a high-risk implementation without evidence. Where Mahdi holds two roles temporarily, Reza provides the independent technical review and the dual-role decision is recorded.

## M1 entry sequence

1. Approve [[05-Implementation/m1-configuration-register]].
2. Reza and Mahdi acknowledge their named responsibilities; Mahdi confirms Alireza's design brief and deliverables separately.
3. Mark the four M1 contracts in [[05-Implementation/contract-freeze-register]] `SLICE_LOCKED` only after their listed evidence exists.
4. Scaffold `app/frontend`, `app/backend`, `infra`, and CI with approved manifests.
5. Implement the thinnest authenticated ownership slice and prove it against real PostgreSQL behavior.
6. Run the M1 exit gates in [[05-Implementation/milestone-exit-gate-plan]].

## Entry decision

M1 may start only when this package and configuration register are approved, Reza and Mahdi acknowledge their responsibilities, no required M1 configuration remains `PROPOSED`, production secrets are absent from Git, and implementation begins from current authority rather than a legacy artifact.

Until then, status remains `READY_FOR_OWNER_REVIEW`.
