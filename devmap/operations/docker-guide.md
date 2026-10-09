# Running TidySense with Docker

Two ways to run the same stack: **locally** on your own machine to try a release before it goes anywhere, and **on the pilot server**. Both use the files in [`deploy/`](../../deploy/). Why the stack looks the way it does is in [`deployment.md`](deployment.md); what to do when something breaks is in [`runbooks.md`](runbooks.md).

Day-to-day development does not need Docker: `./dev.ps1 all` starts the backend and the Vite server with hot reload ([local development](../workflows/local-development.md)). Use the local Docker stack when you want to see exactly what the server will run.

Every command below is run from the `deploy/` directory and works the same in PowerShell and in a Linux shell.

## What starts

| Container | What it does | Reachable from your machine |
|---|---|---|
| `web` | Caddy: HTTPS, the built frontend, forwards `/api` and `/health` to the backend | ports 80 and 443 |
| `backend` | the application | no (only through `web`) |
| `migrate` | applies database migrations, then exits; `backend` waits for it | no |
| `db` | PostgreSQL 18 | no |
| `backup` | one database dump a day, kept 30 days | no |
| `mail` (local only) | catches the daily alert e-mail instead of sending it | http://localhost:8025 |

## 1. Local

### Before the first run

- Docker Desktop is running (`docker info` answers).
- Ports 80, 443 and 8025 are free.
- Nothing to configure: [`local.env`](../../deploy/local.env) holds placeholder values that are good only for this.

### Start

```
docker compose --env-file local.env -f docker-compose.yml -f docker-compose.local.yml up --detach --build
```

The first build downloads about 4 GB of base images and takes several minutes; later builds take about a minute. If a download breaks off ("short read", "unexpected EOF"), run the same command again.

Check that everything is up:

```
docker compose --env-file local.env -f docker-compose.yml -f docker-compose.local.yml ps --all
```

`migrate` should say `Exited (0)`; `db` should say `healthy`; the rest `Up`.

### Open it

Go to **https://localhost**. The certificate comes from Caddy's own local authority, so the browser warns once; accept it.

### Sign in

The local stack runs the backend in the Development environment: no SMS is sent. Ask for a code in the login form with any Iranian mobile number and the form shows the code in a notification, as it does under `./dev.ps1`. Type it in.

This works because the local override sets two things: `Development__ShowLoginCode` on the backend and the build argument `VITE_SHOW_LOGIN_CODE` on the web image. Neither exists in `docker-compose.yml`, and the endpoint behind them is not there at all in the Production profile, so the server can never show a code.

If you need the code without the browser, it can also be read from inside the backend container (put the same number in the command):

```
docker compose --env-file local.env -f docker-compose.yml -f docker-compose.local.yml exec backend bash -c "exec 3<>/dev/tcp/127.0.0.1/8080; printf 'GET /api/v1/dev/otp/latest?phoneNumber=09120000001 HTTP/1.0\r\nHost: localhost\r\n\r\n' >&3; tail -1 <&3"
```

It prints `{"code":"1234"}`. The code lives two minutes. The number `09120000001` is the operator account of the local stack, so signing in with it also shows the operations page.

### Look at what the server would do

| To see | Do |
|---|---|
| the daily alert e-mail | open http://localhost:8025 about two minutes after start |
| backend log lines | `docker compose --env-file local.env -f docker-compose.yml -f docker-compose.local.yml logs --follow backend` |
| a backup being taken | `... run --rm backup once`, then `... exec backup ls -l /backups` |
| the database | `... exec db psql --username tidysense --dbname tidysense` |
| a maintenance run | `... exec backend dotnet TidySense.dll run-maintenance` |
| an account being erased | `... exec backend dotnet TidySense.dll erase-user --phone 09120000001 --operator me --reason DRILL` |

(`...` stands for `docker compose --env-file local.env -f docker-compose.yml -f docker-compose.local.yml`.)

### Try the real AI provider locally

In `local.env` set `AI_PLANNING_PROVIDER=deepseek` and `DEEPSEEK_API_KEY=<your key>`, then run the start command again. Planning now shows the consent card first and makes paid calls after you agree. Do not commit the key; put it back to `mock` and empty afterwards.

### Try the Production profile locally

Leave out the local override:

```
docker compose --env-file local.env -f docker-compose.yml up --detach backend web
```

The backend now runs exactly as on the server: no development endpoints, the cookie is `Secure`, and it refuses to start if a required setting is missing. You cannot sign in this way, because a login code needs a real SMS account. Use it to check that a release starts.

### Stop

```
docker compose --env-file local.env -f docker-compose.yml -f docker-compose.local.yml down
```

Add `--volumes` to also delete the local database, the dumps and the local certificate. Without it the data is still there on the next start.

## 2. Pilot server

### Before the first run

1. A Linux server with Docker Engine and the Compose plugin. A DNS record for your host name pointing at it. Ports 80 and 443 open to the internet; nothing else.
2. Limit the system journal to 30 days, **before** the first start. In `/etc/systemd/journald.conf` set `MaxRetentionSec=30day`, then `systemctl restart systemd-journald`. The privacy notice promises that an erased account is gone from logs within 30 days; this line is what makes that true.
3. Put the repository at the release commit on the server.
4. In `deploy/`, copy `.env.example` to `.env`, fill it in, and `chmod 600 .env`. Every line marked "required" must have a value. Generate the three secrets yourself, for example `openssl rand -base64 48` for each.

