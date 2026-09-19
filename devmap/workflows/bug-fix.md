# Bug Fix

1. Reproduce with the smallest evidence and identify the violated contract.
2. Determine whether the defect is product ambiguity, code, data, configuration, dependency, or environment.
3. Check for related ownership/security/data impact.
4. Add a failing regression test at the lowest meaningful level.
5. Apply the smallest scoped fix; do not refactor unrelated code.
6. Run affected tests plus boundary/integration tests proportional to risk.
7. Verify no product behavior was silently changed.
8. Update DevMap only if the bug exposed an invalid reusable rule; propose that change explicitly.
