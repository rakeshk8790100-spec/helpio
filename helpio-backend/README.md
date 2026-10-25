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

Customers and providers **sign up and log in with email + password** on separate pages. Each page sends
its `role`, so a provider can't log in on the customer page or the reverse. Customers can also continue
with Google. Administrators log in with email + password and no `role`.

All endpoints are under `/api/v1/auth`:

| Endpoint | Purpose |
|---|---|
| `POST /register` `{name, email, phone, password, role}` | Creates the account and signs in: 201 with the session `{access_token, token_type, user}`. `role` is `customer` or `provider`; `phone` is 10 digits, stored as `+91…`; `password` is 8–128 characters, stored hashed. 409 if the email or mobile number is already registered. |
| `POST /login` `{email, password, role?}` | Returns the session. 401 for a wrong email or password. 409 when the password is right but the account belongs to the other role (the message names the right login). 403 when the account is disabled. |
| `POST /google` `{id_token}` | Customers only. Verifies the Google ID token and returns the session. |
| `POST /forgot-password` `{email}` | Emails a 6-digit reset code to any active account. Always 202, so it can't be used to discover accounts. |
| `POST /reset-password` `{email, otp, new_password}` | Sets the new password, marks the email verified and signs the user out on every device. |
| `GET /me`, `PATCH /me` `{name?, phone?}` | Current user; Google customers add their mobile number here. |
| `POST /logout` | Revokes the bearer token (other devices stay signed in). |

`user.onboarding_status` is `skills`, `service_setup` or `complete` for providers and `null` for others.

**Email ownership:** sign-up doesn't wait for an email code, so `email_verified` starts as false.
Google sign-in or a password reset proves the email. When Google signs in to an account whose email
was never proven, the existing password is dropped and its sessions end, so registering someone else's
email doesn't keep you in their account.

**Reset codes** expire after 10 minutes, are stored hashed, and die after 5 wrong attempts. A new code
is sent at most once every 60 seconds and 5 times per hour; extra requests get the same 202 but send
nothing. Requesting a new code retires the previous one.

**Sessions** last `AUTH_TOKEN_MINUTES` (default 30 days). Protected endpoints use
`Depends(get_current_user)`, or `Depends(require_role(UserRole.PROVIDER))` for one role, from
`app.modules.auth.dependencies`. Revocations persist across restarts; raw tokens are never stored.
Every token carries the user's `token_version`; a password reset bumps it, which signs the user out
everywhere. Expired records can be removed periodically with
`DELETE FROM auth_revoked_tokens WHERE expires_at <= now();`.

**Email** is sent with Brevo SMTP using `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY` and `BREVO_FROM_EMAIL`
(a verified sender). Keep the key in `.env.dev`/`.env.prod`, never in source code. Brevo must allow the
backend's outgoing IP (see `docs/superpowers/plans/2026-10-01-signup-email-failure.md`).
For local development without email, set `AUTH_DEV_EMAIL_CONSOLE=true` in `.env.dev`: reset codes are
printed to the uvicorn console instead. Settings refuse this flag when `APP_ENV=prod`.

**Google:** set `GOOGLE_CLIENT_ID` to the Web Client ID from Google Cloud. The frontend uses the same ID
as `VITE_GOOGLE_CLIENT_ID`, and every app origin (e.g. `http://localhost:5173`) must be listed under the
OAuth client's Authorised JavaScript origins.

