# Release Readiness Checklist

Status: **NOT READY**.

- [ ] pilot decision and all applicable hard gates pass;
- [ ] `/api/v1`, generated client and deployed frontend are compatible;
- [ ] canonical migrations and prototype cutover are verified without dual obsolete APIs;
- [ ] authorization/ownership, concurrency/idempotency and event evidence pass;
- [ ] Kavenegar, AI provider, privacy/retention and spend controls are production-reviewed;
- [ ] monitoring, support, incident, backup and rollback procedures are exercised;
- [ ] accessibility, RTL, performance and critical Playwright flows pass;
- [ ] documentation and DevMap match the deployed release.

`DEC-011` must be resolved when concrete release automation requires it, not earlier. There is no dedicated crisis product gate.
