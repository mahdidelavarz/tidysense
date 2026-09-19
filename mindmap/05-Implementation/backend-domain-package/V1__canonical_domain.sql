-- TidySense canonical schema reference (2026-09-19).
-- NOT an executable migration. EF Core migrations are authoritative.
-- Quoted PascalCase reflects the existing EF/PostgreSQL naming convention.

CREATE TABLE "Goals" (
  "Id" uuid PRIMARY KEY,
  "UserId" uuid NOT NULL,
  "Title" text NOT NULL,
  "Status" text NOT NULL CHECK ("Status" IN ('ACTIVE','ACHIEVED','ABANDONED')),
  "TargetDate" date NULL,
  "ReviewDate" date NOT NULL,
  "Version" bigint NOT NULL DEFAULT 1,
  "CreatedAt" timestamptz NOT NULL,
  "UpdatedAt" timestamptz NOT NULL
);

CREATE TABLE "Projects" (
  "Id" uuid PRIMARY KEY,
  "UserId" uuid NOT NULL,
  "GoalId" uuid NULL REFERENCES "Goals"("Id"),
  "Title" text NOT NULL,
  "Status" text NOT NULL CHECK ("Status" IN ('ACTIVE','COMPLETED','STOPPED')),
  "TargetDate" date NULL,
  "ReviewDate" date NOT NULL,
  "Version" bigint NOT NULL DEFAULT 1,
  "CreatedAt" timestamptz NOT NULL,
  "UpdatedAt" timestamptz NOT NULL
);

CREATE TABLE "Tasks" (
  "Id" uuid PRIMARY KEY,
  "UserId" uuid NOT NULL,
  "GoalId" uuid NULL REFERENCES "Goals"("Id"),
  "ProjectId" uuid NULL REFERENCES "Projects"("Id"),
  "Title" text NOT NULL,
  "Status" text NOT NULL CHECK ("Status" IN ('ACTIVE','COMPLETED','DROPPED')),
  "PlannedDate" date NULL,
  "Deadline" date NULL,
  "SequenceId" uuid NULL,
  "SequenceOrder" integer NULL,
  "Version" bigint NOT NULL DEFAULT 1,
  "CreatedAt" timestamptz NOT NULL,
  "UpdatedAt" timestamptz NOT NULL,
  "CompletedAt" timestamptz NULL,
  "DroppedAt" timestamptz NULL,
  CONSTRAINT "CK_Tasks_DirectScope" CHECK (NOT ("GoalId" IS NOT NULL AND "ProjectId" IS NOT NULL)),
  CONSTRAINT "CK_Tasks_SequencePair" CHECK (("SequenceId" IS NULL) = ("SequenceOrder" IS NULL)),
  CONSTRAINT "CK_Tasks_StandaloneActiveDate" CHECK ("Status" <> 'ACTIVE' OR "GoalId" IS NOT NULL OR "ProjectId" IS NOT NULL OR "PlannedDate" IS NOT NULL)
);
CREATE UNIQUE INDEX "IX_Tasks_SequenceId_SequenceOrder" ON "Tasks" ("SequenceId", "SequenceOrder") WHERE "SequenceId" IS NOT NULL;

CREATE TABLE "Routines" (
  "Id" uuid PRIMARY KEY,
  "UserId" uuid NOT NULL,
  "GoalId" uuid NULL REFERENCES "Goals"("Id"),
  "ProjectId" uuid NULL REFERENCES "Projects"("Id"),
  "ContinuationOfRoutineId" uuid NULL REFERENCES "Routines"("Id"),
  "Title" text NOT NULL,
  "Status" text NOT NULL CHECK ("Status" IN ('ACTIVE','STOPPED')),
  "RecurrenceTimezone" text NOT NULL,
  "RecurrenceDefinition" jsonb NOT NULL,
  "TimesOfDay" time[] NOT NULL DEFAULT '{}',
  "EffectiveFromDate" date NOT NULL,
  "EffectiveToDate" date NULL,
  "Version" bigint NOT NULL DEFAULT 1,
  "CreatedAt" timestamptz NOT NULL,
  "UpdatedAt" timestamptz NOT NULL,
  "StoppedAt" timestamptz NULL,
  CONSTRAINT "CK_Routines_DirectScope" CHECK (NOT ("GoalId" IS NOT NULL AND "ProjectId" IS NOT NULL)),
  CONSTRAINT "CK_Routines_EffectiveRange" CHECK ("EffectiveToDate" IS NULL OR "EffectiveToDate" >= "EffectiveFromDate")
);

