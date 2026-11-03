const { test, expect } = require('@playwright/test');
const {
  PASSWORD, register, createUser, authHeader, knownVulnerability, uniqueEmail,
} = require('./helpers');

test.describe('Access control', () => {
  test('AC-01 listing users without a token is rejected', async ({ request }) => {
    const res = await request.get('/api/Users');
    expect(res.status()).toBe(401);
  });

  test('AC-02 reading a basket without a token is rejected', async ({ request }) => {
    const res = await request.get('/rest/basket/1');
    expect(res.status()).toBe(401);
  });

  test('AC-03 a customer cannot list all users', async ({ request }) => {
    knownVulnerability('AC-03', 'any logged-in customer can list every user, including admins');
    const { token } = await createUser(request);
    const res = await request.get('/api/Users', { headers: authHeader(token) });
    expect([401, 403]).toContain(res.status());
  });

  test("AC-04 a customer cannot read another user's basket", async ({ request }) => {
    knownVulnerability('AC-04', 'basket IDOR: any customer can read any basket by id');
    const userA = await createUser(request);
    const userB = await createUser(request);
    const res = await request.get(`/rest/basket/${userB.bid}`, { headers: authHeader(userA.token) });
    expect([401, 403, 404]).toContain(res.status());
  });

  test("AC-05 a customer cannot add items to another user's basket", async ({ request }) => {
    const userA = await createUser(request);
    const userB = await createUser(request);
    const res = await request.post('/api/BasketItems', {
      headers: authHeader(userA.token),
      data: { ProductId: 1, BasketId: String(userB.bid), quantity: 1 },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('AC-06 registration cannot assign the admin role', async ({ request }) => {
    knownVulnerability('AC-06', 'mass assignment: role=admin accepted at registration');
    const { res } = await register(request, {
      email: uniqueEmail('role'),
      extra: { role: 'admin' },
    });
    const role = res.ok() ? (await res.json()).data.role : 'rejected';
    expect(role).not.toBe('admin');
  });
});
