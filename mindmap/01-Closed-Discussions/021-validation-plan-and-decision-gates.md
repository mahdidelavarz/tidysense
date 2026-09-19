# Discussion 021 — Validation Plan and Decision Gates

## Status

Accepted and closed.

This document is the authoritative resolution for Discussion 021.

Accepted dependencies:

- [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]]
- [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]]
- [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]
- [[01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration]]
- [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]]
- [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]]

---

## 1. Governing Principle

The first pilot evaluates whether the bounded AI-assisted Creation and Reconcile loops are useful, understandable, reliable, and safe enough to continue.

Pilot metrics are descriptive unless a later design explicitly supports causal inference.

Positive productivity or conversion metrics never override safety, privacy, reliability, or trust failures.

Every metric must declare:

- unit of analysis,
- numerator,
- denominator,
- eligible population,
- exclusions,
- observation window,
- missing-data behavior,
- segmentation fields.

Thresholds, classifiers, exclusions, severity rules, and decision logic are locked before pilot outcome data is reviewed.

---

## 2. Formal Hypotheses

### H1 — AI-Assisted Creation

Users can reach a useful, credible, non-trivial first plan through bounded AI assistance.

H1 evidence must cover:

- reachability of a reviewable PlanningDraft,
- usefulness of the resulting plan,
- trust-boundary comprehension,
- successful deterministic application,
- non-trivial execution structure,
- immediate regret or reversal.

### H2 — AI-Assisted Reconcile

Users can reduce unresolved work into fewer understandable, user-approved decisions without replacing deterministic facts or mutation authority.

H2 evidence must cover:

- deterministic Reconcile availability,
- explanation availability where eligible,
- explicit recommendation disposition,
- successful deterministic application,
- unresolved-work reduction,
- comprehension,
- manual escape from failed or degraded AI flows,
- regret or reopening.

---

## 3. Unit and Lifecycle Separation

The following remain distinct and must never be collapsed:

```txt
eligible exposure
→ logical attempt/session
→ valid AI output
→ reviewable resource
→ explicit confirmation/disposition
→ deterministic command
→ authoritative CommandResult
```

Operational failure is not user rejection.

Confirmation or recommendation acceptance is not mutation success.

Duplicate retries sharing the same accepted idempotent identity remain one logical attempt.

---

## 4. Metric Classes

Metrics are reported as:

- behavioral,
- self-reported,
- operational,
- safety/trust.

No hypothesis passes from one metric class alone.

Edited acceptance remains AI-assisted but is reported separately from unchanged acceptance.

Internal, seeded, demo, QA, synthetic, and close-collaborator accounts are excluded from primary pilot metrics and reported separately.

---

## 5. H1 Required Metrics

The pilot must report at minimum:

- eligible attempt rate,
- reviewable draft rate,
- explicit draft disposition rate,
- unchanged acceptance rate,
- edited acceptance rate,
- applied plan rate,
- useful first plan rate,
- time to reviewable draft,
- trust-boundary comprehension,
- immediate regret or reversal rate.

A useful first plan requires all of:

1. positive locked usefulness response,
2. successful CommandResult,
3. survival through the locked observation window,
4. deterministic non-triviality.

A result is not non-trivial merely because it was accepted.

Non-triviality is determined from canonical structure and events, never an AI judgment over raw text.

---

## 6. H2 Required Metrics

The pilot must report at minimum:

- eligible Reconcile start rate,
- deterministic Reconcile availability,
- AI explanation availability among eligible sessions,
- recommendation disposition rate,
- unchanged and edited recommendation acceptance,
- applied recommendation rate,
- unresolved-work reduction,
- Reconcile understanding score,
- reopen or regret rate,
- manual escape success.

### Decision Compression Ratio

Decision Compression Ratio is descriptive only.

It must never independently determine pass, weak success, or failure.

Higher compression is not automatically better because it may hide materially distinct decisions.

---

## 7. Reconcile Severity Segmentation

Every ReconcileSession receives one immutable deterministic pre-session severity band:

- Light,
- Medium,
- Recovery.

Severity is not inferred from user satisfaction or post-session outcome.

Each band is reported separately.

A band below its locked minimum exposure remains inconclusive and must not be opportunistically merged after results are seen.

Primary conclusions also cap or separately report repeated contributions from highly active users so a small number of users cannot dominate the pilot.

---

## 8. Regret and Reversal Classification

A reversal counts as regret-associated only when both conditions hold:

1. it occurs inside the locked short regret window,
2. user attribution indicates the original accepted recommendation or plan was wrong, misleading, or unsuitable at acceptance time.

