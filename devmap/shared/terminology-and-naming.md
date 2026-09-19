# Terminology and Naming

Use accepted product terms exactly: Goal, Project, Task, Routine, RoutineOccurrence, Today, PlanningDraft, Reconcile, CommandResult, PlanningFact, CaptureItem. Do not substitute Todo, Habit, Plan entity, or AI decision where the product does not.

Because C# already has `System.Threading.Tasks.Task`, the domain type may use `TaskItem` in code while API/product copy remains `Task`; this must be consistent within the chosen module.

## Code naming

- C#: PascalCase types/members, camelCase locals/parameters, `I` interface prefix, `Async` for awaitable I/O, file-scoped namespaces.
- TypeScript: PascalCase components/types, camelCase functions/values, `useX` hooks, `xKeys` query-key factories.
- API: plural resource nouns, kebab-case only when multiword routes require it, camelCase JSON, stable uppercase contract enum strings when specified.
- Database: naming convention is not yet reconciled between current EF defaults and canonical snake_case reference; do not mix conventions inside a new schema (`CON-010`/`DEC-014`).
- Files: React components PascalCase; hooks/services/types use descriptive kebab-case or existing agreed convention after `DEC-003`.

Names expose domain meaning. Avoid `Manager`, `Helper`, `CommonService`, `Utils`, `GeneralForm`, or numbered temporary abstractions without a narrow responsibility.