CREATE TABLE "RoutineOccurrences" (
  "Id" uuid PRIMARY KEY,
  "RoutineId" uuid NOT NULL REFERENCES "Routines"("Id"),
  "ScheduledLocalDate" date NOT NULL,
  "ScheduledLocalTime" time NULL,
  "Status" text NOT NULL CHECK ("Status" IN ('PENDING','DONE','MISSED')),
  "ResolvedAt" timestamptz NULL,
  "Version" bigint NOT NULL DEFAULT 1,
  "CreatedAt" timestamptz NOT NULL,
  "UpdatedAt" timestamptz NOT NULL
);
CREATE UNIQUE INDEX "IX_RoutineOccurrences_TimedIdentity" ON "RoutineOccurrences" ("RoutineId", "ScheduledLocalDate", "ScheduledLocalTime") WHERE "ScheduledLocalTime" IS NOT NULL;
CREATE UNIQUE INDEX "IX_RoutineOccurrences_UntimedIdentity" ON "RoutineOccurrences" ("RoutineId", "ScheduledLocalDate") WHERE "ScheduledLocalTime" IS NULL;

CREATE TABLE "PlanningFacts" (
  "Id" uuid PRIMARY KEY,
  "UserId" uuid NOT NULL,
  "GoalId" uuid NULL REFERENCES "Goals"("Id"),
  "ProjectId" uuid NULL REFERENCES "Projects"("Id"),
  "FactType" text NOT NULL,
  "Strength" text NOT NULL CHECK ("Strength" IN ('HARD','SOFT','INFORMATIONAL')),
  "StructuredValue" jsonb NOT NULL,
  "Source" text NOT NULL CHECK ("Source" IN ('USER_EXPLICIT','USER_CONFIRMED_AI_EXTRACTION')),
  "Status" text NOT NULL CHECK ("Status" IN ('ACTIVE','EXPIRED','REMOVED')),
  "SourcePlanningAttemptId" uuid NULL,
  "CapturedAt" timestamptz NOT NULL,
  "LastConfirmedAt" timestamptz NOT NULL,
  "UpdatedAt" timestamptz NOT NULL,
  "ExpiredAt" timestamptz NULL,
  "RemovedAt" timestamptz NULL,
  "Version" bigint NOT NULL DEFAULT 1,
  CONSTRAINT "CK_PlanningFacts_OneOwner" CHECK (("GoalId" IS NOT NULL)::integer + ("ProjectId" IS NOT NULL)::integer = 1)
);

CREATE TABLE "CaptureItems" (
  "Id" uuid PRIMARY KEY,
  "UserId" uuid NOT NULL,
  "Title" text NOT NULL,
  "Status" text NOT NULL CHECK ("Status" IN ('UNRESOLVED','RESOLVED','DISCARDED')),
  "Source" text NOT NULL,
  "ResolvedEntityType" text NULL,
  "ResolvedEntityId" uuid NULL,
  "Version" bigint NOT NULL DEFAULT 1,
  "CreatedAt" timestamptz NOT NULL,
  "UpdatedAt" timestamptz NOT NULL,
  CONSTRAINT "CK_CaptureItems_ResolutionPair" CHECK (("ResolvedEntityType" IS NULL) = ("ResolvedEntityId" IS NULL))
);

-- Sequence scope equality, PlanningFact standalone-Project eligibility, TimesOfDay
-- uniqueness, parent terminal rules and ownership are transaction/domain invariants
-- backed by integration tests where a single-row constraint is insufficient.
