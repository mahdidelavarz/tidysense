# Data Types and Date/Time Rules

| Meaning | .NET | PostgreSQL | API |
|---|---|---|---|
| canonical entity/FK ID | `Guid` | `uuid` | opaque UUID string |
| instant | `DateTimeOffset` | `timestamp with time zone` (`timestamptz`) | ISO 8601 with `Z`/offset |
| local date | `DateOnly` | `date` | `YYYY-MM-DD` |
| local wall time | `TimeOnly` | `time` | `HH:mm[:ss]` |
| optimistic version | `long` | `bigint` | opaque numeric token |

Do not use ambiguous local `DateTime` for canonical fields or store a planner date as midnight UTC. The server derives Today/day/week/review/routine boundaries from an explicit clock plus the pilot-wide configured IANA timezone. Npgsql maps `DateTimeOffset` to `timestamptz` and requires UTC offsets when writing; PostgreSQL stores the instant rather than the original textual offset. `DateOnly` maps to `date` without timezone conversion.

Goal/Project `reviewDate`, Task `plannedDate`/`deadline` and target dates are different local-date concepts. Task has no review date. Routine occurrence identity uses local date plus an optional slot.

Persian/Jalali is presentation; persisted/API dates remain ISO Gregorian values representing the same local day. A later per-user IANA zone changes zone selection, not these types or meanings. Prototype `DateTime` data requires an explicit interpretation/conversion migration.

## Related Mind Map

- [Temporal checkpoint baseline](../../mindmap/01-Closed-Discussions/012a-temporal-checkpoint-amendment.md) — canonical time concepts.
- [Execution temporal rules](../../mindmap/01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment.md) and [Routine local dates](../../mindmap/01-Closed-Discussions/015b-routine-local-date-and-daily-occurrence-amendment.md) — Today/Routine boundaries.
- [Routine slot semantics](../../mindmap/01-Closed-Discussions/024-multi-time-daily-routine-scheduling-and-occurrence-semantics.md) — occurrence identity by date and optional time.
