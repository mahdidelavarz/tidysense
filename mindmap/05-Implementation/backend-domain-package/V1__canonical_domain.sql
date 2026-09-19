CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE goals (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL,
 title VARCHAR(200) NOT NULL,
 desired_outcome TEXT NOT NULL,
 status VARCHAR(20) NOT NULL,
 target_date DATE,
 review_date DATE,
 review_date_source VARCHAR(30),
 last_continuation_decision_at TIMESTAMPTZ,
 terminal_at TIMESTAMPTZ,
 source VARCHAR(30) NOT NULL,
 version BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL,
 CONSTRAINT uq_goals_id_user UNIQUE(id,user_id),
 CONSTRAINT ck_goals_title CHECK(length(btrim(title))>0),
 CONSTRAINT ck_goals_outcome CHECK(length(btrim(desired_outcome))>0),
 CONSTRAINT ck_goals_status CHECK(status IN ('ACTIVE','ACHIEVED','ABANDONED')),
 CONSTRAINT ck_goals_source CHECK(source IN ('MANUAL','AI_ASSISTED','SYSTEM_MIGRATED')),
 CONSTRAINT ck_goals_review_source CHECK(review_date_source IS NULL OR review_date_source IN ('USER','SYSTEM_DEFAULT','MIGRATED_DEFAULT')),
 CONSTRAINT ck_goals_review_pair CHECK((review_date IS NULL AND review_date_source IS NULL) OR (review_date IS NOT NULL AND review_date_source IS NOT NULL)),
 CONSTRAINT ck_goals_lifecycle CHECK((status='ACTIVE' AND review_date IS NOT NULL AND terminal_at IS NULL) OR (status IN ('ACHIEVED','ABANDONED') AND terminal_at IS NOT NULL)),
 CONSTRAINT ck_goals_version CHECK(version>=0),
 CONSTRAINT ck_goals_time CHECK(updated_at>=created_at)
);

