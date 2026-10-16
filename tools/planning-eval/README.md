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

## Week two (STEP-24)

`--week2` measures the weekly continuation of 029 §3. For each case the runner:

1. approves the first week through the server's preview, acknowledging its warnings;
2. lives it crudely: about 40% of its Tasks done in their order, one dropped, the rest left;
3. brings it to its last day with the loopback-only `POST /api/v1/dev/planning-windows/rewind?days=6&goalId=…` (or `projectId=`). This moves the week and its open dated Tasks;
4. takes the offer from `GET /planning/continuations`, starts the attempt with `continuationOfWindowId`, and answers questions as the persona;
5. stores the week-two draft beside what already existed (Projects, Routines and open Tasks).

Run it on the long-horizon cases:

```sh
node run.mjs --base https://127.0.0.1:7077 --out results/<name>.json --week2 \
  --only konkur,ielts,python,thesis,job-hunt,launch-podcast,side-business,running-10k
```

`score.mjs` adds a week-two section when a run has one:

| Measure | Pass |
|---|---|
| Offered at the end of the first week | every case |
| Approvable without a blocking issue | ≥ 95% |
| The week after the first, from its offered day | every draft |
| A second Goal | 0 |
| An open Task proposed again | 0 |
| An existing Project or Routine proposed again | 0 |
| Planned days outside the next week | 0 |
| An empty new Project | 0 |
| Persian date errors | 0 |

It also reports:

- near repeats: reworded titles that share most words with an open, done or existing item. It is a heuristic, so a person judges them;
- how many week-two Tasks sit under an existing Project;
- the questions asked;
- the items the gate left out (open Tasks proposed again are among them).

The digest shows what was lived, the offer and its counts, and the draft.

**Limits of week two:**

- Routine slots are not lived. The rewind moves the week, not its slots, so the Routine counts are zero.
- The persona answers week-two questions from the same text as week one.

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

## Recorded runs (STEP-22, 2026-10-15)

| File | What it measured |
|---|---|
| `baseline` | Prompt `2026-10-14.1` before STEP-22: 18/32 approvable. |
| `v1-off` | First STEP-22 prompt and gate: 30/32. |
| `v3-off`, `v3-on` | Prompt `2026-10-15.3` with thinking off (31/32) and on with 12000 tokens (27/32, 5 truncated). |
| `v4-a`, `v4-b` | Found a reduced draft that was not judged again (an empty Project reached review). |
| `final-a`, `final-b` | The pilot configuration after the fix: 31/32 each, every bar measure passes. |

## Recorded runs (STEP-24, 2026-10-16)

| File | What it measured |
|---|---|
| `week2-a` | Week two, prompt `2026-10-16.1`, on 8 long-horizon cases. All 8 approvable. 11 questions in 3 cases, some asking again for availability already answered in week one. 21 reworded repeats of existing or done work in 6 cases. |
| `week2-b` | Week two, prompt `2026-10-16.2`: no availability questions, at most one question, no reworded repeats, Routine times in the context. All 8 approvable and 0 questions. 33 of 33 Tasks under an existing Project. Reworded repeats were still 19 in 5 cases, so the prompt rule did not fix them (see STEP-24 in `devmap/development-steps.md`). |
| `step24-all` | The 32 first-week cases on prompt `2026-10-16.2`: 32/32 approvable. Every 029 §10 measure passes. |
