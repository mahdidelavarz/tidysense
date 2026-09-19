# Data Types and Date/Time Rules

## Types

| Meaning | Backend | Database | API | Frontend |
|---|---|---|---|---|
| canonical ID | `OPEN` (`Guid` or numeric) | `OPEN` (`uuid` or numeric) | opaque stable scalar | branded/feature ID type after `DEC-012` |
| instant | `OPEN` (`DateTimeOffset` or strict UTC `DateTime`) | `timestamptz` | ISO 8601 with offset/`Z` | string parsed only when needed |
| local date | `DateOnly` | `date` | `YYYY-MM-DD` | calendar-date string/value |
| local time | `TimeOnly` | `time` | `HH:mm[:ss]` | local-time string/value |
| version | `long` | `bigint` | integer/string per locked contract | opaque comparison value |
| money/cost | explicit decimal/minor units | numeric/bigint | explicit unit | never binary float for authority |

## Temporal rules

- Never use `DateTime.Now` or browser-local `new Date()` as canonical Today.
- Resolve `DEC-013` once and use the selected CLR instant type consistently.
- The server derives current local date from an explicit authoritative timezone and clock.
- Store instants as UTC/offset-aware; do not store a local date as midnight UTC.
- `plannedDate`, `reviewDate`, `deadline`, and `targetDate` are distinct concepts and are not interchangeable.
- Routine identity uses recurrence timezone and local scheduled identity; Discussion 024 changes multi-time occurrence identity and must be consolidated before implementation.
- Today includes only items satisfying the accepted date/state rules; it is a derived view.
- Week boundaries and calendar display depend on `DEC-008`.

Persian/Jalali is a presentation concern unless an accepted product decision states otherwise. Persist/API local dates remain ISO/Gregorian date values; conversion must not change the represented local day.
