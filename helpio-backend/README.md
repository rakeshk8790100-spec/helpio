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
The driver is pg8000, which is pure Python: Windows Smart App Control blocks the DLLs bundled with psycopg-binary.
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
| `POST /register` `{name, email, phone, password, role}` | Sign-up step 1: emails a 6-digit code and returns 202 `{email, resend_in, expires_in_minutes}`. Nothing is created yet. `role` is `customer` or `provider`; `phone` is 10 digits, stored as `+91…`; `password` is 8–128 characters, stored hashed. 409 if the email or mobile number is already registered; 429 when resending too soon. Send the same details again to resend. |
| `POST /register/verify` `{email, otp}` | Sign-up step 2: the code creates the account with `email_verified` true and signs in: 201 with the session `{access_token, token_type, user}`. |
| `POST /login` `{email, password, role?}` | Returns the session. 401 for a wrong email or password. 409 when the password is right but the account belongs to the other role (the message names the right login). 403 when the account is disabled. |
| `POST /google` `{id_token}` | Customers only. Verifies the Google ID token and returns the session. |
| `POST /forgot-password` `{email}` | Emails a 6-digit reset code to any active account. Always 202, so it can't be used to discover accounts. |
| `POST /reset-password` `{email, otp, new_password}` | Sets the new password, marks the email verified and signs the user out on every device. |
| `GET /me`, `PATCH /me` `{name?, phone?}` | Current user; Google customers add their mobile number here. |
| `POST /logout` | Revokes the bearer token (other devices stay signed in). |
| `POST /change-password` `{current_password, new_password}` | Signs out every other device and returns a fresh session for this one. 400 for a wrong current password or the same new password. |
| `POST /me/avatar` (multipart `file`), `DELETE /me/avatar` | Profile photo (JPG/PNG/WebP, 5 MB) on Cloudinary; its URL is `avatar_url`. |

`user.onboarding_status` is `skills`, `service_setup` or `complete` for providers and `null` for others.

**Email ownership:** sign-up creates the account only after the emailed code is entered, so new
accounts start with `email_verified` true. Until then the details wait in `auth_pending_signups`
(password hashed); expired rows can be removed with `DELETE FROM auth_pending_signups WHERE expires_at <= now();`.
Accounts made before this may still be unverified: Google sign-in or a password reset proves their email.
When Google signs in to an account whose email was never proven, the existing password is dropped and its
sessions end, so registering someone else's email doesn't keep you in their account.

**Sign-up and reset codes** expire after 10 minutes, are stored hashed, and die after 5 wrong attempts. A new code
is sent at most once every 60 seconds and 5 times per hour; extra reset requests get the same 202 but send
nothing, and extra sign-up requests get 429 with the wait. Requesting a new code retires the previous one.

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

**Notification emails** (hired, work started, each 25% update, approvals, changes requested, completed) use the
same Brevo settings and are sent after the response. Set `APP_WEB_URL` (e.g. `https://app.helpio.in`) to add an
"Open in Helpio" link; without it the email has no link. The in-app bell works either way.
The API checks every `OVERDUE_CHECK_SECONDS` (default 60; `0` turns it off) for stages past their target
time and notifies the customer and the pro once per stage.

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
| `PUT /api/v1/providers/me/skills` | 4–20 skills, each with `proficiency` (`beginner`/`intermediate`/`expert`) and optional `years_experience`. Moves status to `service_setup`. |
| `PUT /api/v1/providers/me/service-setup` | Weekly availability (`day` 0 = Monday, `start`/`end` "HH:MM"), service area (`pincode`, `area_name`, optional `latitude`/`longitude`) and `radius_m` (travel radius in metres, 500–50000). Completes sign-up. |

Status only moves forward; providers can re-save either step later.

## Jobs and home screens

