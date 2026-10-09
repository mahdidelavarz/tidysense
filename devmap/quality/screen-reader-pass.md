# Screen-Reader Pass

A person, NVDA and about an hour. Automated tests check roles and names; they cannot tell whether the product makes sense when heard. **State: not done.** Fill in the result column and the record at the end; an unfilled row is an open gap for STEP-12.

## Setup

- Windows, current NVDA, current Firefox or Chrome. NVDA speech set to a Persian voice (eSpeak NG Persian is enough); keep the speech viewer open (NVDA menu → Tools → Speech viewer) so what was announced can be copied into the record.
- The application running with the sample generators (`./dev.ps1 all`), signed in with a fresh account.
- Screen off or eyes away while doing each step. Use `Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`, arrow keys, and NVDA's `H` (headings), `D` (landmarks), `B` (buttons), `F` (form fields).

## What to judge at every step

1. Do you know where you are (page heading, dialog title)?
2. Is every control named by what it does, in Persian?
3. Is a change announced without your looking for it (a saved item, an error, a status)?
4. Does focus go somewhere sensible after an action, and come back when a sheet or dialog closes?
5. Are dates and numbers read in a form a Persian speaker understands?

## Flow 1 — A Task from creation to done

| Step | Expected to hear | Result |
|---|---|---|
| Sign in with phone number and code | the two fields by name; a wrong code announced as an error | |
| Land on Today | the page heading; an empty state that says what to do next | |
| Open "افزودن", choose a Task | a dialog with a title; focus inside it | |
| Fill the title, open the date field, choose tomorrow in the calendar | the calendar's month, each day as a date, the chosen day confirmed | |
| Save | the sheet closes, focus returns to the button that opened it, the new Task is announced or findable by heading | |
| Go to Tasks, open the Task, complete it | its status before and after; the completion announced | |

## Flow 2 — Planning to an applied plan

| Step | Expected to hear | Result |
|---|---|---|
| Open Planning | what the page does; whether drafts are samples or made by AI | |
| (With a real provider only) the consent card | the provider's name, that text leaves the country, the two choices | |
| Write an intention, start | "in queue" then "being made" announced as status, without focus jumping | |
| The draft | the structure as headings and lists; each item's kind, title, date and state; issues tied to the item they belong to | |
| Edit one item in the sheet, exclude another | the change reflected and announced; an excluded item still findable and named as excluded | |
| "مرور نهایی و تأیید" | a dialog; the list of what will be created; a warning that must be acknowledged, tied to its checkbox | |
| Confirm | "برنامه ساخته شد" announced; the optional question read as optional, its five buttons as "n از ۵" with the two ends named | |
| Answer the question | the thanks announced; focus not lost | |

## Flow 3 — Reconcile

| Step | Expected to hear | Result |
|---|---|---|
| Open Reconcile with an overdue Task (plan a Task for today, then set the system date a day ahead, or use an account that already has one) | the severity as words, not colour; the three counts with their labels | |
| The execution lane | each Task with its reason for being here | |
| Choose "move to another day" | a sheet asking for the date, then a preview dialog that says what will change | |
| Confirm | the dialog closes; the result announced; the Task no longer listed | |
| (If offered) open the AI explanation | named as optional; each recommendation says what it would do and that a preview comes first | |
| "پایان بازبینی" | the closed state announced; the optional question as in flow 2 | |
| The privacy page from the account menu | headings for each section; the retention numbers and the contact channel read correctly | |

## Record

| | |
|---|---|
| Date | |
| Person | |
| NVDA and browser versions | |
| Steps that failed (number and what was heard) | |
| Fixes made, and the steps re-run afterwards | |
| Left open, with the reason | |
