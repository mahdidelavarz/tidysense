-- The one database role besides the application's own: read-only, for the operator's direct
-- look at records during an incident or an analysis. It cannot write and cannot read the
-- OTP tables. Every use is written into the incident or access record (runbooks.md, runbook 8).
--
--   docker compose exec -T db psql --username tidysense --dbname tidysense \
--     --set ON_ERROR_STOP=1 --set password="'<a new password>'" < sql/readonly-role.sql
--
-- Run it again after a migration that adds tables is not necessary: default privileges
-- cover tables the application role creates later.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tidysense_readonly') THEN
        CREATE ROLE tidysense_readonly LOGIN;
    END IF;
END
$$;
ALTER ROLE tidysense_readonly PASSWORD :password;
ALTER ROLE tidysense_readonly SET default_transaction_read_only = on;
GRANT CONNECT ON DATABASE tidysense TO tidysense_readonly;
GRANT USAGE ON SCHEMA public TO tidysense_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tidysense_readonly;
ALTER DEFAULT PRIVILEGES FOR ROLE tidysense IN SCHEMA public GRANT SELECT ON TABLES TO tidysense_readonly;
-- Authentication material is never needed for support or analysis.
REVOKE SELECT ON "OtpChallenges", "OtpRateEvents" FROM tidysense_readonly;
