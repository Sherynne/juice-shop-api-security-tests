const { test, expect } = require('@playwright/test');
const { createUser, authHeader, knownVulnerability } = require('./helpers');

async function addItem(request, user, quantity, productId = 1) {
  return request.post('/api/BasketItems', {
    headers: authHeader(user.token),
    data: { ProductId: productId, BasketId: String(user.bid), quantity },
  });
}

function expectClientError(res) {
  expect(res.status()).toBeGreaterThanOrEqual(400);
  expect(res.status()).toBeLessThan(500);
}

test.describe('Basket business logic', () => {
  test('BL-01 adding a valid quantity to your own basket works', async ({ request }) => {
    const user = await createUser(request);
    const res = await addItem(request, user, 1);
    expect(res.status()).toBe(200);
    expect((await res.json()).data.quantity).toBe(1);
  });

  test('BL-02 a negative quantity is rejected', async ({ request }) => {
    knownVulnerability('BL-02', 'negative basket quantity accepted');
    const user = await createUser(request);
    const res = await addItem(request, user, -5);
    expectClientError(res);
  });

  test('BL-03 a zero quantity is rejected', async ({ request }) => {
    knownVulnerability('BL-03', 'zero basket quantity accepted');
    const user = await createUser(request);
    const res = await addItem(request, user, 0);
    expectClientError(res);
  });

  test('BL-04 updating an existing item to a negative quantity is rejected', async ({ request }) => {
    knownVulnerability('BL-04', 'basket item can be updated to a negative quantity');
    const user = await createUser(request);
    const added = await addItem(request, user, 1);
    const itemId = (await added.json()).data.id;
    const res = await request.put(`/api/BasketItems/${itemId}`, {
      headers: authHeader(user.token),
      data: { quantity: -5 },
    });
    expectClientError(res);
  });
});
