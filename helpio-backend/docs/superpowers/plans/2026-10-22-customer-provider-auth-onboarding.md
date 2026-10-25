# Customer & Provider Login + Provider Onboarding: Implementation Plan

> **Superseded in part (2026-10-24):** customers and providers now log in with email + password, sign-up no longer sends an email code, and customer and provider auth pages are separate. See `2026-10-24-password-login-separate-auth.md`. The skills catalogue and onboarding steps below still apply; the service radius is now `radius_m` (500 m to 50 km).

> **For agentic workers:** Follow the `helpio-fullstack` skill. Backend tasks follow `helpio-backend`; frontend tasks follow `helpio-frontend/.claude/skills/helpio-design` (page → layout → component, design system, checklist). Steps use checkbox syntax.

**Goal:** Customers sign in simply (email + one-time code, or Google) and give their name and mobile number once. Providers join in three short steps: (1) name, email, mobile, then verify the email code; (2) at least 3 skills with a proficiency level; (3) weekly availability, service location and service radius. A provider counts as fully signed up only after all three steps.

**Architecture:** The backend owns every rule (OTP issue/verify, rate limits, onboarding status, validation). The frontend keeps its page → layout → component layers and RTK Query. Login uses email OTP. Google stays as a second option for customers only. Provider onboarding data lives in a new `providers` backend module with a public skills catalogue (`catalog` module).

**Tech stack:** FastAPI, SQLAlchemy 2.0, Supabase Postgres, Brevo SMTP, pytest · React 19, antd 6 (`Input.OTP`, `Steps`/custom progress, `Select`, `Slider`), Tailwind 4, RTK Query, react-router 7.

---

## Decisions (recommended defaults; confirm or change before starting)

| # | Question | Recommendation | Alternative |
|---|---|---|---|
| D1 | How do people log in after signing up? | **Email OTP for everyone, no passwords.** Customers can also use Google. Matches the fields you listed (no password) and is the simplest flow. | Providers set a password in step 1 and log in with email + password (OTP only at sign-up). |
| D2 | How long does a login last? | **30 days** (configurable `AUTH_TOKEN_MINUTES`). With OTP login, a 60-minute token means an email every hour. Logout still revokes the token server-side. | Keep 60 min, or build refresh tokens (bigger job). |
| D3 | How is the service location captured? | **"Use my current location" (GPS lat/lng) plus a required 6-digit pincode and an area name.** No map or geocoding key needed. If GPS is denied, the pincode alone is saved. | Pincode only; or a map picker (needs a Google Maps key and billing). |
| D4 | Availability format | **Pick working days (Mon–Sun chips) + one time window ("9:00 AM – 6:00 PM") for those days.** Default Mon–Sat, 9–6. Stored per day so per-day hours can be added later. | Different hours per day from the start (more taps). |
| D5 | Skills and proficiency | **Pick at least 3 (max 15) skills from a catalogue grouped by the 7 existing categories. Each gets a level: Beginner / Intermediate / Expert, plus optional years of experience.** | Free-text skills (hard to match jobs later). |
| D6 | Can one email be both a customer and a provider? | **No, for now: one email = one account = one role** (the current backend rule). Show a clear message if it's already used for the other role. | Multi-role accounts (bigger schema change). |
| D7 | Public admin sign-up | **Remove it.** Today `POST /auth/signup` lets *anyone* create an `admin` account. Admins are created by a script instead. | Keep (not recommended). |
| D8 | Mobile number | **Collected and format-checked (+91, 10 digits, starts 6–9) and unique per account. Not verified by SMS** (you asked for email OTP only). | Add SMS OTP later (needs an SMS provider). |

**Blocker:** All of this depends on OTP emails. Brevo currently rejects the backend's IP (`525 Unauthorized IP address`; see `2026-10-01-signup-email-failure.md`, Task 1). That must be fixed first. Until then, a dev-only `ConsoleOtpEmailClient` (only when `APP_ENV=dev` and `AUTH_DEV_EMAIL_CONSOLE=true`) prints the code to the uvicorn console, so the flows can be built and tested.

---

## User flows

