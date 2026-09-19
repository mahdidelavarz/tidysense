# Data Types and Date/Time Rules

| Meaning | .NET | PostgreSQL | API |
|---|---|---|---|
| canonical entity/FK ID | `Guid` | `uuid` | opaque UUID string |
| instant | `DateTimeOffset` | `timestamptz` | ISO 8601 with `Z`/offset |
| local date | `DateOnly` | `date` | `YYYY-MM-DD` |
| local wall time | `TimeOnly` | `time` | `HH:mm[:ss]` |
| optimistic version | `long` | `bigint` | opaque numeric token |

Do not use ambiguous local `DateTime` for canonical fields or store a planner date as midnight UTC. The server derives Today/day/week/review/routine boundaries from an explicit clock plus the pilot-wide configured IANA timezone. Instants persist with Npgsql UTC-compatible semantics.

Goal/Project `reviewDate`, Task `plannedDate`/`deadline` and target dates are different local-date concepts. Task has no review date. Routine occurrence identity uses local date plus an optional slot.

Persian/Jalali is presentation; persisted/API dates remain ISO Gregorian values representing the same local day. A later per-user IANA zone changes zone selection, not these types or meanings. Prototype `DateTime` data requires an explicit interpretation/conversion migration.
