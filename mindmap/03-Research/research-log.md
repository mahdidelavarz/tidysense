# Research Log

> [!IMPORTANT]
> This file contains non-authoritative evidence and research questions. It may support hypothesis design but cannot authorize product behavior, safety claims, or implementation scope. Current hypotheses and decision gates are owned by [[01-Closed-Discussions/021-validation-plan-and-decision-gates]]. Decision authority is indexed by [[02-Decisions/accepted-decision-inventory-001-021]].

## Purpose

Track evidence behind the Adaptive Planner assumptions.

Research should not be dumped into the project like a pile of PDFs nobody reads. Each source needs a claim, relevance, and confidence label.

## Confidence Labels

| Label | Meaning |
|---|---|
| Verified | Strong enough to support a product assumption |
| Useful but unverified | Interesting, but needs more validation |
| Weak external support | Real external source, but limited transferability or weak evidence base |
| Theoretical support | Helpful framing, not direct proof |
| Anecdotal but direct | Real user-language evidence, useful for problem discovery but not scientific proof |
| Internal model | Product reasoning model that still needs external support |

## Current Research Themes

### 1. Zeigarnik Effect

Claim:

Unfinished tasks can remain mentally active and create cognitive load.

Relevance:

Supports the idea that unresolved tasks can create mental friction and return avoidance.

Confidence:

Theoretical support.

### 2. Rumination and Sleep Disruption

Claim:

Unfinished goals and task-related rumination may interfere with sleep or mental recovery.

Relevance:

Supports the emotional weight of unfinished tasks.

Confidence:

Useful but unverified for this product.

### 3. Planner Abandonment

Claim:

Users often abandon task tools when overdue lists become emotionally heavy or cluttered.

Relevance:

Directly supports the core pain hypothesis.

Confidence:

Anecdotal but direct. Needs user interviews/test data before becoming a validated product assumption.

Related file:

- [[06-References/social-evidence]]

### 4. Existing Tool Patterns

Observation:

Some tools preserve past tasks and overdue views in ways that may help some users but shame or overwhelm others.

Relevance:

Helps position reconcile-on-open as a restart mechanism.

Confidence:

Useful but unverified.

### 5. Habit Formation — Lally et al.

Source:

Lally et al. — *How are habits formed: Modelling habit formation in the real world*.

Link:

https://doi.org/10.1002/ejsp.674

Claim:

Habit formation varies substantially between people and usually takes longer than simplistic "21 days" claims.

Relevance:

The MVP should not overvalue short streaks or assume stable behavior after a few days. Adaptive planning should treat habit formation as gradual and variable.

Confidence:

Useful but unverified for this product until tested with target users.

### 6. Confidence Scoring Framework

Claim:

The product should progressively increase confidence as it observes repeated, stable behavior patterns.

Relevance:

Supports gated AI suggestions and later AI Knowledge Level UI.

Confidence:

Internal model for Phase 1. Use simple rule-based gating, not Bayesian scoring.

Working idea:

```txt
Tier 0 — Insufficient data
No personalized suggestions.

Tier 1 — Early signal
Pattern repeated 2–3 times across separate days.
Only light, hedged suggestions allowed.
```

Do not implement Tier 2 / Tier 3 confidence in Phase 1. A 14-day, 10–20 tester validation window does not responsibly support stronger pattern claims.

### 7. Progressive Bayesian Confidence — Weak External Support Only

Source:

Richik Chakraborty — *Progressive Bayesian Confidence Architectures for Cold-Start Personal Health Analytics: Formalizing Early Insight Through Posterior Contraction and Risk-Aware Interpretation*.

Link:

https://arxiv.org/abs/2601.03299

Claim:

Confidence should scale with active observations and uncertainty, not calendar time alone.

Relevance:

Conceptually relevant to AI confidence gating and cold-start personalization.

Limitations:

- Jan 2026 preprint
- single-author
- synthetic-data-only evaluation
- focused on personal health analytics, not productivity planning
- not a consensus method
- too much engineering overhead for Phase 1

Confidence:

Weak external support.

Product decision:

Do not implement Bayesian confidence scoring in Phase 1.

Use rule-based confidence gates first:

```txt
No data → no suggestions
Enough events → summaries only
Repeated pattern across separate days → light suggestion
```

This keeps the MVP explainable, cheap to build, and harder to fool with fake precision. Humanity may yet recover.

## Needed Research

- User interviews with people who abandoned Notion/Todoist/TickTick.
- Evidence around restart behavior after failure.
- Research on self-compassion vs shame in behavior change.
- Evidence on implementation intentions.
- Evidence on planning fallacy and task breakdown.
- Better-tested methods for user-model confidence and confidence gating.
- Product examples that expose AI/user-model confidence transparently.

## Research Entry Template

```md
# Source Title

## Link

## Claim

## Relevance to Product

## Confidence Label

## Notes
```
