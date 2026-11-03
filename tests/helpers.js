const { test, expect } = require('@playwright/test');

const PASSWORD = 'Passw0rd!x';

const uniqueEmail = (prefix = 'qa') =>
  `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@test.com`;

// Registers a user. Extra fields (for example role) can be passed in `extra`.
async function register(request, { email = uniqueEmail(), password = PASSWORD, extra = {} } = {}) {
  const res = await request.post('/api/Users', {
    data: { email, password, passwordRepeat: password, ...extra },
  });
  return { res, email, password };
}

async function login(request, email, password) {
  return request.post('/rest/user/login', { data: { email, password } });
}

// Registers and logs in a fresh customer. Returns the token and basket id.
async function createUser(request) {
  const { res, email, password } = await register(request);
  expect(res.status()).toBe(201);
  const loginRes = await login(request, email, password);
  expect(loginRes.status()).toBe(200);
  const { authentication } = await loginRes.json();
  return { email, password, token: authentication.token, bid: authentication.bid };
}

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

function decodeJwtPayload(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
}

// Marks a test as a known vulnerability in this deliberately vulnerable app.
// The test asserts the SECURE behaviour, so it fails against Juice Shop. Playwright
// treats that as an expected failure, so the suite stays green and the finding is
// recorded as an annotation. If the app gets fixed the test "unexpectedly passes",
// which is reported as a failure and tells you to update the test.
// Run with STRICT=1 to see every finding as a real failure.
function knownVulnerability(id, summary) {
  test.info().annotations.push({ type: 'finding', description: `${id}: ${summary}` });
  if (!process.env.STRICT) {
    test.fail(true, `${id} is a known vulnerability in this app`);
  }
}

module.exports = {
  PASSWORD,
  uniqueEmail,
  register,
  login,
  createUser,
  authHeader,
  decodeJwtPayload,
  knownVulnerability,
};