### Customer (on `/login`, tab "I need help")
1. **Continue with Google** → backend verifies the token → signed in. If the account has no mobile number yet, a one-field "Add your mobile number" sheet appears once.
2. **Or continue with email** → enter email → *Continue*
   - Existing customer → code sent → enter 6-digit code → signed in.
   - New email → same screen expands with **Name** and **Mobile** → *Send code* → enter code → account created and signed in.
   - Email belongs to a provider → "This email is registered as a professional. Switch to 'I'm a pro'."

### Provider sign-up (`/register`, then `/onboarding/*`)
Progress bar "Step 1 of 3 / 2 of 3 / 3 of 3" across all screens.
1. **Your details** (`/register`): Full name, Email, Mobile (+91), terms checkbox → *Send code* → **Verify email** (code screen: masked email, 6 boxes, resend after 60 s, "change email") → account created, signed in, onboarding status = `skills`.
2. **Your skills** (`/onboarding/skills`): categories as tabs or chips (preselected from the landing calculator's `?skill=`), skill chips to tap, "3 of 3 minimum selected" counter. Each selected skill shows a Beginner / Intermediate / Expert switch and an optional years field. *Continue* is disabled until 3 are picked, with the reason shown.
3. **Availability & service area** (`/onboarding/service-area`): working-day chips, start/end time selects (30-min steps), *Use my current location* button, pincode + area name, radius chips **2 / 5 / 10 / 15 / 25 km** (or a 1–50 km slider) with a plain-language summary ("You'll get jobs within 10 km of Koramangala, Mon–Sat 9 AM–6 PM"). *Finish* → status `complete` → provider home (currently "Coming soon").

### Provider log-in (`/login`, tab "I'm a pro")
Email → code → signed in. If onboarding isn't finished, they land on the step where they stopped. Any other signed-in route redirects there too, until it's complete. Unknown email → "No professional account with this email. Join as a pro."

---

## API contract (all under `/api/v1`)

Session response, returned by every sign-in endpoint:
```json
{ "access_token": "…", "token_type": "bearer",
  "user": { "id": "uuid", "name": "Asha K", "email": "a@x.com", "phone": "+919876543210",
            "role": "customer|provider", "avatar_url": null,
            "onboarding_status": null | "skills" | "service_setup" | "complete" } }
```
`onboarding_status` is `null` for customers.

| Method & path | Body | Result |
|---|---|---|
| `POST /auth/otp/start` | `{ email, role }` | 200 `{ "next": "otp" }` (login code sent) · `{ "next": "details" }` (no account: collect name/phone) · 409 email used by other role · 429 cooldown |
| `POST /auth/register` | `{ name, email, phone, role: customer\|provider }` | 202 `{ "next": "otp" }` (signup code sent). Re-registering an *unverified* email updates its details and resends. 409 if verified email or phone already used |
| `POST /auth/verify-otp` (changed) | `{ email, otp, purpose: signup\|login }` | 200 session. Signup marks email verified and creates `provider_profiles` (status `skills`) for providers. 400 invalid/expired · 429 too many attempts |
| `POST /auth/otp/resend` | `{ email, purpose }` | 202 generic · 429 with `retry_after` seconds |
| `POST /auth/google` (changed) | `{ id_token, role: "customer" }` | 200 session (stores Google name and picture) |
| `GET /auth/me` | Bearer | user object (used on app start to refresh the stored user) |
| `PATCH /auth/me` | `{ name?, phone? }` | user object (Google customers add a phone) |
| `POST /auth/logout` | Bearer | unchanged; the frontend now calls it |
| `GET /catalog/skills` | (public) | `[ { id, name, icon, skills: [ { id, name } ] } ]` |
| `GET /providers/me/onboarding` | Bearer, provider | `{ status, skills: [...], availability: [...], service_area: {...} \| null }` |
| `PUT /providers/me/skills` | `{ skills: [ { skill_id, proficiency, years_experience? } ] }` 3–15, unique | 200 onboarding state; moves status `skills` → `service_setup` |
| `PUT /providers/me/service-setup` | `{ availability: [ { day: 0-6, start: "09:00", end: "18:00" } ], service_area: { latitude?, longitude?, pincode, area_name }, radius_km: 1-50 }` | 200 onboarding state; requires saved skills; sets `complete` |

Errors stay FastAPI's `{ "detail": "…" }`; the frontend reads `detail` (string, or the first validation message).

**OTP rules (backend):** 6 digits, hashed, 10-minute expiry. At most 5 wrong attempts per code (then the code dies). New code at most once per 60 s per email+purpose, and at most 5 per hour. Requesting a new code invalidates older open ones. These limits matter because a code is now enough to log in.

---

## Database changes

Migration `helpio-backend/migrations/202610220001_otp_login_and_profile.sql`:
- `auth_users`: add `name varchar(80)`, `phone varchar(13)` (E.164 `+91XXXXXXXXXX`, unique where not null), `avatar_url text`.
- `auth_otps`: widen the purpose check to `('signup','password_reset','login')`, add `attempts smallint NOT NULL DEFAULT 0`.
- Passwordless users keep a random unusable `password_hash` (the same approach Google users use today), so the column stays NOT NULL.

Migration `helpio-backend/migrations/202610220002_catalog_and_providers.sql` (RLS on, `REVOKE ALL … FROM anon, authenticated`):
- `catalog_categories (id varchar(40) PK, name, icon, sort_order)`, seeded with the 7 ids the frontend already uses: `plumbing, electrical, cleaning, painting, ac, carpentry, moving`.
- `catalog_skills (id varchar(60) PK, category_id FK, name, sort_order)`, seeded with ~4 skills per category (e.g. plumbing: tap & leak repair, pipe fitting, bathroom fittings, water tank cleaning).
- `provider_profiles (user_id uuid PK FK auth_users ON DELETE CASCADE, onboarding_status varchar(20) CHECK IN ('skills','service_setup','complete'), latitude numeric(9,6) NULL, longitude numeric(9,6) NULL, pincode char(6) NULL, area_name varchar(80) NULL, radius_km smallint NULL CHECK 1–50, created_at, updated_at)`.
- `provider_skills (user_id FK, skill_id FK, proficiency varchar(12) CHECK IN ('beginner','intermediate','expert'), years_experience smallint NULL CHECK 0–60, PK (user_id, skill_id))`.
- `provider_availability (user_id FK, day_of_week smallint CHECK 0–6, start_time time, end_time time, CHECK start_time < end_time, PK (user_id, day_of_week))`.

---

## Phase 0: Prerequisites

- [ ] Fix Brevo IP authorization (existing plan, Task 1), or enable the dev console email client for local work.
- [ ] Settings: add `AUTH_TOKEN_MINUTES` (default 43200 = 30 days), `AUTH_DEV_EMAIL_CONSOLE` (dev only), `CORS_ORIGINS` (comma-separated, e.g. `http://localhost:5173`).
- [ ] Frontend dev wiring: Vite `server.proxy` `/api` → `http://127.0.0.1:8000`, and `VITE_API_BASE_URL=/api/v1` in `.env`. Backend adds `CORSMiddleware` from `CORS_ORIGINS` (needed for production, where the app and API run on different domains).

## Phase 1: Backend auth (passwordless + profile)

**Files:** `app/core/config.py`, `app/core/security.py` (token minutes from settings), `app/main.py` (CORS), `app/integrations/email.py` (login subject + console client), `app/modules/auth/{model,schema,repository,service,exceptions,dependencies}.py`, `app/api/v1/endpoints/auth.py`, migration 1, `scripts/create_admin.py`, `README.md`.

- [ ] Model and migration: `name`, `phone`, `avatar_url`, `OtpPurpose.LOGIN`, `AuthOtp.attempts`.
- [ ] Schemas: `OtpStartRequest/Response`, `RegisterRequest` (name 2–80 trimmed, phone `^[6-9]\d{9}$` normalised to `+91…`, role customer|provider), `ResendOtpRequest`, `UserOut`, `SessionResponse`, `UpdateMeRequest`. `VerifyOtpRequest.purpose` accepts `signup|login`.
- [ ] Service: `start_otp`, `register` (create or refresh an unverified user; 409 on a verified email or a taken phone), `verify_otp` → session (creates `provider_profiles` on provider signup, in the same transaction), `resend_otp`, `me`, `update_me`. A shared `_issue_otp` enforces cooldown and hourly limits and invalidates older codes. `_consume_otp` counts attempts. `google_login` saves name/picture and returns a session.
- [ ] New exceptions: `OtpRateLimitedError` (429, with `retry_after`), `TooManyAttemptsError` (429), `PhoneInUseError` (409), `RoleMismatchError` (409, "registered as a professional/customer").
- [ ] Add `require_role(*roles)` dependency in `modules/auth/dependencies.py`.
- [ ] Restrict `POST /auth/signup` to customer/provider (D7) and add `scripts/create_admin.py`. Keep `/auth/login` (password) for admins.
- [ ] Tests `tests/unit/test_auth_otp.py` (SQLite in-memory, fake email client that records codes): new customer, returning customer, provider signup → profile `skills`, role mismatch, unverified re-register, cooldown 429, 5 bad attempts kill the code, expired code, Google session plus phone update, logout still revokes.

## Phase 2: Backend catalog + provider onboarding

**Files:** `app/modules/catalog/{model,schema,repository,service}.py`, `app/modules/providers/{model,schema,repository,service,exceptions,dependencies}.py`, `app/api/v1/endpoints/{catalog,providers}.py`, `app/api/v1/router.py`, migration 2 (with seed).

- [ ] Models mirror migration 2 exactly.
- [ ] `GET /catalog/skills` (public; categories with skills, sorted).
- [ ] `GET /providers/me/onboarding`, `PUT /providers/me/skills` (3–15 unique, known skill ids, replaces the set), `PUT /providers/me/service-setup` (1–7 unique days, start < end, pincode `^\d{6}$`, lat −90..90 / lng −180..180 both-or-neither, radius 1–50, skills must already be saved). All protected with `get_current_user` + `require_role(PROVIDER)`.
- [ ] Status moves only forward: `skills` → `service_setup` → `complete`. Later edits keep `complete`.
- [ ] Tests `tests/unit/test_providers.py`: <3 skills rejected, unknown skill, duplicate skill, customer forbidden (403), service-setup before skills (409), bad times or radius, happy path to `complete`, re-saving skills after completion.

## Phase 3: Frontend plumbing

**Files:** `vite.config.ts`, `.env`, `src/config/base_service/http.config.ts`, `src/config/base_service/base.api.ts`, `src/common/{CommonDto,CommonEnum}.ts`, `src/pages/auth/auth.api.ts`, `src/redux/authSlice.ts`, `src/component/layout/appLayout.tsx`.

- [ ] Proxy and env as in Phase 0. Remove the `/auth/refresh` retry (the backend has none); on 401, clear the session.
- [ ] `TAG_TYPES`: drop the HRMS leftovers; add `Auth`, `Catalog`, `Onboarding`.
- [ ] DTOs: `AuthUser` gets `phone?`, `onboardingStatus`. Add `SkillCategory`, `SkillOption`, `ProviderSkill`, `AvailabilitySlot`, `ServiceArea`, `ProviderOnboarding`. Enums (`as const`): `Proficiency`, `OnboardingStatus`, `Weekday`, `OtpPurpose`.
- [ ] `auth.api.ts`: `startOtp`, `register`, `verifyOtp`, `resendOtp`, `googleLogin`, `getMe`, `updateMe`, `logout`. A `transformResponse` maps snake_case to the existing `AuthSession { user, token }`. `authErrorMessage` reads `detail`.
- [ ] Logout in `AppLayout` calls `POST /auth/logout`, then clears local state even if the call fails.

## Phase 4: Frontend customer login

**Files:** `pages/auth/hooks/useOtpFlow.ts` (new, shared by login and register: send, verify, resend countdown, change email), `pages/auth/hooks/useGoogleSignIn.ts`, `pages/auth/screens/login/{login.page.tsx, hooks/useLogin.ts, types/*}`, `client/default/auth/{login.layout.tsx, login.layout.types.ts}`, `component/marketplace/OtpVerify.tsx` (new, pure: masked email, `Input.OTP`, error, resend in Ns, change email), `component/marketplace/PhoneSheet.tsx` (new; or reuse `BottomSheet` + a form in the layout).

- [ ] Customer tab: Google button, an "or" divider, then the email form. It expands to Name + Mobile when `next = details`, then shows `OtpVerify`.
- [ ] Provider tab: email → `OtpVerify`. If the email is unknown, show "Join as a pro" instead.
- [ ] Google customers without a phone get the "Add your mobile number" sheet (`PATCH /auth/me`).
- [ ] `RequireAuth` sheet: also offers "Continue with email", which links to `/login?next=…`.
- [ ] Update `components.md` with the new components.

## Phase 5: Frontend provider onboarding

**Files:** `config/router/{RouterKeys.ts, MyRouter.tsx}` (`ONBOARDING_SKILLS: '/onboarding/skills'`, `ONBOARDING_AREA: '/onboarding/service-area'`), `pages/auth/screens/register/*` (step 1 + OTP, replacing the password form), `pages/onboarding/{onboarding.api.ts, hooks/useOnboardingSkills.ts, hooks/useServiceSetup.ts, screens/skills/skills.page.tsx, screens/serviceArea/serviceArea.page.tsx, RequireOnboarding.tsx}`, `client/default/onboarding/{skills.layout.tsx, serviceArea.layout.tsx, onboarding.layout.types.ts}`, `client/default/auth/register.layout.tsx`, new components: `ui/StepProgress` (step N of 3 with labels), `ui/ChipMultiSelect` (or a `multiple` prop on `ChipSelect`), `marketplace/SkillPicker` (category tabs + skill chips + selected list with proficiency `Segmented` and optional years), `marketplace/RadiusPicker` (radius chips + summary), `marketplace/AvailabilityPicker` (day chips + start/end selects).

- [ ] Step 1 `/register`: name, email, mobile, terms → `POST /auth/register` → `OtpVerify` → session → `/onboarding/skills`. Keep `?skill=` to preselect the category.
- [ ] Step 2: load `GET /catalog/skills` and `GET /providers/me/onboarding` (prefill when resuming). The Continue button explains why it's disabled until 3 skills are picked. Save with `PUT /providers/me/skills`.
- [ ] Step 3: availability + location (GPS button with a clear denied/unsupported message, pincode, area name) + radius → `PUT /providers/me/service-setup` → success toast → home.
- [ ] Routing guard: a signed-in provider whose `onboardingStatus !== complete` is redirected to their step from any other signed-in route, and from `/login` and `/register` after sign-in. Both onboarding routes require a provider session.
- [ ] Every data section has loading, empty, error (with retry) and data states. Test at 360 px and 430 px.

## Phase 6: Verify end to end

- [ ] Backend: `pytest tests/unit -q` passes. Apply both migrations in Supabase. `python -m scripts.check_db`.
- [ ] Frontend: `npm run lint`, `npm run build`, helpio-design checklist (including the component-import grep).
- [ ] Manual run (uvicorn + `npm run dev`):
  - new customer by email
  - returning customer
  - Google customer adds a phone
  - provider: all 3 steps
  - provider quits after step 1, logs in again, and resumes at step 2
  - provider email used on the customer tab
  - wrong code ×5
  - resend cooldown
  - logout, then the old token is rejected

## Review focus

- No account takeover via OTP: attempts limit, cooldown, codes invalidated on reissue, constant-time compare (already `verify_secret`).
- The frontend never decides roles or onboarding status; it only routes on what `/auth/me` and the session return.
- Phone and exact location are personal data: never shown to customers before hire (design-system privacy rule) and never logged.
- Signup failures roll back user, OTP and profile together.

## Out of scope (later)

KYC (selfie/ID), SMS phone verification, map picker/geocoding, matching jobs by radius, provider profile editing screens (the PUT endpoints already allow it), admin UI, refresh tokens.

## Completion criteria

A new customer can sign in with Google or email OTP and has a name + phone on file. A provider can complete the 3 steps, after email verification, and log in later with an email code. An incomplete provider always resumes onboarding. All tests, lint and build pass, and the README documents the new endpoints, settings and migrations.