**Administrators** are created from the command line (public sign-up can't create them):

```powershell
.\.venv\Scripts\python.exe -m scripts.create_admin
```

## Provider onboarding

After creating their account, providers finish sign-up in two more steps. Endpoints (provider token required):

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/catalog/skills` | Public skills catalogue grouped by category. |
| `GET /api/v1/providers/me/onboarding` | Status plus saved skills, availability and service area. |
| `PUT /api/v1/providers/me/skills` | 3–15 skills, each with `proficiency` (`beginner`/`intermediate`/`expert`) and optional `years_experience`. Moves status to `service_setup`. |
| `PUT /api/v1/providers/me/service-setup` | Weekly availability (`day` 0 = Monday, `start`/`end` "HH:MM"), service area (`pincode`, `area_name`, optional `latitude`/`longitude`) and `radius_m` (travel radius in metres, 500–50000). Completes sign-up. |

Status only moves forward; providers can re-save either step later.

## Jobs and home screens

Customers post custom jobs; nearby providers quote on them. Money is in paise.

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/jobs` | Customer. `title` plus optional `description`, `category_id`, `latitude`/`longitude`, `pincode`, `area_name`, `budget_paise`, `scheduled_at`, `duration_mins`, `is_emergency`. Saved as a draft unless `submit: true`, which needs description, category, area and pincode and opens it to providers. |
| `PATCH /api/v1/jobs/{id}` | Customer. Edit a draft; `submit: true` posts it. 409 once posted. |
| `GET /api/v1/jobs/mine` | Customer. Own jobs with `quote_count` and `lowest_quote_paise`. |
| `GET /api/v1/jobs/{id}` | Customer, own job. Adds photo URLs and the quotes received: amount, message, status, provider as "Ravi S.", their proficiency and experience in the job's category, and distance rounded to 0.5 km. |
| `POST /api/v1/jobs/{id}/attachments` (multipart `file`) | Customer, before a pro is hired. Up to 6 files (JPG/PNG/WebP/MP4, 10 MB). The API uploads the file to Cloudinary (folder `helpio/jobs/<job id>`) and saves its URL; returns `{id, content_type, url}`. |
| `DELETE /api/v1/jobs/{id}/attachments/{attachment_id}` | Customer. Deletes the file from Cloudinary and the job. |
| `GET /api/v1/customers/me/home` | Customer home: `active_job`, `awaiting_decision` (open jobs with quotes), `waiting_for_quotes`, `drafts`. |
| `GET /api/v1/jobs/nearby` `?category_id&max_km&has_budget&urgent_only` | Provider. `{area, jobs}`: their own centre and radius (null without coordinates) and the open jobs in their skill categories within `radius_m` (or the same pincode when either side has no coordinates); emergencies first, then closest. Masked: no customer contact, coordinates or pincode, distance rounded to 0.5 km, customer as "Asha K.", and `area_circle`, a 600 m circle whose centre is moved 200–400 m from the real spot (keyed by `AUTH_SECRET_KEY`, so the offset can't be worked out). |
| `GET /api/v1/jobs/nearby/{id}` | Provider. One nearby job as above, plus photo URLs and `can_quote`. |
| `DELETE /api/v1/jobs/{id}/quotes/mine` | Provider. Withdraws a pending quote; quoting again re-opens it. |
| `POST /api/v1/jobs/{id}/quotes` `{amount_paise, message?}` | Provider with finished sign-up, on a job they can see nearby. One quote per job (409 on a second). |
| `GET /api/v1/providers/me/home` | Provider home: sign-up checklist, `can_quote`, active job, quote counts, top 3 nearby jobs and `nearby_count`, earnings (zero until payouts exist). |

## Photos and videos (Cloudinary)

Job photos and videos are stored on Cloudinary; the database keeps only each file's URL, Cloudinary id and type.

Uploads use an **unsigned upload preset**, so the API key needs no create permission. In the Cloudinary console
(Settings > Upload > Upload presets) add a preset named `helpio_jobs`: Signing mode **Unsigned**, folder
`helpio/jobs`, allowed formats `jpg,png,webp,mp4`, overwrite off. Then set `CLOUDINARY_CLOUD_NAME` (the badge on the
API Keys page, not the key's name) and `CLOUDINARY_UPLOAD_PRESET`. The preset's folder takes priority over the
per-job folder the API sends; files stay unique because their id is a random UUID.

Deleting a file uses the signed API (`CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`) and needs the key to have
delete permission. If Cloudinary refuses, the photo is still removed from the job and the file stays in the Media
Library until it is deleted there.

Without a preset the API falls back to signed uploads with the key and secret. Without either, uploads answer 503
and everything else keeps working.

## Migrations

Apply these in order in the Supabase SQL editor (each is safe to re-run):

1. `migrations/202609240001_auth_tables.sql`
2. `migrations/202610010001_auth_revoked_tokens.sql`
3. `migrations/202610220001_otp_login_and_profile.sql`: name, phone, avatar, login codes, attempt counter
4. `migrations/202610220002_catalog_and_providers.sql`: skills catalogue (seeded) and provider onboarding tables
5. `migrations/202610240001_auth_password_sessions.sql`: token version, so a password reset signs out every device
6. `migrations/202610240002_provider_radius_metres.sql`: service radius in metres (converts radii saved in km)
7. `migrations/202610250001_jobs_and_quotes.sql`: custom jobs and provider quotes
8. `migrations/202610260001_job_attachments.sql`: the `job_attachments` table (its Supabase Storage bucket is no longer used)
9. `migrations/202610270001_job_attachments_cloudinary.sql`: photos move to Cloudinary; the table keeps each file's URL and Cloudinary id

All tables have RLS enabled and no access for the `anon`/`authenticated` roles; this backend's
server-side connection enforces the rules.

## Tests

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Tests run against in-memory SQLite with fake email and Google clients; nothing is sent.

## Settings reference

See `.env.example`. Restart uvicorn after changing settings (they are cached).