Accepted attribution sources include:

- explicit reversal reason,
- post-action prompt,
- moderated interview,
- tagged direct user feedback.

Reversals are classified as:

```txt
REGRET_ASSOCIATED
CONTEXT_CHANGED
UNCLASSIFIED_REVERSAL
```

A later deadline, priority, health, work, or life-context change is not automatically regret.

Missing attribution remains unclassified rather than being conveniently assigned to whichever category improves the slide deck.

---

## 9. Trust-Boundary Comprehension

Trust comprehension cannot be established by quiz answers alone.

The pilot must cross-check comprehension answers against moderated observed behavior.

Behavioral checks include whether the user understands that:

- AI output is provisional,
- confirmation is required,
- confirmation does not prove command success,
- `ACCEPTED` does not mean `APPLIED`,
- conflict requires refresh or rebase,
- manual and deterministic escape paths remain available.

Mismatch categories are reported explicitly:

```txt
QUIZ_PASS_BEHAVIOR_FAIL
QUIZ_FAIL_BEHAVIOR_PASS
CONSISTENT_PASS
CONSISTENT_FAIL
```

`QUIZ_PASS_BEHAVIOR_FAIL` is a material UX/trust finding and cannot be hidden inside an aggregate quiz score.

---

## 10. Manual Escape Success

Manual Escape Success measures whether users can continue through deterministic or manual product paths after AI failure, degradation, rejection, or unavailability.

It is a required H2 decision metric.

```txt
Manual Escape Success below the locked weak-success threshold
→ H2 Failure
```

Low Manual Escape Success also prevents a Strong Success classification even when other H2 metrics are positive.

An AI flow that performs well only when nothing goes wrong is not a successful workflow. It is a demo.

---

## 11. Hard Gate — Crisis Safety Readiness

### 11.1 Gate Authority

Crisis Safety Readiness is a mandatory pre-pilot release gate promised by Discussions 013, 019C, and 020A.

It has only two outcomes:

```txt
PASS
BLOCKED
```

There is no weak pass, conditional pass, or proceed-with-caution state.

Any failure blocks the entire pilot rollout, not merely Planning, Reconcile, or one AI capability.

### 11.2 Required Detection Path

Test evidence must prove that eligible crisis or self-harm content routes through:

```txt
DomainSafetyClassificationPort
→ closed crisis classification
→ SAFETY_FALLBACK
```

The request must not continue through normal Planning or Reconcile generation.

### 11.3 Zero Proposal Leakage

For the approved crisis evaluation corpus:

```txt
PlanningDraft creation rate = 0
Reconcile AI explanation creation rate = 0
ActionConfirmation creation rate = 0
canonical mutation rate = 0
```

Any leakage fails the gate.

### 11.4 Real Crisis Resources

Before pilot launch:

- crisis copy is final and reviewed,
- applicable resources are real rather than placeholders,
- locale/country behavior is specified,
- unknown-location fallback is specified,
- unavailable-resource behavior is specified,
- disclaimers do not replace actionable resources,
- no generic incomplete placeholder remains in the release path.

### 11.5 Classifier Failure Behavior

If safety classification is unavailable, timed out, invalid, rate-limited, or killed:

```txt
fail closed
→ no PlanningDraft
→ no Reconcile explanation
→ no confirmation
→ safe fallback presentation
```

### 11.6 Required Adversarial Corpus

The release corpus includes at minimum:

- explicit crisis language,
- indirect language,
- euphemisms,
- spelling mistakes and spacing variants,
- mixed-intent requests,
- imported hostile text,
- prompt injection inside descriptions,
- planning requests containing crisis language,
- known benign phrases likely to create false positives.

Tests must report both leakage and false-positive behavior.

False positives may require classifier or UX improvement, but false-negative proposal leakage blocks release immediately.

### 11.7 Crisis Observability and Privacy

Evidence must prove that:

- required restricted events are emitted,
- raw crisis text is absent from ordinary analytics,
- ordinary joins, segmentation, personalization, and engagement analytics are forbidden,
- retention and access follow 019C restricted-data rules,
- alerting and audit access work as specified.

### 11.8 Human Sign-Off

The gate requires recorded sign-off from:

- Product owner,
- Safety/Policy owner,
- Engineering owner.

Automated test success without human sign-off does not authorize rollout.

---

## 12. Other Hard Gates

The following also block the applicable pilot or capability regardless of positive conversion metrics:

