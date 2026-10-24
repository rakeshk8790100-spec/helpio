# Helpio backend

FastAPI backend with a SQLAlchemy/Psycopg connection to Supabase Postgres.

## Development

A project virtual environment is installed in `.venv`. From this directory:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

You can also run without activating the environment:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

For a fresh checkout with Python 3.11 or newer:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock
.\.venv\Scripts\python.exe -m pip install --no-deps -e .
Copy-Item .env.example .env.dev
```

## Supabase connection

Open **helpio-dev > Connect > Session pooler** in the Supabase dashboard.
Copy the host and user exactly into `DB_HOST` and `DB_USER` in `.env.dev`.
The pooled user typically has the form `postgres.PROJECT_REF`.
Use the port from the dashboard (session pooling normally uses 5432).
`DB_PASSWORD` is the raw database password, not a URL-encoded password.
The development password has been saved locally; it is not in `.env.example`.
The supplied project name alone cannot identify its database host.

Settings load `.env.dev` by default. Set `APP_ENV=prod` to load `.env.prod`;
production uses its own credentials. Process environment variables override files.
Environment files are ignored by Git. SSL is required; for certificate verification,
set `DB_SSLMODE=verify-full` and `DB_SSLROOTCERT` to the Supabase CA certificate path.
See the [Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).

Check the connection with a read-only `SELECT 1`:

```powershell
.\.venv\Scripts\python.exe -m scripts.check_db
```

- `GET /api/v1/health`: application liveness.
- `GET /api/v1/health/db`: database readiness (503 when unconfigured/unavailable).
- `GET /docs`: API documentation.

Database connections use a small pool per worker and a ten-second connection timeout.
Sessions are available through `app.core.dependencies.get_db`; callers explicitly
commit writes. Closing a session rolls back uncommitted work. This setup creates no tables.
The database login is privileged: endpoint authorization must be implemented before
exposing application data; direct SQL does not automatically carry Supabase user JWTs.

## Auth

Customers and providers sign in **without passwords**: they enter their email and type the 6-digit code
we email them. Customers can also continue with Google, or set a password at sign-up and log in with
email + password afterwards. Administrators use email + password.

All endpoints are under `/api/v1/auth`:

| Endpoint | Purpose |
|---|---|
| `POST /otp/start` `{email, role}` | Existing account: emails a login code, returns `{"next":"otp"}`. New email: returns `{"next":"details"}`. |
| `POST /register` `{name, email, phone, role, password?}` | Creates the account (or refreshes an unverified one) and emails a sign-up code. `role` is `customer` or `provider`; `phone` is 10 digits, stored as `+91…`; `password` (8–128 chars) is optional and stored hashed. |
| `POST /verify-otp` `{email, otp, purpose}` | `purpose` is `signup` or `login`. Returns the session `{access_token, token_type, user}`. |
| `POST /otp/resend` `{email, purpose}` | Always 202, so it can't be used to discover accounts. |
| `POST /google` `{id_token}` | Customers only. Verifies the Google ID token and returns the session. |
| `GET /me`, `PATCH /me` `{name?, phone?}` | Current user; Google customers add their mobile number here. |
| `POST /logout` | Revokes the bearer token (other devices stay signed in). |
| `POST /login` `{email, password}` | Administrators, and verified customers who set a password at sign-up. |
| `POST /forgot-password`, `/reset-password` | Administrators only. Customers who forget their password sign in with an email code. |

`user.onboarding_status` is `skills`, `service_setup` or `complete` for providers and `null` for others.

**Code rules:** codes expire after 10 minutes, are stored hashed, and die after 5 wrong attempts.
A new code can be requested once every 60 seconds and at most 5 times per hour (429 with `Retry-After`).
Requesting a new code retires the previous one.

**Sessions** last `AUTH_TOKEN_MINUTES` (default 30 days). Protected endpoints use
`Depends(get_current_user)`, or `Depends(require_role(UserRole.PROVIDER))` for one role, from
`app.modules.auth.dependencies`. Revocations persist across restarts; raw tokens are never stored.
Expired records can be removed periodically with `DELETE FROM auth_revoked_tokens WHERE expires_at <= now();`.

**Email** is sent with Brevo SMTP using `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY` and `BREVO_FROM_EMAIL`
(a verified sender). Keep the key in `.env.dev`/`.env.prod`, never in source code. Brevo must allow the
backend's outgoing IP (see `docs/superpowers/plans/2026-10-01-signup-email-failure.md`).
For local development without email, set `AUTH_DEV_EMAIL_CONSOLE=true` in `.env.dev`: codes are printed
to the uvicorn console instead. Settings refuse this flag when `APP_ENV=prod`.

**Google:** set `GOOGLE_CLIENT_ID` to the Web Client ID from Google Cloud (the same ID the frontend uses).

**Administrators** are created from the command line (public sign-up can't create them):

```powershell
.\.venv\Scripts\python.exe -m scripts.create_admin
```

## Provider onboarding

After verifying their email, providers finish sign-up in two more steps. Endpoints (provider token required):

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/catalog/skills` | Public skills catalogue grouped by category. |
| `GET /api/v1/providers/me/onboarding` | Status plus saved skills, availability and service area. |
| `PUT /api/v1/providers/me/skills` | 3–15 skills, each with `proficiency` (`beginner`/`intermediate`/`expert`) and optional `years_experience`. Moves status to `service_setup`. |
| `PUT /api/v1/providers/me/service-setup` | Weekly availability (`day` 0 = Monday, `start`/`end` "HH:MM"), service area (`pincode`, `area_name`, optional `latitude`/`longitude`) and `radius_km` (1–50). Completes sign-up. |

Status only moves forward; providers can re-save either step later.

## Migrations

Apply these in order in the Supabase SQL editor (each is safe to re-run):

1. `migrations/202609240001_auth_tables.sql`
2. `migrations/202610010001_auth_revoked_tokens.sql`
3. `migrations/202610220001_otp_login_and_profile.sql`: name, phone, avatar, login codes, attempt counter
4. `migrations/202610220002_catalog_and_providers.sql`: skills catalogue (seeded) and provider onboarding tables

All tables have RLS enabled and no access for the `anon`/`authenticated` roles; this backend's
server-side connection enforces the rules.

## Tests

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Tests run against in-memory SQLite with fake email and Google clients; nothing is sent.

## Settings reference

See `.env.example`. Restart uvicorn after changing settings (they are cached).
