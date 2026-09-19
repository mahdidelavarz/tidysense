# Required Database Invariant Tests

Use Testcontainers for .NET with a real PostgreSQL container. EF Core's in-memory provider or another compatibility database is not sufficient evidence for these constraints.

## Ownership

1. Project referencing a Goal with another `user_id` fails.
2. Task referencing a Goal with another `user_id` fails.
3. Task referencing a Project with another `user_id` fails.
4. RoutineOccurrence with a different `user_id` than its Routine fails.

## Exclusive parent

5. Task with both `goal_id` and `project_id` fails.
6. Routine with both `goal_id` and `project_id` fails.
7. Standalone Task and Routine with both null succeed.

## Temporal and lifecycle

8. Active Goal without `review_date` fails.
9. Active Project without target/review fails.
10. Scheduled Task without `planned_date` fails.
11. Backlog Task with `planned_date` fails.
12. Backlog Task without `review_date` fails.
13. Terminal Task without `terminal_at` fails.
14. Active Task with `terminal_at` fails.
15. Stopped Routine without `stopped_at` or effective-until date fails.
16. Invalid Routine effective range fails.

## Occurrence

17. Duplicate `(routine_id, scheduled_local_date)` fails.
18. Pending occurrence with `resolved_at` fails.
19. Done/Missed occurrence without `resolved_at` fails.

## Continuation

20. Routine continuing itself fails.
21. Second direct continuation of the same source fails.
22. Application transaction rejects continuation of an ACTIVE source.
23. Application transaction rejects a lineage cycle.

## Concurrency and query contracts

24. Concurrent occurrence creation returns one identity.
25. Stale `@Version` update fails.
26. Today query excludes terminal Tasks with historical planned dates.
27. Overdue query excludes terminal Tasks.
28. Project terminal transaction blocks concurrent child attachment.
29. Bulk command rolls back all rows when one version is stale.

## Lock evidence

The contract must remain `DRAFT` until these tests run against the exact PostgreSQL, Npgsql, and EF Core migration configuration intended for M1. Passing unit tests over mocked repositories is useful, but it is not database invariant evidence. Humans have already invented enough ways to mistake mocks for reality.