- critical privacy or access-control failure,
- canonical mutation without explicit confirmation,
- acceptance or confirmation represented as successful mutation,
- partial or invalid AI output becoming reviewable,
- unresolved or cyclic temporary references reaching review,
- repeated provider calls beyond accepted retry policy,
- provider spend cap or kill-switch enforcement failure,
- restricted crisis events used for ordinary analytics,
- severe trust-boundary confusion,
- deterministic Reconcile unavailable without correct degraded-state behavior,
- manual escape path absent or unusable.

Hard-gate failures are reported separately from H1/H2 metric classifications.

---

## 13. Threshold and Analysis Locking

Before pilot outcome data is reviewed, a versioned signed analysis plan locks:

- metric definitions,
- event mappings,
- denominators,
- exclusions,
- observation windows,
- regret window,
- non-triviality classifier,
- severity classifier,
- minimum sample and exposure rules,
- Strong/Weak/Failure/Inconclusive thresholds,
- qualitative coding scheme,
- hard-gate evidence checklist,
- decision matrix.

Any post-lock change requires:

1. explicit amendment,
2. reason and author,
3. timestamp,
4. impact analysis,
5. separate reporting of pre-change and post-change analyses.

Thresholds may not be tuned after seeing pilot outcomes and then described as predeclared.

---

## 14. Evidence and Sample Rules

The pilot combines:

- event-derived metrics,
- operational reliability evidence,
- moderated observation,
- structured interviews,
- targeted comprehension checks,
- crisis and adversarial release tests.

A result is Inconclusive when required minimum exposure, user diversity, event completeness, or observation windows are not met.

Inconclusive does not mean weak success and does not authorize broad rollout.

The pilot does not claim statistical power unless a separate sampling design supports that claim.

Manual-vs-AI, severity-band, and edited-vs-unchanged comparisons remain descriptive unless randomized or otherwise causally identified.

---

## 15. Decision Matrix

### Crisis or Other Hard Gate Fails

```txt
any H1 result + any H2 result
→ BLOCK pilot
→ remediate gate
→ rerun affected release evidence
```

### H1 Strong / H2 Strong

Continue both capabilities into the next controlled rollout stage, subject to Discussion 022 readiness gates.

### H1 Strong / H2 Weak or Failure

Continue Creation within controlled scope.

Reduce, redesign, or disable AI-assisted Reconcile while preserving deterministic/manual Reconcile.

### H1 Weak or Failure / H2 Strong

Continue Reconcile within controlled scope.

Reduce or redesign AI-assisted Creation while preserving manual planning.

### One Hypothesis Inconclusive

Continue only the supported capability if its evidence and all hard gates pass.

Collect more evidence for the inconclusive capability without changing locked thresholds retroactively.

### Both Inconclusive

No thesis confirmation.

Improve recruitment, instrumentation, exposure design, or observation duration before another pilot.

### Both Fail

Reconsider the AI-assisted product thesis and reduce scope rather than merely adjusting prompts or UI copy.

---

## 16. Forbidden Claims

Pilot reporting must not claim that AI:

- causes better planning outcomes,
- increases productivity,
- improves wellbeing,
- reduces stress,
- improves retention,
- outperforms manual planning,
- is safer than another approach,
- works for all severity bands,
- is clinically effective,
- generalizes beyond the observed population,

unless a separate design supports that claim.

The pilot may report descriptive observations such as:

- completion rates,
- acceptance and edit rates,
- applied-command rates,
- observed comprehension,
- self-reported usefulness,
- operational reliability,
- qualitative themes,
- crisis release-gate results.

---

## 17. Required Pilot Analysis Output

The pilot report must include:

1. locked analysis-plan version,
2. participant and exposure flow,
3. exclusions and missing data,
4. H1 metric table with denominators,
5. H2 metric table with denominators,
6. severity-band breakdown,
7. operational failure-class distribution,
8. edited versus unchanged outcomes,
9. regret classifications,
10. quiz/behavior trust mismatch table,
11. Manual Escape Success,
12. qualitative themes and contradictory evidence,
13. crisis gate evidence and sign-offs,
14. all other hard-gate outcomes,
15. threshold classification,
16. decision-matrix result,
17. limitations and forbidden claims reminder.

Aggregate success percentages without their denominators are prohibited.

---

## 18. Final Accepted Decisions

Accepted:

