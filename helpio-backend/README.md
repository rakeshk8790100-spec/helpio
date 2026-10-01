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

Auth endpoints are available under `/api/v1/auth`:

- `POST /signup`: create `admin`, `customer`, or `provider` users.
- `POST /login`: return a bearer token for verified active users.
- `POST /google`: verify a Google ID token and login or create `customer`/`provider` users.
- `POST /verify-otp`: verify signup OTPs for email/password accounts.
- `POST /forgot-password`: send a password reset OTP when the email exists.
- `POST /reset-password`: reset a password with the emailed OTP.

Email/password signups require email OTP verification before login. OTP emails are sent with Brevo SMTP using
`BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY`, and `BREVO_FROM_EMAIL`; keep the SMTP key in `.env.dev` or
`.env.prod`, never in source code. `BREVO_FROM_EMAIL` must be a verified sender in Brevo.

The table SQL is in `migrations/202609240001_auth_tables.sql`. It enables RLS on
the auth tables; because this backend uses a server-side Postgres connection,
application endpoints enforce the auth flow.

For Google login, set `GOOGLE_CLIENT_ID` to the Web Client ID from Google Cloud.
The frontend should send the Google `credential` ID token to:

```http
POST /api/v1/auth/google
Content-Type: application/json

{
  "id_token": "<google-credential-id-token>",
  "role": "customer"
}
```

`role` can be `customer` or `provider`. Admin accounts still use email/password plus OTP.


## Logout

Apply `migrations/202610010001_auth_revoked_tokens.sql` to the backend database before using logout.

`POST /api/v1/auth/logout` requires `Authorization: Bearer <access_token>` and no request body.
It returns 200 with `{"message":"Logged out successfully"}`. Delete the frontend's stored token on success.
Only the supplied token is revoked; other devices remain signed in. Repeating logout succeeds while the token is valid.
Missing, invalid, or expired tokens return 401. Google and email login tokens both work.

Protected endpoints must use `Depends(get_current_user)` from `app.modules.auth.dependencies`
to reject expired, invalid, or revoked tokens. No protected resource endpoints exist yet.
Revocations persist across backend restarts and workers; raw tokens are not stored.
Expired records can be removed periodically with `DELETE FROM auth_revoked_tokens WHERE expires_at <= now();`.
