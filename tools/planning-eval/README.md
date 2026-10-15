# Planning evaluation set

The kept measure of AI planning quality ([Discussion 029 §10](../../mindmap/01-Closed-Discussions/029-planning-quality-rolling-horizon-and-sequences.md), STEP-22). Re-run it after every change to the planning prompt, the output contract, the draft rules or the model configuration, and compare with the last recorded run before keeping the change.

## Files

- `cases.json`: the evaluation intentions, written in Persian.
  - Each case has a `persona`, the facts a real user would give when asked.
  - Some cases have `publicFacts`: patterns of questions the model must not ask, because the answer is public (an exam date, which «عید»).
- `run.mjs`: sends every case through the real planning endpoints of a running backend and stores the result.
  - Questions are answered the way the persona would. An option is chosen when it shares words with the persona; otherwise the persona is written in «خودت بنویس».
- `score.mjs`: checks a stored run against the bar and writes a digest for a person to judge usefulness.
- `results/`: recorded runs. Keep the runs that are cited as evidence in `devmap/development-steps.md`.

## Running

1. Start a backend in Development, on loopback, with the planning provider configured.
   - The run uses the development test session, so it must be loopback.
   - Use limits that let 32 flows through: `Ai__Planning__Provider`, the provider key in `Ai__Providers__<provider>__ApiKey`, `Ai__Planning__AttemptsPerUserPerHour=1000`, `Ai__Planning__AttemptsPerUserPerDay=1000`, `Ai__Planning__DailyBudgetUsd=5`.
   - Use a fresh database, because all cases share the one test account.
2. Run the cases in order (about 5–15 minutes):

   ```sh
   node run.mjs --base https://127.0.0.1:7077 --out results/<name>.json --label "<what changed>"
   ```

3. Score the run and write the digest:

   ```sh
   node score.mjs results/<name>.json --digest results/<name>.md
   ```

## The bar (029 §10)

| Measure | Pass |
|---|---|
| Drafts approvable without a blocking issue | ≥ 95% |
| Entity-type questions | 0 |
| Drafts asking a public fact | ≤ 10% |
| Drafts with an empty Goal or Project | 0 |
| Persian date errors in drafted text and questions | 0 |
| Median time to draft, with 15 s allowed for a person per question | < 120 s |

The run also reports:

- turns and questions per draft, so a drift towards asking more stays visible;
- items left out by the gate (029 §8);
- outright failures.

Usefulness is not scored automatically. Read the digest.

## Limits

- The persona's answers come from a crude word match. A real person answers better, so the turn and question counts are an upper bound.
- The date check covers a written day and Persian month, with an optional weekday or Gregorian date beside them. It is checked against the nearest such date after the run.
- Nothing is stored about real users. The cases are invented.
