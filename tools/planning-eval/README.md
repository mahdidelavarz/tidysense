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

- existing Tasks dated into the week (`existingTaskRef`);
- near repeats: reworded titles that share most words with an open or existing item. Repeats of done work are counted apart, because the next practice of the same kind is often right. It is a heuristic, so a person judges them;
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

## Recorded runs (STEP-24 follow-up, 2026-10-16)

Prompt `2026-10-16.6`, repair policy `2026-10-16.7`, context `2026-10-16.3`.

| File | What it measured |
|---|---|
| `week2-c`, `week2-d` | Week two after the follow-up (existing Tasks dated, the Goal's meaning, details captured, next-week gate rules). 8/8 approvable each. 36 and 35 existing Tasks dated, 0 items dropped, 0 new Projects, 1 and 0 questions. Near repeats of open work: 3 and 5, against 19 and 15 before. |
| `followup-all-a`, `followup-all-b` | The 32 first-week cases: 31/32 and 32/32 approvable. Every 029 §10 measure passes, with 0 date errors. Planning details in 7 and 8 drafts. |

On the way, a full run of an earlier build had 3–4 date errors. They were traced to a calendar without the days after the window, which was fixed. On 10 date-sensitive cases × 3, the previous prompt then had 5 errors and the fixed one 0. Those intermediate runs are not kept.

## Made again from the review (2026-10-19)

`--redo "<correction>"` makes each first draft again with that correction, as «اصلاح» does; `--redo` alone asks for another version, as «نسخهٔ دیگر» does. `score.mjs` adds a section: drafted without a question (≥ 95%), approvable (≥ 95%), the same number of Goals, no empty parent, no date error, and how many dated Tasks and Task titles changed. Another version keeps at most a third of the first draft's Task titles.

| File | What it measured |
|---|---|
| `redo-correct-1` | Prompt `2026-10-19.1`, «کارهای این هفته را کمتر و سبک‌تر کن» on the 32 cases. 31/32 made again and approvable (one `DRAFT_INVALID`: the model's answer was not one JSON object, twice). Fewer dated Tasks in 29 of 31 (152 → 83), Goals kept in all, 0 date errors in the redone drafts. One first draft wrote «پنجشنبه ۱ آبان ۱۴۰۵», a Friday, in an assumption. |
| `redo-again-1` | Prompt `2026-10-19.1`, another version. 32/32 approvable, but 172 of 220 Task titles were kept: given the whole draft, the model copied it. Prompt `2026-10-19.2` gives another version only the titles and allows at most a third of them (`redo-again-2`). |

| `redo-correct-2` | Prompt `2026-10-19.2`, model `deepseek-flash`, the same correction. Every bar passes: 32/32 made again and approvable, fewer dated Tasks in 30 of 32 (168 → 90), Goals kept, 0 date errors (first drafts included). |
| `redo-again-2` | Prompt `2026-10-19.2`, `deepseek-flash`, another version. Every first-week bar passes, 32/32 made again and approvable, but 97 of 241 Task titles were kept (40%, against 78% before): above the third. Most cases change nearly everything (0 kept in 8 cases); a few fixed procedures keep all their steps (`thesis` 9/9, `job-hunt` 8/8, `tax-filing` 6/6). |
| `pro-5` | `deepseek-v4-pro` on five first-week cases, capped at 5 attempts (6 calls used). 5/5 approvable, but smaller and flatter plans: `konkur`, a year away, got one Project instead of phases (Flash: three), and fewer, vaguer Tasks. Not better than Flash for this prompt, and dearer. |

On 2026-10-20 the provider accepts only `deepseek-flash` (V4.1 Flash) and `deepseek-v4-pro`; `deepseek-v4-flash` is routed to `deepseek-flash`, so every run before was already on V4.1 Flash. The configuration now names `deepseek-flash`. The three runs together cost about $0.35.

## Directions instead of another version (2026-10-21)

The exact-title count let a reworded copy pass. `score.mjs` now also counts a Task title as reworded when it is near a first-draft title (the week-two heuristic), and the another-version bar counts both. Re-scored, `redo-again-2` keeps or rewords 177 of 241 titles (73%), not 97 (40%): ielts and garden, for example, are the same steps in other words. The review no longer offers another version without a direction. Its three directions are corrections:

| Direction | Correction sent | Score with |
|---|---|---|
| «سبک‌تر» | `کارهای این هفته را کمتر و سبک‌تر کن` (the `redo-correct-2` correction) | `score.mjs` |
| «فشرده‌تر» | `برنامه را فشرده‌تر کن: این هفته کارهای بیشتری بگذار تا هدف زودتر پیش برود` | `score.mjs`, expect more dated Tasks |
| «روش دیگر» | `با روشی متفاوت به همین هدف برس: ترتیب و نوع کارها عوض شود، نه فقط کلمه‌هایشان`, run with `--different-way` | `score.mjs --different` |

Measured on 2026-10-21 and 2026-10-22 with `deepseek-flash` (about $0.6 in all):

| File | What it measured |
|---|---|
| `redo-different-1` | «روش دیگر», prompt `2026-10-19.2`. 32/32 approvable, but 104 of 245 Task titles kept or reworded (42%): above the third, 15 of 32 cases within it. Learning goals changed method (`konkur`: a diagnostic test and a mistake notebook first); fixed procedures came back reworded (`thesis` 9/9, `renovate-kitchen` 9/10, `party` 5/6). |
| `redo-denser-1` | «فشرده‌تر», the same prompt. Dated Tasks 152 → 230, more in 30 of 32. A small goal got invented work: `one-task` («زنگ به بانک») 1 → 4 Tasks, `precise` 0 → 6. |
| `redo-different-2`, `redo-denser-2` | A trial prompt with two rules (change the method, not the words, or say there is no other way; add no invented work to a small goal). 95 of 246 kept or reworded (39%), no case said there was no other way; `one-task` 2 → 5. Not kept. |
| `redo-different-3` | «روش دیگر» with reasoning on (the trial prompt). 43 of 275 kept or reworded (16%), 26 of 32 within a third, every bar passes. The plans really change (`ielts` starts from writing and speaking, `job-hunt` from talking to people in the field, `tax-filing` from the pre-filled return). Redo median about 35 s against 10 s, first drafts 55 s against 17 s, about 2.4× the cost. |
| `redo-denser-3` | «فشرده‌تر» with reasoning on, 10 cases. Small goals still padded (`one-task` 1 → 4, `sleep` 0 → 5). |

So only «روش دیگر» reasons (`differentWay` in the redo request; `ThinkingMaxOutputTokens`, `ThinkingInvocationTimeoutSeconds` and `ThinkingOperationDeadlineSeconds` bound it), and the review offers «فشرده‌تر» only from three Tasks. The trial prompt rules are not kept; prompt `2026-10-19.2` is unchanged.

Before these runs the input cap was 12000 estimated tokens. First drafts already used 11150–11980 of it (about 6000 real tokens: the estimate is about 1.85× the real count), and a redo did not fit at all (`CONTEXT_TOO_LARGE`). The cap is now 20000.
