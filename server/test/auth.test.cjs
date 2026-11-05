const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { once } = require('node:events');
const test = require('node:test');
const { createApplication } = require('../dist/app.js');
const { readConfig } = require('../dist/config.js');

function testDatabaseUrl() {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  assert.ok(databaseUrl, 'Set TEST_DATABASE_URL to a migrated disposable PostgreSQL database');
  const target = new URL(databaseUrl);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) && target.pathname.endsWith('_test'),
    'Authentication integration tests require a loopback database whose name ends with _test');
  return databaseUrl;
}

test('production serves public requests but disables sign-in until a provider is configured', async () => {
  const origin = 'https://repairvantage.example';
  const application = createApplication(readConfig({
    NODE_ENV: 'production',
    APP_ORIGIN: origin,
    DATABASE_URL: testDatabaseUrl(),
    BETTER_AUTH_SECRET: randomBytes(32).toString('base64url'),
    AUTH_EMAIL_FROM: 'sender@example.test',
  }));
  const listener = application.app.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const baseURL = `http://127.0.0.1:${listener.address().port}`;
  const post = (path, payload) => fetch(`${baseURL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(payload),
  });

  try {
    const health = await fetch(`${baseURL}/health`);
    assert.equal(health.status, 200);
    const ready = await fetch(`${baseURL}/ready`);
    assert.equal(ready.status, 503);
    assert.deepEqual(await ready.json(), { status: 'auth_setup_required' });
    const providers = await fetch(`${baseURL}/api/auth/providers`);
    assert.equal(providers.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await providers.json(), { google: false, emailOtp: false });
    const session = await fetch(`${baseURL}/api/auth/get-session`);
    assert.equal(session.status, 200);
    assert.equal(await session.json(), null);
    assert.equal((await post('/api/auth/sign-in/social', { provider: 'google' })).status, 503);
    assert.equal((await post('/api/auth/email-otp/send-verification-otp', { email: 'recipient@example.test', type: 'sign-in' })).status, 503);
    const workspace = await post('/graphql', { query: '{ me { email } }' });
    assert.equal((await workspace.json()).errors[0].extensions.code, 'UNAUTHENTICATED');
  } finally {
    listener.closeAllConnections();
    await new Promise(resolve => listener.close(resolve));
    await application.apollo.stop();
    await application.prisma.$disconnect();
  }
});

test('email-code enrollment issues a verified session and logout revokes it', async () => {
  const databaseUrl = testDatabaseUrl();
  const origin = 'http://localhost:5173';
  const email = `otp-${randomUUID()}@example.test`;
  const codes = [];
  const application = createApplication(readConfig({
    APP_ORIGIN: origin,
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_SECRET: randomBytes(32).toString('base64url'),
    TRUST_PROXY_HOPS: '1',
    AUTH_OTP_DAILY_LIMIT: '1',
  }), async (recipient, code) => codes.push({ recipient, code }));
  const listener = application.app.listen(0, '127.0.0.1');
  await once(listener, 'listening');

  // Each local test run gets a separate trusted test IP for persistent rate-limit rows.
  const ip = `192.0.${randomBytes(1)[0]}.${randomBytes(1)[0]}`;
  const baseURL = `http://127.0.0.1:${listener.address().port}`;
  async function post(path, payload, { browserOrigin = origin, cookie, clientIp = ip } = {}) {
    return fetch(`${baseURL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', Origin: browserOrigin, 'X-Forwarded-For': clientIp,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(payload),
    });
  }

  try {
    const ready = await fetch(`${baseURL}/ready`);
    assert.equal(ready.status, 200);
    assert.equal(ready.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await (await fetch(`${baseURL}/api/auth/providers`)).json(), { google: false, emailOtp: true });
    await application.prisma.otpThrottle.deleteMany({ where: { key: 'daily-budget' } });

    const requestCode = '/api/auth/email-otp/send-verification-otp';
    assert.equal((await post(requestCode, { email, type: 'sign-in' }, { browserOrigin: 'https://outside.example' })).status, 403);
    assert.equal((await post(requestCode, { email, type: 'forget-password' })).status, 400);
    assert.deepEqual(codes, []);
    assert.equal((await post(requestCode, { email, type: 'sign-in' })).status, 200);
    const duplicate = await post(requestCode, { email: email.toUpperCase(), type: 'sign-in' }, { clientIp: '192.0.2.34' });
    assert.equal(duplicate.status, 429);
    assert.match((await duplicate.json()).message, /Wait a minute/);
    const atBudget = await post(requestCode, { email: `other-${email}`, type: 'sign-in' }, { clientIp: '192.0.2.35' });
    assert.equal(atBudget.status, 429);
    assert.match((await atBudget.json()).message, /temporarily unavailable/);
    assert.equal(codes.length, 1);
    assert.equal(codes[0].recipient, email);

    const signIn = '/api/auth/sign-in/email-otp';
    const input = { email, otp: codes[0].code, name: 'Integration Owner' };
    const wrongCode = codes[0].code === '000000' ? '111111' : '000000';
    assert.equal((await post(signIn, { ...input, otp: wrongCode })).ok, false);
    const session = await post(signIn, input);
    assert.equal(session.status, 200);
    assert.equal((await session.json()).user.emailVerified, true);
    const sessionHeader = session.headers.getSetCookie().find(value => value.startsWith('repairvantage.session_token='));
    assert.match(sessionHeader, /; HttpOnly/i);
    const cookie = sessionHeader.split(';')[0];
    assert.equal((await post(signIn, input)).ok, false);

    const query = { query: '{ me { email name } }' };
    const authorized = await post('/graphql', query, { cookie });
    assert.equal(authorized.headers.get('cache-control'), 'no-store');
    assert.deepEqual((await authorized.json()).data.me, { email, name: 'Integration Owner' });
    const logout = await post('/api/auth/sign-out', {}, { cookie });
    assert.equal(logout.status, 200);
    const afterLogout = await (await post('/graphql', query, { cookie })).json();
    assert.equal(afterLogout.data, null);
    assert.equal(afterLogout.errors[0].extensions.code, 'UNAUTHENTICATED');
  } finally {
    listener.closeAllConnections();
    await new Promise(resolve => listener.close(resolve));
    await application.prisma.user.deleteMany({ where: { email } });
    await application.prisma.otpThrottle.deleteMany({ where: { key: 'daily-budget' } });
    await application.apollo.stop();
    await application.prisma.$disconnect();
  }
});