- descriptive pilot evaluation rather than unsupported causal inference,
- explicit stage and denominator separation,
- behavioral, self-reported, operational, and safety/trust evidence,
- unchanged and edited acceptance reported separately,
- deterministic non-triviality classification,
- immutable Reconcile severity segmentation,
- minimum-exposure and user-contribution controls,
- regret attribution separated from ordinary context change,
- quiz results cross-checked against observed behavior,
- Decision Compression Ratio descriptive only,
- Manual Escape Success as an H2 failure criterion,
- mandatory Crisis Safety Readiness release gate,
- zero crisis proposal/explanation/confirmation/mutation leakage,
- fail-closed classifier behavior,
- real localized crisis resources before rollout,
- privacy-restricted crisis observability,
- Product + Safety/Policy + Engineering sign-off,
- hard gates overriding positive conversion metrics,
- threshold and classifier locking before outcome review,
- explicit Strong/Weak/Failure/Inconclusive decision matrix,
- prohibited causal and generalized claims.

---

## 19. Mind Map Impact

### Traction Metrics

Add:

- H1 Creation funnel with explicit denominators,
- H2 Reconcile funnel with explicit denominators,
- edited versus unchanged acceptance,
- applied-command success,
- useful non-trivial plan rate,
- regret classifications,
- trust quiz/behavior mismatch,
- Manual Escape Success,
- severity-band reporting,
- operational failure distribution.

### AI Guardrails

Add:

- Crisis Safety Readiness hard gate,
- zero proposal leakage requirement,
- fail-closed classifier behavior,
- no ordinary analytics over crisis events,
- real crisis resources and locale fallback,
- mandatory human sign-off,
- hard gates override positive aggregate metrics.

### Current Decisions

Add:

- pilot evidence is descriptive,
- denominators and thresholds are predeclared,
- compression is descriptive only,
- low manual escape is H2 failure,
- regret requires user attribution,
- quiz comprehension requires behavioral cross-check,
- any crisis gate failure blocks the entire pilot.

### Open Questions

None remain inside Discussion 021.

Numeric pilot thresholds and rollout execution details must be instantiated in the signed pilot analysis plan and [[01-Closed-Discussions/022-updated-mvp-implementation-plan|Discussion 022]] readiness artifacts without weakening this resolution.

---

## 20. Affected Specifications and Artifacts

Create or update:

- pilot metric dictionary,
- event-to-metric mapping,
- signed threshold-lock record,
- non-triviality classifier specification,
- Reconcile severity classifier specification,
- regret attribution rubric,
- trust observation and mismatch rubric,
- manual escape test plan,
- Crisis Safety Readiness test corpus,
- crisis resource and localization specification,
- crisis observability audit checklist,
- crisis release sign-off record,
- pilot analysis template,
- [[01-Closed-Discussions/022-updated-mvp-implementation-plan|Discussion 022]] rollout readiness checklist.

---

## 21. Closure

Discussion 021 is closed.

Pilot rollout is forbidden until the Crisis Safety Readiness gate and all other applicable hard gates pass under the locked analysis and release plan.

Implementation sequencing, numeric threshold instantiation, evidence collection, and rollout readiness remain governed by [[01-Closed-Discussions/022-updated-mvp-implementation-plan|Discussion 022]] and may not weaken these gates.

---

## خلاصهٔ فارسی

این بحث برنامهٔ نهایی اعتبارسنجی MVP و قواعد تصمیم‌گیری برای pilot را مشخص می‌کند. دو فرضیهٔ اصلی، مفیدبودن Planning مبتنی بر AI و مفیدبودن Reconcile مبتنی بر AI هستند؛ اما معیارهای بهره‌وری یا پذیرش هرگز نمی‌توانند شکست در ایمنی، حریم خصوصی، قابلیت اطمینان یا درک مرز اعتماد را جبران کنند. واحد تحلیل، numerator، denominator، نسخهٔ تعریف معیار و thresholdها باید پیش از مشاهدهٔ نتیجه قفل شوند.

Crisis Safety Readiness یک hard gate سراسری است. هرگونه نشت پیشنهاد، توضیح، confirmation یا mutation در مسیر بحران، شکست classifier، نبود منابع واقعی و محلی‌شده یا نبود تأیید انسانی، کل pilot را متوقف می‌کند. معیارهایی مانند Decision Compression فقط توصیفی‌اند؛ پشیمانی باید توسط کاربر نسبت داده شود؛ و پاسخ پرسش‌نامهٔ اعتماد باید با رفتار واقعی مقایسه شود.

نتیجهٔ pilot می‌تواند ادامه، محدودسازی، بازطراحی یا توقف هرکدام از قابلیت‌های Planning و Reconcile باشد. اجرای thresholdهای عددی، جمع‌آوری شواهد و readiness عملیاتی در بحث ۰۲۲ انجام می‌شود، بدون آنکه hard gateهای این سند تضعیف شوند.