Customers post custom jobs; nearby providers quote on them. Money is in paise.

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/jobs` | Customer. Optional `title` (made from the description's first sentence when left out), `description`, `category_id`, `latitude`/`longitude`, `pincode`, `area_name`, `address_line` (flat and street, shown only to the hired pro), `budget_paise`, `scheduled_at` (not in the past), `duration_mins`, `is_emergency`. Saved as a draft unless `submit: true`, which needs description, category, area and pincode, opens it to providers and alerts the 10 closest pros who do the work (in the app; emailed at most once per 30 minutes per pro, every time for emergencies). |
| `POST /api/v1/jobs/assist` `{text}` | Customer. A first draft of the job form from one line: `{title, category_id, description, duration_mins, is_emergency, source}`. Claude writes it when `ANTHROPIC_API_KEY` is set (`source: "ai"`, 20 per customer per hour); otherwise the catalog's search words pick the category (`source: "keywords"`). Contact details are masked. |
| `DELETE /api/v1/jobs/{id}` | Customer. Deletes a draft and its photos; 409 for a posted job. |
| `PATCH /api/v1/jobs/{id}` | Customer. Edit a draft (`submit: true` posts it) or a posted job until a pro is hired (409 after). A posted job keeps its quotes, must keep description, category, area and pincode, and gets `edited_at`; pros who quoted earlier see `edited_after_my_quote: true` on the job until they re-quote. |
| `GET /api/v1/jobs/mine` | Customer. Own jobs with `quote_count` and `lowest_quote_paise`. |
| `GET /api/v1/jobs/{id}` | Customer, own job. Adds photo URLs and the quotes received: amount, message, status, provider as "Ravi S.", their proficiency and experience in the job's category, and distance rounded to 0.5 km. `pin_locked` is true after the pro's 5 wrong PIN tries. |
| `POST /api/v1/jobs/{id}/attachments` (multipart `file`) | Customer, before a pro is hired. Up to 6 files (JPG/PNG/WebP/MP4, 10 MB). The API uploads the file to Cloudinary (folder `helpio/jobs/<job id>`) and saves its URL; returns `{id, content_type, url}`. |
| `DELETE /api/v1/jobs/{id}/attachments/{attachment_id}` | Customer. Deletes the file from Cloudinary and the job. |
| `GET /api/v1/customers/me/home` | Customer home: `active_job`, `awaiting_decision` (open jobs with quotes), `waiting_for_quotes`, `drafts`. |
| `GET /api/v1/jobs/nearby` `?category_id&max_km&has_budget&urgent_only` | Provider. `{area, jobs}`: their own centre and radius (null without coordinates) and the open jobs in their skill categories within `radius_m` (or the same pincode when either side has no coordinates); emergencies first, then closest. Masked: no customer contact, coordinates or pincode, distance rounded to 0.5 km, customer as "Asha K.", and `area_circle`, a 600 m circle whose centre is moved 200–400 m from the real spot (keyed by `AUTH_SECRET_KEY`, so the offset can't be worked out). |
| `GET /api/v1/jobs/nearby/{id}` | Provider. One nearby job as above, plus photo URLs and `can_quote`. |
| `DELETE /api/v1/jobs/{id}/quotes/mine` | Provider. Withdraws a pending quote; quoting again re-opens it. |
| `POST /api/v1/jobs/{id}/quotes/{quote_id}/accept` | Customer, open job and pending quote: hires that pro. The quote is `accepted`, every other pending quote `rejected`, the job `accepted`. The customer pays once all four stages are approved. Returns the job detail with `hired` (name, photo, price). |
| `POST /api/v1/jobs/{id}/quotes/{quote_id}/decline` | Customer: turns one pending quote down (`rejected`); the job stays open. 409 for a quote already answered or on a hired job. |

After hire, only the hired pro can still open the job (`GET /api/v1/jobs/nearby/{id}`), now with `hired: true`, `exact_location` (coordinates, pincode, area, address line) and `customer_name`. Other pros get 404, and quoting, withdrawing and editing are refused.

**Starting work and chat (after hire):**

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/jobs/{id}/start` `{pin}` | Hired pro: starts the job (`in_progress`, `started_at`) with the 4-digit PIN the customer shares at the door. Accepting a quote creates the PIN; only the customer sees it (`start_pin` on `GET /jobs/{id}` while the job is `accepted`). A wrong PIN answers 400 with the tries left; after 5 wrong tries 429 until the customer resets it. |
| `POST /api/v1/jobs/{id}/start-pin/reset` | Customer: a new PIN, tries reset. |
| `GET /api/v1/jobs/{id}/messages` `?after=<iso>`, `POST /api/v1/jobs/{id}/messages` `{body}` | Chat between the customer and the hired pro only (others 404; before hire 409). Messages oldest first with `mine` and the sender as "Asha K."; reading marks the other side's messages read. Phone numbers (7+ digits) and email addresses are replaced with "•••". `unread_messages` is on the customer's `GET /jobs/{id}` and the pro's `GET /jobs/nearby/{id}`. |
| `POST /api/v1/jobs/{id}/quotes` `{amount_paise, message?}` | Provider with finished sign-up, on a job they can see nearby. One quote per job (409 on a second). |
| `GET /api/v1/providers/me/home` | Provider home: sign-up checklist, `can_quote`, active job, quote counts, top 3 nearby jobs and `nearby_count`, earnings (`week_paise` paid by customers in the last 7 days, `wallet_paise` paid and waiting for Helpio's payout). |

## Profiles, addresses and finding pros

| Endpoint | Purpose |
|---|---|
| `GET/POST /api/v1/customers/me/addresses`, `PATCH/DELETE /api/v1/customers/me/addresses/{id}` | Customer saved addresses (up to 5): `label` home/work/other, private `address_line`, `area_name`, `pincode`, optional coordinates. One is the default (the first, or one saved with `is_default: true`; deleting it promotes the next). Every call returns the whole list. |
| `PATCH /api/v1/providers/me/profile` `{bio}` | Provider's public bio (up to 500 characters). Skills and service area are edited with the onboarding endpoints. |
| `GET /api/v1/providers/search` `?q&category_id&address_id` or `?latitude&longitude` or `?pincode`, `&page` | Pros with finished sign-up who serve that place (within their radius, or the same pincode when either side has no coordinates). Defaults to the customer's default address; 422 without any location. `q` matches skill and category names; best matching skill level first, then closest. Cards show "Ravi S.", photo, bio snippet, area, distance rounded to 0.5 km and up to 3 skills, never coordinates, pincode or phone. 20 per page. |
| `GET /api/v1/providers/{id}` `?address_id` | A pro's public profile: the card plus full bio, skills by category, working hours, travel radius and the 10 latest customer reviews. Cards carry `rating` `{average, count}`. |
| `POST /api/v1/jobs/{id}/invites` `{provider_id, message?}` | Customer, open jobs only: send the job straight to a chosen pro (up to 5 per job, 409 on a repeat). The pro sees it first in their jobs whatever the distance or category, and replies with a quote or declines. `GET /jobs/{id}` lists `invites` with each status (`pending`, `quoted`, `declined`). |
| `POST /api/v1/jobs/{id}/invite/decline` | Provider: turn down a direct request (a pending quote on it is withdrawn). Provider home lists `invites` still waiting for a quote; nearby jobs carry `invite_status` and `invite_message`. |

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

## Paying and reviews (Razorpay)

Approving the fourth stage makes the job `payment_due`. The customer pays the hired quote on a Razorpay Payment Link
(UPI, including the Google Pay QR, or netbanking) and Razorpay sends them back to `APP_WEB_URL/jobs/<id>`. Paying
completes the job. The money stays in Helpio's Razorpay account; an admin sends it to the pro and records the transfer.

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/jobs/{id}/payment` | Customer or hired pro: amount, `status` (`pending`, `paid`, `expired`, `cancelled`), `last_error`, every try in `attempts` and, for the pro, `payout`. An open payment is checked with Razorpay at most once a minute, so a missed webhook catches up. |
| `POST /api/v1/jobs/{id}/payment` | Customer, `payment_due` job: `{payment_id, short_url}` to send them to. The open link is reused until it expires (`PAYMENT_LINK_EXPIRY_MINUTES`); then a new one is made. |
| `POST /api/v1/jobs/{id}/payment/confirm` | Customer, back from Razorpay: the `razorpay_*` query parameters. The signature is checked, then the state is read from Razorpay's API. |
| `POST /api/v1/payments/razorpay/webhook` | Razorpay. Add it in Dashboard > Webhooks for `payment_link.paid`, `payment_link.expired`, `payment_link.cancelled` and `payment.failed`, with the secret in `RAZORPAY_WEBHOOK_SECRET` (refused while that's empty). Needs a public URL; in development use a tunnel, or rely on the return and page checks above. |
| `GET /api/v1/admin/payouts` `?status=pending`, `POST /api/v1/admin/payouts/{payment_id}/paid` `{reference}` | Admin: paid jobs with the pro's contact, and marking Helpio's transfer sent (UTR or UPI reference). The pro is notified. |
| `GET/POST /api/v1/jobs/{id}/reviews` `{rating 1-5, comment?}` | Customer or hired pro, from 100% approval: one review each way, final. Pros see the customer's `customer_rating` on `GET /jobs/nearby/{id}`. |

A failed try keeps the payment `pending` with Razorpay's reason in `last_error`; the customer can pay again on the same
link. Every try is a `payment_attempts` row, keyed by Razorpay's payment id, so repeated webhooks never duplicate it.

## Admin console

The console lives in the web app at `/admin` (desktop). Admins log in with their password and then a 6-digit code emailed
to them; `POST /auth/login` refuses admins (403), so the code can't be skipped. Admin sessions last
`AUTH_ADMIN_TOKEN_MINUTES` (12 hours). The owner is the admin whose email is `ADMIN_OWNER_EMAIL`: only the owner answers
access requests and manages other admins.

**First admin (the owner):** open `/admin/request-access` with the `ADMIN_OWNER_EMAIL` address and enter the emailed code;
that address is approved at once. `python -m scripts.create_admin` also works (CLI admins are approved).

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/admin/auth/login` `{email, password}`, `POST /api/v1/admin/auth/verify` `{email, otp}` | Log-in: the password, then the emailed code; returns the session. 5 failed attempts within 15 minutes lock that email for 15 minutes (429). Pending or rejected admins get 403. |
| `POST /api/v1/admin/auth/request-access` `{name, email, phone, password}`, `POST /api/v1/admin/auth/request-access/verify` `{email, otp}` | Ask for access: the code proves the email, the request waits for the owner (who is emailed a link to `/admin/admins`). |
| `GET /api/v1/admin/admins`, `POST /api/v1/admin/admins/{id}/approve`, `/reject` `{reason}`, `/deactivate` `{reason?}`, `/activate` | Owner only. Each decision is emailed to the admin; deactivating signs them out everywhere. The owner's own access can't be changed. |
| `GET /api/v1/admin/audit` `?action&admin_id&target_type&target_id&page&page_size` | Every admin: the audit log, newest first (actions and console log-ins, failed ones included; never secret values). |
| `GET /api/v1/admin/approvals` `?role=customer\|provider`, `GET /api/v1/admin/approvals/count` | New customers and providers waiting for approval, oldest first (providers with skills, area and working days); the counts feed the console's badges. |
| `POST /api/v1/admin/users/{id}/approve` `{note?}`, `POST /api/v1/admin/users/{id}/reject` `{reason}` | Approving lets a customer log in and a provider quote and be found; both are told in the app and by email. Rejecting emails the reason and signs them out. |

| `GET /api/v1/admin/dashboard`, `GET /api/v1/admin/status` | Every admin. Dashboard: today's numbers (India time) and the latest activity. Status: the database, Razorpay, Cloudinary, Brevo and Google checked live (reused for 30 s), the late-update check, webhooks and payment checks (last worked or failed), this server's emails, items waiting for an admin, and unexpected server errors (counted per route). |
| `GET /api/v1/admin/settings`, `PUT /api/v1/admin/settings` `{changes: {key: value \| null}}`, `POST /api/v1/admin/settings/{razorpay\|cloudinary\|email\|google}/test` | Owner only. Third-party keys, the app address, payment link lifetime, the late-update interval and the approval switches. A saved value replaces the same `.env` setting within 15 seconds on every server; `null` goes back to `.env`. Secrets are encrypted with `SETTINGS_ENCRYPTION_KEY` and only ever shown masked (`••••1AIZ`). The audit log records which settings changed, never values. |
| `GET /api/v1/public-config` | Public: `{google_client_id}` as set in the console or `.env`, for the web app's Google button. |
| `GET /api/v1/admin/users` `?role&approval&active&q&page`, `GET /api/v1/admin/users/{id}` | Customers and providers, newest first (`q` searches name, email and mobile); one person with their jobs, quotes, reviews, payments and (providers) skills, area and money owed. |
| `POST /api/v1/admin/users/{id}/deactivate` `{reason?}`, `/activate`, `/sign-out` | Deactivating signs them out everywhere and blocks log-in; sign-out ends every session but lets them log in again. |
| `GET /api/v1/admin/jobs` `?status&q&page`, `GET /api/v1/admin/jobs/{id}` | Every job; one job with both people (contact details), quotes, stages with photos, the timeline, payments and reviews. |
| `GET /api/v1/admin/jobs/{id}/messages` | The chat, read-only, for disputes. Each read is recorded in the audit log (`chat.view`). |
| `POST /api/v1/admin/jobs/{id}/cancel` `{reason}` | Only before work starts (open or hired, not started): pending quotes are declined and both sides are told the reason. |
| `GET /api/v1/admin/payments` `?status&page`, `POST /api/v1/admin/payments/{id}/recheck` | Every payment link with its tries; re-check asks Razorpay now (a missed webhook, a stuck payment). |
| `GET /api/v1/admin/payouts` `?status=pending\|paid`, `POST /api/v1/admin/payouts/{payment_id}/paid` `{reference}` | Paid jobs whose pro is waiting for Helpio's transfer, and recording a transfer (audited, the pro is told). |
| `GET /api/v1/admin/reviews` `?hidden&stars&page`, `POST /api/v1/admin/reviews/{id}/hide` `{reason}`, `/unhide` | Hidden reviews are kept but left out of ratings, profiles and the other side's view. |
| `GET /api/v1/admin/catalog`, `POST /api/v1/admin/catalog/categories`, `PUT /api/v1/admin/catalog/categories/{id}`, `POST /api/v1/admin/catalog/categories/{id}/skills`, `PUT /api/v1/admin/catalog/categories/{id}/skills/{skill_id}` | Categories (name, icon, order, on/off) and their services. Nothing is deleted: a switched-off item disappears from `/catalog` and pickers, and can't be chosen for new jobs; jobs and providers that have it keep it. |

**Approving new sign-ups** is switched on with `REQUIRE_CUSTOMER_APPROVAL` and `REQUIRE_PROVIDER_APPROVAL` (both off by
default). While on, a new customer's `POST /auth/register/verify` (or first Google sign-in) answers 202
`{email, approval_status: "pending"}` with no session, and log-in answers 403 until an admin approves. A new provider
gets a session to finish signing up, but can't quote, isn't in search and can't be asked directly until approved
(`approval_status: "pending"` on `/auth/me`). The owner is emailed about each waiting customer, and about each provider
once they finish signing up (`NOTIFY_NEW_SIGNUPS`).

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
10. `migrations/202610280001_job_edited_at.sql`: `jobs.edited_at`, set when a customer edits a posted job
11. `migrations/202610290001_profiles_addresses.sql`: customer saved addresses and the provider bio
12. `migrations/202610290002_job_invites.sql`: direct requests from a customer to a chosen pro
13. `migrations/202610300001_job_start_pin_and_chat.sql`: start PIN on jobs and the job chat table
14. `migrations/202610310001_job_milestones_notifications.sql`: four 25% stages per hired job (photo updates the customer approves), the job timeline and in-app notifications
15. `migrations/202611010001_job_time_estimate.sql`: the pro's time estimate on starting, a target time per stage and a one-time overdue alert
16. `migrations/202611020001_customer_favorite_skills.sql`: customer favourite services and the popup's skip count
17. `migrations/202611030001_signup_email_verification.sql`: sign-up details waiting for their emailed code
18. `migrations/202611040001_catalog_expansion.sql`: the home services catalogue, 14 categories and 82 skills
19. `migrations/202611050001_payments_and_reviews.sql`: the `payment_due` job status, Razorpay payment links with every attempt and the pro's payout, and one review each way per job
20. `migrations/202611060001_admin_access.sql`: approval of accounts (`approval_status` on `auth_users`), the admin log-in code, admin access requests and the admin audit log
21. `migrations/202611070001_settings_monitoring.sql`: settings saved in the admin console (secrets encrypted), background-job heartbeats and the server error log
22. `migrations/202611080001_moderation_catalog.sql`: hidden reviews (kept, left out of ratings) and catalog categories and services that can be switched off
23. `migrations/202611090001_posting_and_search.sql`: the job's address line for the hired pro, and search words on catalog categories and services ("plumber", "maid", "bijli")

All tables have RLS enabled and no access for the `anon`/`authenticated` roles; this backend's
server-side connection enforces the rules.

## Tests

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Tests run against in-memory SQLite with fake email and Google clients; nothing is sent.

## Settings reference

See `.env.example`. Restart uvicorn after changing settings (they are cached).