Never use `local.env` or `docker-compose.local.yml` on the server.

### Start

```
docker compose up --detach --build
```

(On the server no file options are needed: Compose reads `docker-compose.yml` and `.env` by itself.)

### Check

1. `docker compose ps --all`: `migrate` exited with 0, `db` healthy, the rest up.
2. `https://<your host>/health/ready` answers `Healthy`, with a valid certificate. Caddy fetches the certificate on first start; that needs the DNS record and port 80 to be right.
3. Sign in with the operator phone number (a real SMS arrives). The operations page opens and shows a maintenance run within a minute.
4. Create a Task and complete it.
5. Open the privacy page: the contact channel is the one you put in `.env`.

### Once, after the first start

- Create the read-only database role (use a password of your own and keep it with your other secrets):
  ```
  docker compose exec -T db psql --username tidysense --dbname tidysense --set ON_ERROR_STOP=1 --set password="'<a new password>'" < sql/readonly-role.sql
  ```
- Set up the external uptime check on `https://<your host>/health/ready`, every five minutes, notifying you.
- The next morning (04:00 UTC) the first alert e-mail should arrive. It arrives every day, also when there is nothing to report. No e-mail means the backend or the mail settings are broken.
- `docker compose exec backup ls -l /backups` should show one dump per day.

### Release a new version

1. On your own machine, on the release commit: `./dev.ps1 check`, `./auth-e2e.ps1` and `./ops-drill.ps1` pass, and the two dependency audits are clean ([release gate](deployment.md#release)).
2. On the server, update the repository to that commit.
3. If the release changes the database: `docker compose run --rm backup once`.
4. `docker compose up --detach --build`.
5. Repeat the checks above.

If `migrate` fails, the old backend keeps running on the unchanged database; read `docker compose logs migrate`.

### Everyday commands on the server

| To do | Command |
|---|---|
| see what is running | `docker compose ps --all` |
| read the backend log | `journalctl CONTAINER_NAME=tidysense-backend-1 --since "1 hour ago"` |
| find alerts in the log | `journalctl CONTAINER_NAME=tidysense-backend-1 --since yesterday --grep OPS_ALERT` |
| change a setting or flip an AI kill switch | edit `.env` (or add the variable under `backend` in the Compose file), then `docker compose up --detach` |
| restart the backend | `docker compose restart backend` |
| take a backup now | `docker compose run --rm backup once` |
| look at records, read-only | `docker compose exec db psql --username tidysense_readonly --dbname tidysense` (and write the access record, [runbook 8](runbooks.md#8-direct-database-access)) |
| erase an account | `docker compose exec backend dotnet TidySense.dll erase-user --phone <number> --operator <your name> --reason USER_REQUEST` ([runbook 6](runbooks.md#6-account-erasure)) |
| stop everything, keep the data | `docker compose down` |

**Never run `docker compose down --volumes` on the server.** It deletes the database and every backup.

Never run a second `backend`, for example with `--scale`: the application keeps limits and queues in the memory of one process ([single instance](deployment.md#single-instance-constraint)).

## When it does not start

| What you see | Likely cause |
|---|---|
| `required variable … is missing a value` | a required line in `.env` is empty |
| `backend` keeps restarting, log says `… must be configured in production` | the named setting is missing: the contact channel, the alert e-mail settings, or the allowed origin |
| `migrate` exited with a code other than 0 | read `docker compose logs migrate`; the backend was not replaced |
| the browser cannot reach the site, `web` log mentions a certificate or ACME | DNS does not point at the server yet, or port 80 is closed |
| the login form says verification is unavailable | Kavenegar refused the message: the API key is wrong, the verification template name does not match an approved template (its text must contain `%token`), or the account has no credit |
| every request to `/api` answers 400 | you opened the site by an address other than `SITE_HOST` (for example its IP) |
| `logging driver … journald` error on a machine without systemd | add `LOG_DRIVER=json-file` to the env file (the local file already has it) |
| ports 80 or 443 already in use (locally) | stop the other program, or another Compose project that uses them |

## What was tried, and what was not

Tried on a developer machine on 2026-10-09 (Docker Desktop 29.4, Windows): both images build; the stack starts from an empty database with all fifteen migrations; HTTP redirects to HTTPS; the security headers are sent and the application loads in Chrome under the content security policy without a violation; sign-in, creating a Task, the operator page, the daily e-mail (caught by the local mail container), an on-demand backup, the read-only role (reads work, the login-code tables and writes are refused) and account erasure all work; in the Production profile the development endpoints and the API description answer 404, a wrong host name is refused, and the backend does not start without the contact channel.

Not tried: anything on a real server. That means a real certificate from Let's Encrypt, the journal limit, a real SMS, a real mail server, the backup container running for more than a day, and a restart of the server itself. Expect to learn something at the first deployment.
