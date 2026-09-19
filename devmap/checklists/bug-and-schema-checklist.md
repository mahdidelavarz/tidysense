# Bug and Schema Checklist

## Bug

- [ ] reproducible violated contract identified
- [ ] regression test fails before fix
- [ ] smallest scoped fix applied
- [ ] security/data/related paths assessed
- [ ] affected verification passes

## Schema

- [ ] domain authority and compatibility reviewed
- [ ] EF migration inspected
- [ ] clean and upgrade PostgreSQL paths tested
- [ ] constraints/ownership/concurrency/indexes verified
- [ ] rollback/forward-fix and deployment order documented

Details: `../workflows/bug-fix.md` and `../workflows/schema-change.md`.