CREATE TABLE projects (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL,
 goal_id UUID,
 title VARCHAR(200) NOT NULL,
 completion_meaning TEXT,
 status VARCHAR(20) NOT NULL,
 target_date DATE,
 review_date DATE,
 review_date_source VARCHAR(30),
 terminal_at TIMESTAMPTZ,
 source VARCHAR(30) NOT NULL,
 version BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL,
 CONSTRAINT uq_projects_id_user UNIQUE(id,user_id),
 CONSTRAINT fk_projects_goal_owner FOREIGN KEY(goal_id,user_id) REFERENCES goals(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT ck_projects_title CHECK(length(btrim(title))>0),
 CONSTRAINT ck_projects_status CHECK(status IN ('ACTIVE','COMPLETED','STOPPED')),
 CONSTRAINT ck_projects_source CHECK(source IN ('MANUAL','AI_ASSISTED','SYSTEM_MIGRATED')),
 CONSTRAINT ck_projects_review_source CHECK(review_date_source IS NULL OR review_date_source IN ('USER','SYSTEM_DEFAULT','MIGRATED_DEFAULT')),
 CONSTRAINT ck_projects_review_pair CHECK((review_date IS NULL AND review_date_source IS NULL) OR (review_date IS NOT NULL AND review_date_source IS NOT NULL)),
 CONSTRAINT ck_projects_lifecycle CHECK((status='ACTIVE' AND (target_date IS NOT NULL OR review_date IS NOT NULL) AND terminal_at IS NULL) OR (status IN ('COMPLETED','STOPPED') AND terminal_at IS NOT NULL)),
 CONSTRAINT ck_projects_version CHECK(version>=0),
 CONSTRAINT ck_projects_time CHECK(updated_at>=created_at)
);

CREATE TABLE tasks (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL,
 goal_id UUID,
 project_id UUID,
 title VARCHAR(200) NOT NULL,
 description TEXT,
 status VARCHAR(20) NOT NULL,
 placement VARCHAR(20) NOT NULL,
 planned_date DATE,
 review_date DATE,
 review_date_source VARCHAR(30),
 deadline DATE,
 is_protected BOOLEAN NOT NULL DEFAULT FALSE,
 protection_reason_code VARCHAR(80),
 terminal_at TIMESTAMPTZ,
 source VARCHAR(30) NOT NULL,
 version BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL,
 CONSTRAINT uq_tasks_id_user UNIQUE(id,user_id),
 CONSTRAINT fk_tasks_goal_owner FOREIGN KEY(goal_id,user_id) REFERENCES goals(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT fk_tasks_project_owner FOREIGN KEY(project_id,user_id) REFERENCES projects(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT ck_tasks_parent CHECK(NOT(goal_id IS NOT NULL AND project_id IS NOT NULL)),
 CONSTRAINT ck_tasks_title CHECK(length(btrim(title))>0),
 CONSTRAINT ck_tasks_status CHECK(status IN ('ACTIVE','COMPLETED','DROPPED')),
 CONSTRAINT ck_tasks_placement CHECK(placement IN ('SCHEDULED','BACKLOG')),
 CONSTRAINT ck_tasks_source CHECK(source IN ('MANUAL','AI_ASSISTED','SYSTEM_MIGRATED')),
 CONSTRAINT ck_tasks_review_source CHECK(review_date_source IS NULL OR review_date_source IN ('USER','SYSTEM_DEFAULT','MIGRATED_DEFAULT')),
 CONSTRAINT ck_tasks_review_pair CHECK((review_date IS NULL AND review_date_source IS NULL) OR (review_date IS NOT NULL AND review_date_source IS NOT NULL)),
 CONSTRAINT ck_tasks_placement_shape CHECK((placement='SCHEDULED' AND planned_date IS NOT NULL) OR (placement='BACKLOG' AND planned_date IS NULL AND review_date IS NOT NULL)),
 CONSTRAINT ck_tasks_lifecycle CHECK((status='ACTIVE' AND terminal_at IS NULL) OR (status IN ('COMPLETED','DROPPED') AND terminal_at IS NOT NULL)),
 CONSTRAINT ck_tasks_protection CHECK(is_protected=FALSE OR protection_reason_code IS NOT NULL),
 CONSTRAINT ck_tasks_version CHECK(version>=0),
 CONSTRAINT ck_tasks_time CHECK(updated_at>=created_at)
);

CREATE TABLE routines (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL,
 goal_id UUID,
 project_id UUID,
 title VARCHAR(200) NOT NULL,
 description TEXT,
 status VARCHAR(20) NOT NULL,
 recurrence_definition JSONB NOT NULL,
 recurrence_timezone VARCHAR(64) NOT NULL,
 effective_from_local_date DATE NOT NULL,
 effective_until_local_date DATE,
 continuation_of_routine_id UUID,
 stopped_at TIMESTAMPTZ,
 source VARCHAR(30) NOT NULL,
 version BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL,
 CONSTRAINT uq_routines_id_user UNIQUE(id,user_id),
 CONSTRAINT fk_routines_goal_owner FOREIGN KEY(goal_id,user_id) REFERENCES goals(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT fk_routines_project_owner FOREIGN KEY(project_id,user_id) REFERENCES projects(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT fk_routines_continuation_owner FOREIGN KEY(continuation_of_routine_id,user_id) REFERENCES routines(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT ck_routines_parent CHECK(NOT(goal_id IS NOT NULL AND project_id IS NOT NULL)),
 CONSTRAINT ck_routines_self CHECK(continuation_of_routine_id IS NULL OR continuation_of_routine_id<>id),
 CONSTRAINT ck_routines_title CHECK(length(btrim(title))>0),
 CONSTRAINT ck_routines_timezone CHECK(length(btrim(recurrence_timezone))>0),
 CONSTRAINT ck_routines_recurrence CHECK(jsonb_typeof(recurrence_definition)='object'),
 CONSTRAINT ck_routines_status CHECK(status IN ('ACTIVE','STOPPED')),
 CONSTRAINT ck_routines_source CHECK(source IN ('MANUAL','AI_ASSISTED','SYSTEM_MIGRATED')),
 CONSTRAINT ck_routines_range CHECK(effective_until_local_date IS NULL OR effective_until_local_date>=effective_from_local_date),
 CONSTRAINT ck_routines_lifecycle CHECK((status='ACTIVE' AND stopped_at IS NULL) OR (status='STOPPED' AND stopped_at IS NOT NULL AND effective_until_local_date IS NOT NULL)),
 CONSTRAINT ck_routines_version CHECK(version>=0),
 CONSTRAINT ck_routines_time CHECK(updated_at>=created_at)
);
CREATE UNIQUE INDEX uq_routines_direct_continuation ON routines(continuation_of_routine_id) WHERE continuation_of_routine_id IS NOT NULL;

CREATE TABLE routine_occurrences (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL,
 routine_id UUID NOT NULL,
 scheduled_local_date DATE NOT NULL,
 status VARCHAR(20) NOT NULL,
 resolved_at TIMESTAMPTZ,
 version BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL,
 CONSTRAINT uq_occurrences_id_user UNIQUE(id,user_id),
 CONSTRAINT uq_occurrences_routine_date UNIQUE(routine_id,scheduled_local_date),
 CONSTRAINT fk_occurrences_routine_owner FOREIGN KEY(routine_id,user_id) REFERENCES routines(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT ck_occurrences_status CHECK(status IN ('PENDING','DONE','MISSED')),
 CONSTRAINT ck_occurrences_resolution CHECK((status='PENDING' AND resolved_at IS NULL) OR (status IN ('DONE','MISSED') AND resolved_at IS NOT NULL)),
 CONSTRAINT ck_occurrences_version CHECK(version>=0),
 CONSTRAINT ck_occurrences_time CHECK(updated_at>=created_at)
);

CREATE INDEX ix_goals_review ON goals(user_id,review_date) WHERE status='ACTIVE';
CREATE INDEX ix_projects_goal ON projects(user_id,goal_id);
CREATE INDEX ix_projects_review ON projects(user_id,review_date) WHERE status='ACTIVE' AND review_date IS NOT NULL;
CREATE INDEX ix_tasks_goal_status ON tasks(user_id,goal_id,status) WHERE goal_id IS NOT NULL;
CREATE INDEX ix_tasks_project_status ON tasks(user_id,project_id,status) WHERE project_id IS NOT NULL;
CREATE INDEX ix_tasks_today ON tasks(user_id,planned_date) WHERE status='ACTIVE' AND placement='SCHEDULED';
CREATE INDEX ix_tasks_overdue ON tasks(user_id,planned_date) WHERE status='ACTIVE' AND planned_date IS NOT NULL;
CREATE INDEX ix_tasks_review ON tasks(user_id,review_date) WHERE status='ACTIVE' AND review_date IS NOT NULL;
CREATE INDEX ix_tasks_deadline ON tasks(user_id,deadline) WHERE status='ACTIVE' AND deadline IS NOT NULL;
CREATE INDEX ix_routines_goal_status ON routines(user_id,goal_id,status) WHERE goal_id IS NOT NULL;
CREATE INDEX ix_routines_project_status ON routines(user_id,project_id,status) WHERE project_id IS NOT NULL;
CREATE INDEX ix_routines_effective ON routines(user_id,effective_from_local_date,effective_until_local_date) WHERE status='ACTIVE';
CREATE INDEX ix_occurrences_user_date_status ON routine_occurrences(user_id,scheduled_local_date,status);
CREATE INDEX ix_occurrences_routine_status ON routine_occurrences(routine_id,status);

COMMENT ON COLUMN routines.recurrence_definition IS 'Versioned recurrence JSON validated by application policy.';
COMMENT ON COLUMN goals.source IS 'Creation origin only; never mutation authority.';
