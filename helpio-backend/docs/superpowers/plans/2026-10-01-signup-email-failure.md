# Signup Email Failure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Restore signup OTP delivery and make email service failures diagnosable without exposing secrets.

**Architecture:** Keep Brevo SMTP and the existing synchronous OTP flow. Resolve the provider IP restriction, add a no-send SMTP diagnostic command, and record sanitized failure categories while preserving the public 503 response and transaction rollback.

**Tech Stack:** Python 3.11+, FastAPI, smtplib, Pydantic Settings, SQLAlchemy, pytest.

**Spec:** User request to investigate signup 503 and plan fixes; investigation evidence below.

## Evidence

- Settings default to .env.dev; BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, and BREVO_FROM_EMAIL are populated in this diagnostic process.
- Live connection to smtp-relay.brevo.com:587 and STARTTLS both succeed.
- SMTP login fails with SMTPAuthenticationError: 525 5.7.1 Unauthorized IP address. No email was sent during the check.
- app/integrations/email.py wraps SMTP errors in RuntimeError; app/modules/auth/service.py wraps that as EmailDeliveryError without logging. The endpoint maps this to a handled 503, explaining the absence of a traceback in Uvicorn access logs.
- Existing targeted tests: 13 passed, with one Starlette/httpx deprecation warning.
- The application process may have environment overrides different from this diagnostic process; verify with the same shell and network used for Uvicorn.

## Global Constraints

- Keep SMTP keys, passwords, OTPs, recipient addresses, and raw SMTP responses out of diagnostic output and logs.
- Retain mandatory signup verification and the existing public error detail.
- Do not send email from the diagnostic command or unit tests.
- Do not alter database schema or replace the email provider.

## Review Focus

- Unauthorized IP: diagnostic identifies the restriction without exposing provider payloads.
- Missing settings: diagnostic reports variable names and does not connect.
- Rejected credentials: distinct from unauthorized IP, without printing credentials.
- Network/TLS failure: bounded connection time and nonzero diagnostic exit.
- Failed delivery: signup rolls back user and OTP; password reset preserves prior records.

### Task 1: Resolve provider IP authorization

**Files:** No application code or credential changes required initially.

- [ ] Inspect Brevo account IP authorization controls and determine the outgoing public IP of the backend network; account access is needed for this step.
- [ ] Authorize the intended backend outgoing IP under the account's policy. Include production egress separately if production is affected. Avoid broadly disabling IP restrictions.
- [ ] Repeat connection, STARTTLS, and login from the Uvicorn environment. Expected: SMTP authentication succeeds without sending an email.
- [ ] If a different failure appears after authorization, diagnose that new response before changing credentials or sender configuration. Sender verification has not yet been tested.

### Task 2: Add safe diagnostics and error classification

**Files:** Modify app/integrations/email.py and app/modules/auth/service.py; create scripts/check_email.py and tests/unit/test_check_email.py; modify tests/unit/test_email.py and README.md.

**Interfaces:** Preserve OtpEmailClient.send_otp(*, to_email: str, otp: str, purpose: str) -> None. Introduce EmailTransportError(RuntimeError) carrying category: str and smtp_code: int | None. Add BrevoOtpEmailClient.check_connection() -> None and scripts.check_email.main() -> int.

- [ ] Add failing mocked tests for missing settings, successful no-send authentication, 525 unauthorized IP, other authentication rejection, connection timeout, and TLS failure. Assert main returns 0 for success and 1 for failure, and no diagnostic invokes send_message.
- [ ] Assert diagnostic output and logs do not contain fixture credentials, OTP, recipient, or raw provider response. Cover a provider response containing these fixture values.
- [ ] Run .\.venv\Scripts\python.exe -m pytest tests/unit/test_email.py tests/unit/test_check_email.py -q and confirm new tests fail for the missing interfaces.
- [ ] Implement shared configuration validation and SMTP connection/authentication handling. Classify the observed 525 unauthorized-IP response as unauthorized_ip; classify other login rejection as authentication, missing values as configuration, and network/TLS failures separately. Retain a 10-second connection timeout.
- [ ] Implement python -m scripts.check_email with safe actionable messages and no sending. Print variable names for missing config; for unauthorized_ip explain that the backend egress IP needs authorization in Brevo.
- [ ] Log a sanitized category and SMTP code when AuthService converts delivery failure to EmailDeliveryError. Do not log exception traceback or raw exception text; injected RuntimeError clients receive an unknown category.
- [ ] Document the diagnostic command, dev/prod selection, process environment precedence, and the observed unauthorized-IP remedy in README.md.
- [ ] Run the targeted tests and confirm all pass.

### Task 3: Verify rollback and actual recovery

**Files:** Modify tests/unit/test_auth.py.

- [ ] Extend failure tests to query the database before teardown: failed signup leaves zero matching users and OTPs; failed password reset adds no new OTP and leaves existing data unchanged.
- [ ] Add a recovery test: the same signup email succeeds after the mocked email transport recovers, returns 201 with requires_verification=true, and can complete OTP verification.
- [ ] Run .\.venv\Scripts\python.exe -m pytest tests/unit -q. Expected: all unit tests pass; no real email or database calls.
- [ ] Run .\.venv\Scripts\python.exe -m scripts.check_email from the actual backend environment. Expected: successful authentication.
- [ ] Restart Uvicorn after configuration changes because get_settings is cached. Have an explicitly authorized test recipient exercise signup and OTP verification; expected 201, received OTP, and successful verification. Actual sending requires explicit authorization.

## Completion criteria

The backend environment authenticates successfully with Brevo, signup and verification work for an authorized recipient, failures remain a sanitized 503, and diagnostics identify the provider restriction without leaking sensitive data.
