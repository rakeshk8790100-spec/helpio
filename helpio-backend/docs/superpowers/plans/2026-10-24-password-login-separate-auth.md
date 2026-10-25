# Separate customer & provider login/sign-up, email + password

> Built on branch `feature/password-auth`. One change from the original plan: sessions are invalidated with a `token_version` counter (the JWT `ver` claim) instead of a `tokens_valid_after` timestamp. A token's `iat` only has one-second resolution, so a timestamp can't tell a stale token from the new one issued in the same second.

## Context

Today `/login` is one page with "I need help / I'm a pro" tabs, and login uses an emailed 6-digit code (plan `helpio-backend/docs/superpowers/plans/2026-10-22-customer-provider-auth-onboarding.md`, decision D1). Codes rarely arrive: Brevo rejects the server's IP and `AUTH_DEV_EMAIL_CONSOLE` is off, so sign-up returns 503. The Google button never shows either, because the frontend has no `VITE_GOOGLE_CLIENT_ID`.

The new requirement is **separate, properly branded login and sign-up pages for customers and for providers, using email + password**:

- **Customers:** Google is offered at the bottom of both pages.
- **Providers:** sign-up stays three steps: ① details + password, ② at least 3 skills, ③ service area.
- **Redirects:** a signed-out user who taps something that needs an account lands on the right login page and returns to what they tapped afterwards.

This reverses D1 of the 2026-10-22 plan. The skills catalogue and onboarding screens from that plan stay. The uncommitted frontend work (`/signup`, `googleSignIn.tsx`, `PasswordField`) is the starting point.

## Confirmed decisions

