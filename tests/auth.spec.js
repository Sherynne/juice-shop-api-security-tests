const { test, expect } = require('@playwright/test');
const {
  PASSWORD, register, login, createUser, decodeJwtPayload, knownVulnerability, uniqueEmail,
} = require('./helpers');

test.describe('Authentication', () => {
  test('AUTH-01 valid credentials return a token', async ({ request }) => {
    const { email, password } = await createUser(request);
    const res = await login(request, email, password);
    expect(res.status()).toBe(200);
    expect((await res.json()).authentication.token).toBeTruthy();
  });

  test('AUTH-02 wrong password is rejected with 401', async ({ request }) => {
    const { email } = await createUser(request);
    const res = await login(request, email, 'definitely-wrong');
    expect(res.status()).toBe(401);
  });

  test('AUTH-03 SQL injection in the login email is rejected', async ({ request }) => {
    knownVulnerability('AUTH-03', 'SQL injection in login returns an admin session');
    const res = await login(request, "' or 1=1--", 'anything');
    expect(res.status()).toBe(401);
  });

  test('AUTH-04 registering a duplicate email is rejected', async ({ request }) => {
    const { email } = await createUser(request);
    const { res } = await register(request, { email });
    expect(res.status()).toBe(400);
  });

  test('AUTH-05 a one-character password is rejected at registration', async ({ request }) => {
    knownVulnerability('AUTH-05', 'password policy is not enforced by the API');
    const { res } = await register(request, { email: uniqueEmail('weak'), password: '1' });
    expect(res.status()).toBe(400);
  });

  test('AUTH-06 repeated failed logins are throttled', async ({ request }) => {
    knownVulnerability('AUTH-06', 'no rate limiting or lockout on login');
    const { email } = await createUser(request);
    const statuses = [];
    for (let i = 0; i < 20; i++) {
      const res = await login(request, email, `wrong-${i}`);
      statuses.push(res.status());
    }
    expect(statuses).toContain(429);
  });

  test('AUTH-07 the session token does not contain secrets', async ({ request }) => {
    knownVulnerability('AUTH-07', 'JWT payload contains the password hash and TOTP secret field');
    const { token } = await createUser(request);
    const claims = decodeJwtPayload(token).data;
    expect(claims).not.toHaveProperty('password');
    expect(claims).not.toHaveProperty('totpSecret');
  });
});
