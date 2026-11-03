# API Security and Business Logic Tests: OWASP Juice Shop

Automated API tests written with Playwright and JavaScript. They check access control, authentication, basket business logic and information exposure on OWASP Juice Shop, an intentionally vulnerable web shop built for security training.

**Result: 23 checks. 14 vulnerabilities found and documented, 9 controls confirmed working.**
Full write-up with steps to reproduce, expected and actual results, and fixes: [FINDINGS.md](FINDINGS.md).

Only run these tests against applications you own or have permission to test. Juice Shop is built for exactly this.

## How the tests work

Each test asserts the secure behaviour. For example, AC-04 expects a customer to be refused when reading another customer's basket. Juice Shop allows it, so the test fails.

For the 14 known vulnerabilities the test is marked as an expected failure with `test.fail()`, and the finding is recorded as a test annotation. That keeps the pipeline green while the finding stays documented. If the app gets fixed, the test unexpectedly passes and the run reports it, so you know to update the test.

In the terminal and report, expected failures show with a cross (✘) and still count as passed.

To see every finding as a real failure, run in strict mode:

```
# macOS / Linux
STRICT=1 npx playwright test

# Windows PowerShell
$env:STRICT=1; npx playwright test
```

## Test coverage

| File | Area | Checks |
|---|---|---|
| `tests/auth.spec.js` | Login, SQL injection, password policy, throttling, token contents | 7 |
| `tests/access-control.spec.js` | Unauthenticated access, user listing, basket IDOR, role assignment | 6 |
| `tests/business-logic.spec.js` | Basket quantity validation (negative, zero, update) | 4 |
| `tests/exposure.spec.js` | Public files, metrics, CORS, security headers | 6 |

## Run it

1. Start Juice Shop. With Docker:

```
docker run -d -p 3000:3000 bkimminich/juice-shop
```

Without Docker, download the release for your system from the Juice Shop GitHub releases page, extract it and run `npm start`.

2. Run the tests:

```
npm install
npx playwright test
npx playwright show-report
```

To test another address, set `BASE_URL`, for example `BASE_URL=http://localhost:4000`.

## CI

`.github/workflows/security-tests.yml` starts Juice Shop as a service container in GitHub Actions, waits for it to be ready, runs the suite and uploads the HTML report.
