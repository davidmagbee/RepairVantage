const assert = require('node:assert/strict');
const { createHmac, generateKeyPairSync, randomBytes, randomUUID, sign } = require('node:crypto');
const { once } = require('node:events');
const test = require('node:test');
const { createApplication } = require('../dist/app.js');
const { readConfig } = require('../dist/config.js');
const { testDatabaseUrl } = require('./database-url.cjs');

test('production serves public requests but disables sign-in until a provider is configured', async () => {
  const origin = 'https://repairvantage.example';
  const databaseUrl = testDatabaseUrl().toString();
  const config = readConfig({
    NODE_ENV: 'production',
    APP_ORIGIN: origin,
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_SECRET: randomBytes(32).toString('base64url'),
    AUTH_EMAIL_FROM: 'sender@example.test',
  });
  // This test exercises production HTTP behavior using the disposable loopback database.
  const application = createApplication({ ...config, databaseUrl });
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
  const databaseUrl = testDatabaseUrl().toString();
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
  const ipPrefix = `192.${randomBytes(1)[0]}.${randomBytes(1)[0]}`;
  const ip = `${ipPrefix}.1`;
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
    const badAddress = await post(requestCode, { email: 'not-an-email', type: 'sign-in' }, { clientIp: `${ipPrefix}.4` });
    assert.equal(badAddress.status, 400);
    assert.match((await badAddress.json()).message, /valid email address/);
    assert.deepEqual(codes, []);
    assert.equal((await post(requestCode, { email, type: 'sign-in' })).status, 200);
    const duplicate = await post(requestCode, { email: email.toUpperCase(), type: 'sign-in' }, { clientIp: `${ipPrefix}.2` });
    assert.equal(duplicate.status, 429);
    assert.match((await duplicate.json()).message, /Wait a minute/);
    const atBudget = await post(requestCode, { email: `other-${email}`, type: 'sign-in' }, { clientIp: `${ipPrefix}.3` });
    assert.equal(atBudget.status, 429);
    assert.match((await atBudget.json()).message, /temporarily unavailable/);
    assert.equal(codes.length, 1);
    assert.equal(codes[0].recipient, email);

    const signIn = '/api/auth/sign-in/email-otp';
    const input = { email, otp: codes[0].code, name: 'Integration Owner' };
    const invalidName = await post(signIn, { ...input, name: 'x'.repeat(121) });
    assert.equal(invalidName.status, 400);
    assert.match((await invalidName.json()).message, /name of at most 120 characters/);
    assert.equal(invalidName.headers.getSetCookie().length, 0);
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

async function providerHarness(t, env, cleanRecords) {
  const origin = 'http://localhost:5173';
  const config = readConfig({
    APP_ORIGIN: origin,
    DATABASE_URL: testDatabaseUrl().toString(),
    BETTER_AUTH_SECRET: randomBytes(32).toString('base64url'),
    TRUST_PROXY_HOPS: '1',
    ...env,
  });
  const application = createApplication(config);
  const listener = application.app.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  t.after(async () => {
    listener.closeAllConnections();
    await new Promise(resolve => listener.close(resolve));
    try {
      await cleanRecords(application.prisma, config);
    } finally {
      await Promise.all([application.apollo.stop(), application.prisma.$disconnect()]);
    }
  });
  const base = `http://127.0.0.1:${listener.address().port}`;
  const ip = `198.${randomBytes(1)[0]}.${randomBytes(1)[0]}`;
  return {
    prisma: application.prisma,
    request(path, payload, requestNumber, cookie) {
      return fetch(base + path, {
        method: payload ? 'POST' : 'GET',
        headers: {
          Origin: origin,
          'X-Forwarded-For': `${ip}.${requestNumber}`,
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: payload ? JSON.stringify(payload) : undefined,
        redirect: 'manual',
      });
    },
  };
}

test('email delivery accepts a Resend response and masks provider failures', async t => {
  const { Resend } = await import('resend');
  const calls = [];
  const privateDetail = 'upstream response contained a private diagnostic';
  const emails = ['ok', 'rejected', 'threw'].map(result => `resend-${result}-${randomUUID()}@example.test`);
  t.mock.method(Resend.prototype, 'post', async (path, message) => {
    calls.push({ path, message });
    if (message.to === emails[1]) return { data: null, error: { message: privateDetail } };
    if (message.to === emails[2]) throw new Error(privateDetail);
    return { data: { id: 'synthetic-provider-id' }, error: null };
  });

  const sender = 'sender@example.test';
  const { request } = await providerHarness(t, { RESEND_API_KEY: 'test-only-key', AUTH_EMAIL_FROM: sender }, async (prisma, config) => {
    await prisma.user.deleteMany({ where: { email: emails[0] } });
    await prisma.verification.deleteMany({ where: { identifier: { in: emails.map(email => `sign-in-otp-${email}`) } } });
    const keys = emails.map(email => {
      const digest = createHmac('sha256', config.authSecret).update(`recipient:${email}`).digest('hex');
      return `recipient:${digest}`;
    });
    await prisma.otpThrottle.deleteMany({ where: { key: { in: keys } } });
  });

  for (const [index, email] of emails.entries()) {
    const response = await request('/api/auth/email-otp/send-verification-otp', { email, type: 'sign-in' }, index + 1);
    const body = await response.json();
    assert.equal(response.status, index === 0 ? 200 : 503, JSON.stringify(body));
    if (index > 0) assert.equal(body.message, 'The sign-in email could not be sent.');
  }
  assert.equal(calls.length, emails.length);
  for (const [index, { path, message }] of calls.entries()) {
    assert.equal(path, '/emails');
    assert.equal(message.from, sender);
    assert.equal(message.to, emails[index]);
    assert.match(message.text, /Your RepairVantage code is \d{6}/);
  }
  const code = calls[0].message.text.match(/code is (\d{6})/)[1];
  const session = await request('/api/auth/sign-in/email-otp', { email: emails[0], otp: code }, 4);
  assert.equal(session.status, 200);
  assert.equal((await session.json()).user.email, emails[0]);
});

test('Google OAuth accepts authoritative mailboxes and rejects unproven third-party addresses', async t => {
  const clientId = 'synthetic-client-id';
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const kid = 'local-google-key';
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' };
  const claimsByCode = new Map();
  const cases = [
    { email: `repair-${randomUUID()}@gmail.com`, email_verified: true, verified: true },
    { email: `repair-${randomUUID()}@example.test`, email_verified: true, hd: 'example.test', verified: true },
    { email: `repair-${randomUUID()}@example.test`, email_verified: true, verified: false },
    { email: `repair-${randomUUID()}@gmail.com`, email_verified: false, verified: false },
  ];
  const nativeFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.hostname === '127.0.0.1') return nativeFetch(input, options);
    if (url.href === 'https://www.googleapis.com/oauth2/v3/certs') return Response.json({ keys: [jwk] });
    assert.equal(url.href, 'https://oauth2.googleapis.com/token');
    const request = input instanceof Request ? input : new Request(input, options);
    const params = new URLSearchParams(await request.text());
    const claims = claimsByCode.get(params.get('code'));
    assert.ok(claims, 'OAuth token exchange must use the issued test authorization code');
    const now = Math.floor(Date.now() / 1000);
    const payload = { ...claims, aud: clientId, iss: 'https://accounts.google.com', iat: now, exp: now + 300 };
    const encoded = [{ alg: 'RS256', kid }, payload]
      .map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
    const signature = sign('RSA-SHA256', Buffer.from(encoded), privateKey).toString('base64url');
    return Response.json({ access_token: 'synthetic-access', token_type: 'Bearer', id_token: `${encoded}.${signature}` });
  });
  const { prisma, request } = await providerHarness(t, {
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: 'test-only-secret',
  }, async prisma => {
    await prisma.user.deleteMany({ where: { email: { in: cases.map(item => item.email) } } });
  });

  for (const [index, { verified, ...profile }] of cases.entries()) {
    const number = index + 1;
    const kickoff = await request('/api/auth/sign-in/social', {
      provider: 'google', callbackURL: '/projects', errorCallbackURL: '/login',
    }, number);
    const result = await kickoff.json();
    assert.equal(kickoff.status, 200, JSON.stringify(result));
    const authorize = new URL(result.url);
    assert.equal(authorize.searchParams.get('redirect_uri'), 'http://localhost:5173/api/auth/callback/google');
    const code = `local-code-${number}`;
    const nonce = authorize.searchParams.get('nonce');
    claimsByCode.set(code, { ...profile, sub: randomUUID(), name: 'OAuth test', ...(nonce ? { nonce } : {}) });
    const callback = new URLSearchParams({ code, state: authorize.searchParams.get('state') });
    const cookie = kickoff.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    const completed = await request(`/api/auth/callback/google?${callback}`, null, number, cookie);
    assert.equal(completed.status, 302);
    const destination = new URL(completed.headers.get('location'), 'http://localhost:5173');
    const user = await prisma.user.findUnique({ where: { email: profile.email } });
    if (verified) {
      assert.equal(destination.pathname, '/projects');
      assert.equal(user.emailVerified, true);
      assert.ok(completed.headers.getSetCookie().some(value => value.startsWith('repairvantage.session_token=')));
    } else {
      assert.equal(destination.pathname, '/login');
      assert.equal(destination.searchParams.get('error'), 'google_email_not_authoritative');
      assert.equal(user, null);
    }
  }
});
