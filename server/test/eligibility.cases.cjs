// Loaded by auth.test.cjs so real OTP cases share the global delivery budget serially.
const assert = require('node:assert/strict');
const { createHmac, randomBytes, randomUUID } = require('node:crypto');
const { once } = require('node:events');
const test = require('node:test');
const { createApplication } = require('../dist/app.js');
const { readConfig } = require('../dist/config.js');
const { ELIGIBILITY_POLICY, createEligibility } = require('../dist/eligibility.js');
const { testDatabaseUrl } = require('./database-url.cjs');

const origin = 'http://localhost:5173';
const cookieFrom = response => response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
const acknowledgment = { policyVersion: ELIGIBILITY_POLICY.policyVersion, accepted: true };

async function harness(t) {
  const codes = [];
  const emails = [];
  const config = readConfig({ APP_ORIGIN: origin, DATABASE_URL: testDatabaseUrl().toString(), BETTER_AUTH_SECRET: randomBytes(32).toString('base64url'), TRUST_PROXY_HOPS: '1', GOOGLE_CLIENT_ID: 'local-client', GOOGLE_CLIENT_SECRET: 'local-secret' });
  const app = createApplication(config, async (email, code) => codes.push({ email, code }));
  const listener = app.app.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const base = `http://127.0.0.1:${listener.address().port}`;
  const ip = `192.${randomBytes(1)[0]}.${randomBytes(1)[0]}.1`;
  t.after(async () => {
    listener.closeAllConnections();
    await new Promise(resolve => listener.close(resolve));
    await app.prisma.project.deleteMany({ where: { user: { email: { in: emails } } } });
    await app.prisma.user.deleteMany({ where: { email: { in: emails } } });
    await app.apollo.stop();
    await app.prisma.$disconnect();
  });
  const post = (path, payload, cookie, extra = {}) => fetch(base + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Forwarded-For': ip, ...(cookie ? { Cookie: cookie } : {}), ...extra }, body: JSON.stringify(payload) });
  const status = async cookie => {
    const response = await fetch(base + '/api/eligibility/status', { headers: cookie ? { Cookie: cookie } : {} });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return response.json();
  };
  const email = () => { const value = `eligibility-${randomUUID()}@example.test`; emails.push(value); return value; };
  return { ...app, config, codes, post, status, email, base };
}

test('neutral age screening rejects invalid input, sticky under-age retries and forged proofs before identity data collection', async t => {
  const h = await harness(t);
  assert.deepEqual(await h.status(), { ...ELIGIBILITY_POLICY, screened: false, blocked: false, acknowledged: false });
  for (const age of [undefined, null, '18', true, -1, 18.1, 131]) {
    assert.equal((await h.post('/api/eligibility/screen', { age })).status, 400);
  }
  assert.equal((await h.post('/api/eligibility/screen', { age: 20, userId: 'forged' })).status, 400);
  assert.equal((await h.post('/api/eligibility/screen', { age: 20 }, undefined, { Origin: 'https://outside.example' })).status, 403);
  assert.equal((await h.post('/api/eligibility/screen', { age: 20 }, undefined, { 'Content-Type': 'text/plain' })).status, 415);
  const rejected = await h.post('/api/eligibility/screen', { age: 17 });
  assert.equal(rejected.status, 403);
  const blocked = cookieFrom(rejected);
  assert.match(rejected.headers.getSetCookie()[0], /Max-Age=86400/);
  assert.deepEqual(await h.status(blocked), { ...ELIGIBILITY_POLICY, screened: false, blocked: true, acknowledged: false });
  assert.equal((await h.post('/api/eligibility/screen', { age: 30 }, blocked)).status, 403);
  const email = h.email();
  for (const cookie of [undefined, blocked, 'repairvantage.eligibility=forged']) {
    for (const [path, body] of [
      ['/api/auth/email-otp/send-verification-otp', { email, type: 'sign-in' }],
      ['/api/auth/sign-in/email-otp', { email, otp: '123456' }],
      ['/api/auth/sign-in/social', { provider: 'google', idToken: { token: 'forged' } }],
    ]) assert.equal((await h.post(path, body, cookie)).status, 403);
  }
  assert.deepEqual(h.codes, []);
  assert.equal(await h.prisma.user.count({ where: { email } }), 0);
  assert.equal(await h.prisma.verification.count({ where: { identifier: `sign-in-otp-${email}` } }), 0);
});

test('verified enrollment and existing sessions require their own idempotent versioned acknowledgment', async t => {
  const h = await harness(t);
  const screened = await h.post('/api/eligibility/screen', { age: 18 });
  assert.equal(screened.status, 204);
  const preflight = cookieFrom(screened);
  assert.match(screened.headers.getSetCookie()[0], /HttpOnly/);
  assert.match(screened.headers.getSetCookie()[0], /SameSite=Lax/);
  assert.match(screened.headers.getSetCookie()[0], /Max-Age=600/);
  const proof = JSON.parse(Buffer.from(preflight.split('=')[1].split('.')[0], 'base64url').toString());
  assert.deepEqual(Object.keys(proof).sort(), ['eligible', 'expiresAt', 'issuedAt', 'policyVersion']);
  assert.equal((await h.status(preflight)).screened, true);
  assert.equal((await h.post('/api/eligibility/acknowledgment', acknowledgment, preflight)).status, 401);

  const email = h.email();
  assert.equal((await h.post('/api/auth/email-otp/send-verification-otp', { email, type: 'sign-in' }, preflight)).status, 200);
  const signedIn = await h.post('/api/auth/sign-in/email-otp', { email, otp: h.codes[0].code }, preflight);
  assert.equal(signedIn.status, 200);
  const session = cookieFrom(signedIn);
  const cookies = `${session}; ${preflight}`;
  const query = { query: '{ me { email } }' };
  assert.equal((await (await h.post('/graphql', query, session)).json()).errors[0].extensions.code, 'ELIGIBILITY_REQUIRED');
  assert.equal((await h.status(session)).acknowledged, false);
  for (const payload of [undefined, { ...acknowledgment, accepted: false }, { ...acknowledgment, policyVersion: 'stale' }, { ...acknowledgment, userId: 'other' }, {}]) {
    assert.equal((await h.post('/api/eligibility/acknowledgment', payload, cookies)).status, 400);
  }
  assert.equal((await h.post('/api/eligibility/acknowledgment', acknowledgment, cookies)).status, 204);
  const user = await h.prisma.user.findUniqueOrThrow({ where: { email } });
  const first = await h.prisma.eligibilityAcknowledgment.findUniqueOrThrow({ where: { userId_policyVersion: { userId: user.id, policyVersion: acknowledgment.policyVersion } } });
  assert.equal(first.statement, ELIGIBILITY_POLICY.statement);
  assert.equal(first.source, 'ACCOUNT_ACKNOWLEDGMENT');
  assert.ok(first.acceptedAt instanceof Date);
  assert.equal((await h.post('/api/eligibility/acknowledgment', acknowledgment, session)).status, 204);
  assert.deepEqual(await h.prisma.eligibilityAcknowledgment.findUnique({ where: { id: first.id } }), first);
  assert.equal((await h.status(session)).acknowledged, true);
  assert.equal((await (await h.post('/graphql', query, session)).json()).data.me.email, email);

  // A prior policy's record never substitutes for the current declaration on an existing session.
  await h.prisma.eligibilityAcknowledgment.update({ where: { id: first.id }, data: { policyVersion: 'older-policy' } });
  assert.equal((await h.status(session)).acknowledged, false);
  assert.equal((await h.post('/api/eligibility/acknowledgment', acknowledgment, session)).status, 204);
  assert.equal(await h.prisma.eligibilityAcknowledgment.count({ where: { userId: user.id } }), 2);
  const rejected = await h.post('/api/eligibility/screen', { age: 17 }, session);
  assert.equal(rejected.status, 403);
  const restricted = await h.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { eligibilityRestrictedAt: true } });
  assert.ok(restricted.eligibilityRestrictedAt instanceof Date);
  const blocked = `${session}; ${cookieFrom(rejected)}`;
  assert.equal((await h.status(blocked)).acknowledged, false);
  assert.equal((await h.post('/api/eligibility/acknowledgment', acknowledgment, blocked)).status, 403);
  assert.equal((await (await h.post('/graphql', query, blocked)).json()).errors[0].extensions.code, 'ELIGIBILITY_REQUIRED');
  // Dropping the rejected cookie or supplying a still-valid older adult cookie cannot erase a known account signal.
  for (const cookie of [session, cookies]) {
    const status = await h.status(cookie);
    assert.equal(status.blocked, true);
    assert.equal(status.screened, false);
    assert.equal(status.acknowledged, false);
    assert.equal((await h.post('/api/eligibility/acknowledgment', acknowledgment, cookie)).status, 403);
    assert.equal((await h.post('/api/eligibility/screen', { age: 30 }, cookie)).status, 403);
    assert.equal((await (await h.post('/graphql', query, cookie)).json()).errors[0].extensions.code, 'ELIGIBILITY_REQUIRED');
  }
  assert.deepEqual(await h.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { eligibilityRestrictedAt: true } }), restricted);
  assert.equal(await h.prisma.eligibilityAcknowledgment.count({ where: { userId: user.id } }), 2);
  assert.equal((await h.post('/api/auth/sign-out', {}, session)).status, 200);
  assert.equal((await h.post('/api/eligibility/acknowledgment', acknowledgment, session)).status, 401);
});

test('signed screening proof rejects expiry, altered payloads and policy drift without retaining age', async t => {
  const h = await harness(t);
  const now = Date.now();
  const sign = value => {
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    const encoded = Buffer.from(payload).toString('base64url');
    return `repairvantage.eligibility=${encoded}.${createHmac('sha256', h.config.authSecret).update(`eligibility:${encoded}`).digest('base64url')}`;
  };
  const valid = { policyVersion: acknowledgment.policyVersion, eligible: true, issuedAt: now, expiresAt: now + 600_000 };
  for (const value of [null, '{invalid', { ...valid, expiresAt: now - 1 }, { ...valid, issuedAt: now + 60_000 }, { ...valid, policyVersion: 'stale' }, { ...valid, eligible: 'true' }]) {
    assert.equal((await h.status(sign(value))).screened, false);
  }
  const tampered = sign(valid).replace('=', '=x');
  assert.equal((await h.status(tampered)).screened, false);
  const secure = createEligibility({ ...h.config, production: true });
  let options;
  secure.set({ cookie(_name, _value, settings) { options = settings; } }, true);
  assert.equal(options.secure, true);
  assert.equal(secure.validProof(null), false);
});
