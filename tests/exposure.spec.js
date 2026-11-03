const { test, expect } = require('@playwright/test');
const { knownVulnerability } = require('./helpers');

test.describe('Information exposure and security headers', () => {
  test('EX-01 the /ftp directory listing is not public', async ({ request }) => {
    knownVulnerability('EX-01', 'directory listing of /ftp is public');
    const res = await request.get('/ftp');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('EX-02 internal documents under /ftp are not downloadable', async ({ request }) => {
    knownVulnerability('EX-02', 'confidential document downloadable without authentication');
    const res = await request.get('/ftp/acquisitions.md');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('EX-03 the /metrics endpoint is not public', async ({ request }) => {
    knownVulnerability('EX-03', 'monitoring metrics exposed without authentication');
    const res = await request.get('/metrics');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('EX-04 CORS does not allow arbitrary origins', async ({ request }) => {
    knownVulnerability('EX-04', 'Access-Control-Allow-Origin is a wildcard');
    const res = await request.get('/api/Products', { headers: { Origin: 'https://evil.example' } });
    expect(res.headers()['access-control-allow-origin']).not.toBe('*');
  });

  test('EX-05 X-Content-Type-Options is set to nosniff', async ({ request }) => {
    const res = await request.get('/api/Products');
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('EX-06 X-Frame-Options is set', async ({ request }) => {
    const res = await request.get('/api/Products');
    expect(res.headers()['x-frame-options']).toBeTruthy();
  });
});
