# Schema Change

1. Identify the product/domain invariant requiring the change.
2. Confirm canonical schema authority and upgrade compatibility.
3. Update entity/configuration and explicit constraints/indexes/conversions.
4. Generate an EF migration; inspect rather than trusting generation.
5. Test clean apply, supported upgrade, constraints, ownership, concurrency, query/index impact, and rollback/recovery.
6. Update model snapshot and API/events only when contract changes.
7. Never edit a released migration; add a corrective migration.
8. Document operational sequencing for destructive/long-running changes.

Do not use the reference SQL filename as proof that an EF migration exists.