| Topic | Decision |
|---|---|
| Email code at sign-up | **None.** Sign-up creates the account and signs the user in. `email_verified` stays false until Google or a password reset proves ownership. |
| Forgot password | **Yes**, for customers and providers: emailed 6-digit code, then a new password. |
| Skills | **At least 3**, at most 15 (unchanged). |
| Service area radius | **Metres and km:** chips for 500 m, 1, 2, 5, 10 and 25 km. Working days/hours and location stay. |
| Fields | Customer sign-up: name, email, mobile, password. Provider step 1: name, email, mobile, password, terms. |
| Separation | Two URLs per audience. A provider logging in on the customer page (or the reverse) gets a 409 telling them to use the other login. The pages link to each other. Google stays customer-only. |
| "Proper" pages | Helpio logo on every auth page and in the header, the browser-tab favicon/title replaced (it is still Vite's), and a working Google button. |

## User flows

**Customer: `/login`** (signed-out users of any protected route land here with `?next=`)
1. Logo, "Welcome back", and "Log in to continue." when `next` is set.
2. Card: Email, Password, right-aligned "Forgot password?" link, then **Log in**.
3. "or" divider, then **Continue with Google** at the bottom of the card.
4. Below the card: "New to Helpio? Create an account" (keeps `next`) and "Are you a professional? Log in here".
5. A Google customer with no mobile number still gets the existing "One last step" screen (`CompleteProfileLayout`).

**Customer: `/signup`**: logo, "Create your account", then Name, Email, Mobile (+91), Password (min 8) and **Create account**. Below that: "or", Google, and "Already have an account? Log in". On success the user goes to `next`, or home.

**Provider: `/pro/login`**: "For professionals" eyebrow (amber), Email, Password, "Forgot password?" and **Log in**. Links: "New here? Join as a pro" and "Need help at home? Customer login". No Google. After login, `homePath()` resumes unfinished onboarding.

**Provider: `/pro/signup`** (was `/register`): `StepProgress` 1/3, then Name, Email, Mobile, Password, terms and **Continue**. That signs them in and goes to `/onboarding/skills`, with `?skill=` from the landing calculator preselecting the category. Then `/onboarding/service-area` (radius chips) → **Finish** → home.

**Forgot password: `/forgot-password` and `/pro/forgot-password`** (one page component, audience passed in from the route):
1. Email → **Send code**.
2. Code (`Input.OTP`), new password → **Reset password**, with "resend in Ns" and "use another email".
3. Success toast, then the matching login page with `?email=` prefilled.

## Backend (`helpio-backend`)

**API changes (all under `/api/v1`)**

| Endpoint | Change |
|---|---|
| `POST /auth/register` `{name,email,phone,password,role}` | `password` is now required (8–128). Returns **201 + session**, the same shape as login. Providers get a `ProviderProfile` with status `skills` in the same transaction. Any existing email or phone returns 409. The "reuse unverified sign-up" behaviour is removed. |
| `POST /auth/login` `{email,password,role?}` | Customers, providers and admins (admins send no `role`). The password is checked first, then: 401 for a wrong email or password, 403 for a disabled account, **409 `RoleMismatchError`** when the password is right but the role differs (the message names the right login). |
| `POST /auth/forgot-password` `{email}` | Now any active account. Always 202; a code is sent only to an existing account outside the cooldown, and a rate-limit hit is swallowed so the endpoint doesn't reveal accounts. 503 only if delivery fails. |
| `POST /auth/reset-password` `{email,otp,new_password}` | Now any role. On success it sets the new hash, sets `email_verified = true`, and bumps `token_version`, which signs out every existing session. |
| `POST /auth/google` | Same contract. When it links to an existing account whose email isn't verified, it replaces the password with an unusable hash and bumps `token_version`. This blocks anyone who pre-registered someone else's email and stops them keeping access. |
| **Removed** | `POST /auth/otp/start`, `/auth/verify-otp`, `/auth/otp/resend` |
| `PUT/GET /providers/me/...` | `radius_km` becomes **`radius_m`** (500–50000). |

**Service rules** in `app/modules/auth/service.py`:
- Reuse `hash_secret`/`verify_secret`, `_session`, `_commit`, `_issue_otp`/`_consume_otp` (now used only for password reset), and `ProviderRepository.add_profile`.
- `_access_token_user`: drop the `email_verified` requirement and reject tokens whose `ver` claim differs from `user.token_version`.
- `_claim_phone`: becomes strict. It no longer frees a number from an unverified account, because unverified accounts are now real accounts.
- Delete `start_otp`, `verify_otp` and `resend_otp`. Keep the `OtpPurpose` values, which the DB constraint and existing rows use.

**Files**
- `app/modules/auth/{schema,service,model,exceptions}.py`, `app/api/v1/endpoints/auth.py`. In the schema, remove `OtpStartRequest`, `NextStepResponse`, `VerifyOtpRequest`, `ResendOtpRequest`, and add `LoginRequest.role`.
- `app/modules/providers/{model,schema,service}.py` for `radius_m`.
- New `migrations/202610240001_auth_password_sessions.sql`: `ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0` (every access token carries it as the `ver` claim).
- New `migrations/202610240002_provider_radius_metres.sql`: add `radius_m integer`, backfill `radius_km * 1000` if `radius_km` exists, drop `radius_km`, add `CHECK (radius_m BETWEEN 500 AND 50000)`. Safe to re-run, like the existing migrations.
- Tests:
  - `tests/conftest.py`: `sign_up()` posts register with a password and returns the 201 session; drop its `email_client` argument.
  - `tests/unit/test_auth.py` replaces `test_auth_otp.py`.
  - `tests/unit/test_providers.py`: switch to `radius_m`, with 499 and 50001 rejected and 500 accepted.
- `README.md`: Auth, Provider onboarding and Migrations sections.

## Frontend (`helpio-frontend`, page → layout → component per `.claude/skills/helpio-design`)

**Routing and auth plumbing**
- `src/config/router/RouterKeys.ts`: add `PRO_LOGIN '/pro/login'`, `PRO_SIGNUP '/pro/signup'` (replaces `REGISTER`), `FORGOT_PASSWORD '/forgot-password'` and `PRO_FORGOT_PASSWORD '/pro/forgot-password'`. Register them in `src/pages/auth/routes.ts`.
- `src/pages/auth/authRedirect.ts`: add `loginPathFor(roles?)`, so provider-only routes send users to `/pro/login`.
- `src/pages/auth/RequireAuth.tsx`: use `loginPathFor`.
- `src/pages/auth/auth.api.ts` and `types/auth.dto.ts`:
  - `login` sends `{email,password,role}`.
  - `register` now returns a session, so it gets `transformResponse: toAuthSession` and `onQueryStarted: startSessionOnSuccess`, as the other sign-in endpoints already do.
  - Add `forgotPassword` and `resetPassword`.
  - Delete `startOtp`, `verifyOtp`, `resendOtp` and `passwordLogin`.
- `src/common/CommonEnum.ts`: add `SelfServiceRole` (customer | provider). Layouts can't import from `pages/`, so it lives here. Remove `OtpPurpose`; keep `OTP_LENGTH`.

**Auth screens** (`src/client/default/auth/`, `src/hooks/`, `src/pages/auth/screens/`)
- New `authHeader.tsx`: logo, optional "For professionals" eyebrow, title and subtitle. It is shared markup, like `authFields.tsx`.
- `login.layout.tsx` and `.types.ts`: rewritten as one audience-aware layout. `LoginTab`, `LoginStep`, the details step and the OTP step go away. `google` is null for providers.
- `src/hooks/useLogin.ts`: becomes `useLogin(audience)`, with the `?email=` prefill and the `next`-preserving links.
- Pages:
  - `screens/login/login.page.tsx` stays the customer page and keeps the CompleteProfile handling.
  - New `screens/proLogin/proLogin.page.tsx`.
- Customer sign-up: `signup.layout.tsx`, `useSignup.ts` and `signup.page.tsx` drop the OTP step and honour `next`.
- Provider step 1: `register.layout.tsx`, `useRegister.ts` and `register.page.tsx` add `PasswordField` and drop the OTP step; the redirect logic is unchanged.
- New forgot-password screen:
  - `forgotPassword.layout.tsx` and `.types.ts`.
  - `src/hooks/useForgotPassword.ts`, which reuses `useCountdown` and `apiErrorMessage`.
  - `screens/forgotPassword/forgotPassword.page.tsx`.
- Reused as they are: `authFields.tsx` (`EmailField`, `NameField`, `PhoneField`, `PasswordField`, which gains optional `name`/`label` for "New password"), `googleSignIn.tsx`/`GoogleButton`, `CompleteProfileLayout`, `StepProgress`, `homePath`/`safeNext`/`needsProfile`.
- Delete: `src/hooks/useOtpStep.ts` and `src/component/marketplace/OtpVerify.tsx` (with its barrel export), both still in git history. Also delete the empty `client/default/auth/loginLayout.tsx` and `pages/auth/auth.tsx`.

**Branding and shell**
- New `src/component/marketplace/HelpioLogo.tsx`: solid `indigo-600` rounded mark with a white lucide icon, plus the "helpio" wordmark, in sizes sm/md. It avoids adding a gradient to every screen.
- `src/component/layout/appLayout.tsx`: use `HelpioLogo` in the header, and hide "Log in" on all six auth routes.
- `index.html`: title becomes "Helpio". `public/favicon.svg` becomes the Helpio mark.
- Google button:
  - Create `helpio-frontend/.env.local` with `VITE_GOOGLE_CLIENT_ID` copied from the backend's `GOOGLE_CLIENT_ID` (a public value).
  - Add `.env.local` and `.env.*.local` to `.gitignore`.
  - Note in `.env.example` that the ID must match the backend and that `http://localhost:5173` must be an authorised JavaScript origin.

**Onboarding radius and landing page**
- New `src/component/ui/ChipSelect.tsx`: a single-choice chip group built on `Chip`, a sibling of `ChipMultiSelect`. Six options don't fit the current `Segmented` at 360px.
- `src/lib/utils.ts`: add `formatDistance(m)`, giving "500 m" or "2 km".
- Rename `radiusKm` to `radiusM` in:
  - `src/client/default/onboarding/{serviceArea.layout.tsx, onboarding.layout.types.ts}`
  - `src/hooks/useServiceSetup.ts` (default 10 km)
  - `src/pages/onboarding/{onboarding.api.ts, types/onboarding.dto.ts}`
  - `src/common/CommonDto.ts` (`ServiceArea`)
- The summary will read "within 500 m of Koramangala". The third `PROVIDER_SIGNUP_STEPS` label becomes "Service area".
- `src/hooks/useLanding.ts`: "Join as a provider" goes to `/pro/signup?skill=…`.
- `src/client/default/hero/hero.layout.tsx`: the provider steps copy changes "Choose 5+ skills" to "Choose 3+ skills", and sign-up "with your email, mobile and a password".
- `.claude/skills/helpio-design/references/components.md`: add `HelpioLogo` and `ChipSelect`, plus rows for the existing `GoogleButton`, `StepProgress`, `ChipMultiSelect`, `SkillPicker` and `UserMenu`. Move `OtpVerify` to "Removed".

## Tasks

Backend test command: `cd helpio-backend && .venv/Scripts/python.exe -m pytest -q`. Frontend check command: `cd helpio-frontend && npm run lint && npm run build`.

### Task 0: Branch and checkpoint
In the top-level repo, create branch `feature/password-auth` and commit only `helpio-backend/` as it stands; approving this plan authorises this commit. The email-code endpoints being deleted exist only in that uncommitted tree. In `helpio-frontend`, create the same branch without committing. Nothing else gets committed unless you ask.

### Task 1: Backend password auth (TDD)
Tests first: `tests/conftest.py` `sign_up()`, and `tests/unit/test_auth.py` replacing `test_auth_otp.py` (cases under Verification). Then migration `202610240001_auth_password_sessions.sql`, model `token_version`, schema, service, endpoints and exceptions, as in the "Backend" section.

### Task 2: Backend radius in metres (TDD)
Tests first: in `tests/unit/test_providers.py`, use `radius_m`; 499 and 50001 are rejected, 500 is accepted. Then migration `202610240002_provider_radius_metres.sql`, plus the providers model, schema and service.

### Task 3: Docs
- Update the `README.md` Auth, Provider onboarding and Migrations sections.
- Save this plan as `helpio-backend/docs/superpowers/plans/2026-10-24-password-login-separate-auth.md`.
- Add a "superseded by" note to the auth parts of the 2026-10-22 plan.

### Task 4: Frontend plumbing
Routes, `auth.api.ts`, DTOs, enums (`SelfServiceRole`), `authRedirect`/`RequireAuth`, and the env files (`.env.local`, `.gitignore`, `.env.example`), per "Routing and auth plumbing".

### Task 5: Shared UI and branding
`HelpioLogo`, `ChipSelect`, `formatDistance` and `authHeader.tsx`, plus the header logo, favicon and title.

### Task 6: Auth screens
Customer login, provider login, customer sign-up, provider step 1 and forgot password. Then delete `useOtpStep`, `OtpVerify` and the empty files.

### Task 7: Onboarding radius, landing page, catalogue
Rename `radiusKm` to `radiusM` across onboarding, use `ChipSelect` with metre options, update the landing link and copy, and update `components.md`.

## Verification

- **Backend:** `cd helpio-backend; .\.venv\Scripts\python.exe -m pytest`. New cases:
  - Register gives a session, and a provider gets status `skills`.
  - Duplicate email or phone → 409. Missing or short password → 422.
  - Login per role; email is case-insensitive.
  - Wrong password → 401, even when the role is also wrong. Correct password, wrong role → 409.
  - Disabled account → 403. Admin login without `role` still works.
  - Google creates a customer and rejects provider emails.
  - Google linking to an unverified account kills the old password and the old token.
  - Forgot/reset works for both roles. An unknown email or a cooldown hit returns 202 and sends nothing.
  - 5 wrong codes → 429. After a reset the old password and old token fail and the new password works.
  - Delivery failure → 503. Logout revokes the token.
- **Frontend:** `cd helpio-frontend; npm run lint; npm run build`, plus the component-import grep from `checklist.md` (must print nothing).
- **Manual run:** `uvicorn app.main:app --reload` and `npm run dev`, with `AUTH_DEV_EMAIL_CONSOLE=true` so reset codes print in the console.
  1. Signed out, tap "Post a job": you land on `/login?next=/jobs/new`. Create an account and you come back to `/jobs/new`.
  2. Log out, log in with email + password.
  3. Google button at the bottom of `/login` and `/signup`: a new Google user sees "One last step" for the mobile number.
  4. "Join as a provider": `/pro/signup`, then skills (Continue stays disabled below 3), then a 500 m radius, then Finish.
  5. A provider who stops after step 1 logs in at `/pro/login` and resumes at skills.
  6. A provider email on `/login`, and a customer email on `/pro/login`, each get the "use the other login" message.
  7. Forgot password for both roles; a session open in another tab is signed out.
  8. Check at 360px and 430px.

## Things only you can do

- Apply the two new migrations in the Supabase SQL editor (after the 2026-10-22 ones, if those aren't applied yet).
- Google Cloud Console: add `http://localhost:5173`, and later the production origin, to the OAuth client's **Authorised JavaScript origins**.
- Email for "Forgot password": fix the Brevo IP allow-list (see `2026-10-01-signup-email-failure.md`), or use `AUTH_DEV_EMAIL_CONSOLE=true` locally.

## Known limits (not in this change)

- Email and mobile aren't verified at sign-up, so someone can squat a mobile number; SMS verification would fix that later.
- There is no login brute-force rate limiting yet (needs Redis or a similar store).
- No KYC, no profile-editing screens.
