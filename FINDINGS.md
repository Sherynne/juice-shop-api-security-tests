# Findings Report: OWASP Juice Shop API

**Target:** OWASP Juice Shop v20.3.0, run locally (a deliberately vulnerable practice application)
**Scope:** REST API (`/api`, `/rest`) and public endpoints
**Method:** Automated Playwright tests that assert the secure behaviour. Each finding below has a test with the same ID in `tests/`.
**Result:** 23 checks, 14 findings, 9 controls that behave correctly.

Severity is my own rating for a typical e-commerce application.

## Summary

| ID | Finding | Severity | Category |
|---|---|---|---|
| AUTH-03 | SQL injection in login returns an admin session | Critical | Injection |
| AC-06 | Any visitor can register as an admin | Critical | Broken access control |
| AC-04 | Any customer can read any other customer's basket | High | Broken access control |
| AC-03 | Any customer can list all users, including admins | High | Broken access control |
| AUTH-07 | Session token contains the password hash and a TOTP secret field | High | Sensitive data exposure |
| EX-02 | Document marked confidential is downloadable without login | High | Information exposure |
| AUTH-06 | No rate limiting or lockout on login | Medium | Authentication failures |
| AUTH-05 | One-character password accepted at registration | Medium | Authentication failures |
| BL-02 | Negative quantity accepted when adding to basket | Medium | Business logic |
| BL-04 | Basket item can be updated to a negative quantity | Medium | Business logic |
| EX-01 | Directory listing of `/ftp` is public | Medium | Security misconfiguration |
| EX-03 | `/metrics` is public | Medium | Security misconfiguration |
| BL-03 | Zero quantity accepted when adding to basket | Low | Business logic |
| EX-04 | CORS allows any origin (`*`) | Low | Security misconfiguration |

## Controls that work

| ID | Behaviour confirmed |
|---|---|
| AUTH-01 | Valid login returns a token |
| AUTH-02 | Wrong password returns 401 |
| AUTH-04 | Duplicate email registration returns 400 |
| AC-01 | `/api/Users` requires a token |
| AC-02 | `/rest/basket/:id` requires a token |
| AC-05 | A customer cannot add items to another customer's basket (401) |
| BL-01 | Adding a valid quantity to your own basket works |
| EX-05 | `X-Content-Type-Options: nosniff` is set |
| EX-06 | `X-Frame-Options` is set |

## Details

### AUTH-03: SQL injection in login (Critical)
**Steps:** `POST /rest/user/login` with body `{"email": "' or 1=1--", "password": "anything"}`.
**Expected:** 401, invalid credentials.
**Actual:** 200 with a valid session token for the admin account (the token's role claim is `admin`).
**Fix:** Use parameterised queries for the login lookup. Never build SQL from request fields.

### AC-06: Self-service admin registration (Critical)
**Steps:** `POST /api/Users` with a normal registration body plus `"role": "admin"`.
**Expected:** The extra field is ignored or the request is rejected, and the new user is a customer.
**Actual:** 201, and the new account has the admin role.
**Fix:** Allow-list the fields accepted at registration. Set the role on the server only.

### AC-04: Basket IDOR (High)
**Steps:** Register two users, A and B. Log in as A. `GET /rest/basket/{B's basket id}` with A's token.
**Expected:** 403 or 404.
**Actual:** 200 with B's basket and its products.
**Fix:** Check that the basket belongs to the authenticated user on every read.

### AC-03: All users listed to any customer (High)
**Steps:** Log in as a new customer. `GET /api/Users`.
**Expected:** 403.
**Actual:** 200 with every user, including email address and role, with the admin account visible.
**Fix:** Restrict the endpoint to admins and return only the fields needed.

### AUTH-07: Secrets inside the session token (High)
**Steps:** Log in and decode the payload of the returned JWT (it is base64, not encrypted).
**Expected:** Only the claims needed to identify the user.
**Actual:** The payload contains a `password` field (a hash) and a `totpSecret` field, alongside other profile data.
**Fix:** Put only an id and role in the token. Never include credential data.

### EX-02: Confidential document exposed (High)
**Steps:** `GET /ftp/acquisitions.md` with no login.
**Expected:** 401, 403 or 404.
**Actual:** 200. The file is titled as confidential and describes planned acquisitions.
**Fix:** Do not serve internal files from a public folder.

### AUTH-06: No login throttling (Medium)
**Steps:** Send 20 failed logins for the same account in a row.
**Expected:** At least one 429 response or an account lockout.
**Actual:** All 20 return 401 and the account stays open to guessing.
**Fix:** Rate limit per account and per IP. Add progressive delays or lockout.

### AUTH-05: Weak password accepted (Medium)
**Steps:** `POST /api/Users` with password `1`.
**Expected:** 400.
**Actual:** 201. The password policy is not enforced by the API.
**Fix:** Enforce length and strength rules on the server, not only in the form.

### BL-02, BL-03, BL-04: Basket quantity validation (Medium, Low, Medium)
**Steps:** `POST /api/BasketItems` with quantity `-5` (BL-02) or `0` (BL-03). Or add a valid item and then `PUT /api/BasketItems/{id}` with quantity `-5` (BL-04).
**Expected:** 400.
**Actual:** 200 in all three cases, and the basket stores the invalid quantity.
**Impact:** Negative quantities can reduce a basket total. These tests do not go on to checkout, so the effect on the final order total is not verified here.
**Fix:** Validate quantity as a positive integer on every create and update.

### EX-01: Public directory listing (Medium)
**Steps:** `GET /ftp`.
**Expected:** 401, 403 or 404.
**Actual:** 200 with a browsable file listing.
**Fix:** Disable directory listing and do not expose the folder.

### EX-03: Public metrics (Medium)
**Steps:** `GET /metrics`.
**Expected:** 401, 403 or 404.
**Actual:** 200. Operational data is readable without login.
**Fix:** Restrict monitoring endpoints to internal networks or authenticated scrapers.

### EX-04: Wildcard CORS (Low)
**Steps:** `GET /api/Products` with header `Origin: https://evil.example`.
**Expected:** The response does not allow arbitrary origins.
**Actual:** `Access-Control-Allow-Origin: *`.
**Fix:** Allow only the origins that need access.
