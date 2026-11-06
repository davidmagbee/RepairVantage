const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { registerHooks } = require('node:module');
const { createServer } = require('node:net');
const { tmpdir } = require('node:os');
const { resolve } = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { test } = require('node:test');
const { pathToFileURL } = require('node:url');
const { ApolloServer } = require('@apollo/server');
const { createApplication } = require('../dist/app.js');
const { readConfig } = require('../dist/config.js');
const { testDatabaseUrl } = require('./database-url.cjs');

const origin = 'http://localhost:5173';
const configInput = {
  DATABASE_URL: 'postgresql://localhost:5432/config_test',
  BETTER_AUTH_SECRET: randomBytes(32).toString('base64url'),
};

function absentDatabaseUrl() {
  const url = testDatabaseUrl();
  // Use the disposable host with a name that cannot collide with any suite's database.
  url.pathname = `/missing_${randomUUID().replaceAll('-', '')}_test`;
  return url.toString();
}

test('configuration keeps defaults and trims explicitly configured providers', () => {
  const defaults = readConfig(configInput);
  assert.equal(defaults.origin, origin);
  assert.equal(defaults.port, 4000);
  assert.equal(defaults.proxyHops, 0);
  assert.equal(defaults.google, undefined);
  assert.equal(defaults.email, undefined);
  const explicitPublic = `${configInput.DATABASE_URL}?schema=public`;
  assert.equal(readConfig({ ...configInput, DATABASE_URL: explicitPublic }).databaseUrl, explicitPublic);

  const production = readConfig({
    ...configInput,
    NODE_ENV: 'production',
    APP_ORIGIN: 'https://repairvantage.example',
    PORT: '8080',
    TRUST_PROXY_HOPS: '1',
    AUTH_OTP_DAILY_LIMIT: '10',
    GOOGLE_CLIENT_ID: ' client-id ',
    GOOGLE_CLIENT_SECRET: ' client-secret ',
    RESEND_API_KEY: ' sending-key ',
    AUTH_EMAIL_FROM: ' sender@example.test ',
  });
  assert.equal(production.production, true);
  assert.equal(production.origin, 'https://repairvantage.example');
  assert.equal(production.port, 8080);
  assert.equal(production.proxyHops, 1);
  assert.equal(production.otpDailyLimit, 10);
  assert.deepEqual(production.google, { clientId: 'client-id', clientSecret: 'client-secret' });
  assert.deepEqual(production.email, { apiKey: 'sending-key', from: 'sender@example.test' });
  assert.equal(readConfig({ ...configInput, GOOGLE_CLIENT_ID: 'incomplete' }).google, undefined);
});

test('configuration rejects invalid database, origin, limits, and auth settings', () => {
  const invalidCases = [
    ['DATABASE_URL', undefined],
    ['DATABASE_URL', 'https://database.example'],
    ['DATABASE_URL', 'postgresql://[bad'],
    ['DATABASE_URL', `${configInput.DATABASE_URL}?schema=public&schema=legacy`],
    ['APP_ORIGIN', 'malformed'],
    ['APP_ORIGIN', 'https://repairvantage.example/'],
    ['APP_ORIGIN', 'ftp://repairvantage.example'],
    ['PORT', 'no-port'],
    ['PORT', '0'],
    ['PORT', '65536'],
    ['TRUST_PROXY_HOPS', '1.5'],
    ['TRUST_PROXY_HOPS', '-1'],
    ['AUTH_OTP_DAILY_LIMIT', '1.5'],
    ['AUTH_OTP_DAILY_LIMIT', '0'],
    ['AUTH_OTP_DAILY_LIMIT', '1000001'],
    ['BETTER_AUTH_SECRET', undefined],
    ['BETTER_AUTH_SECRET', 'too-short'],
  ];
  for (const [key, value] of invalidCases) {
    assert.throws(() => readConfig({ ...configInput, [key]: value }), new RegExp(key));
  }
  for (const value of [undefined, 'http://repairvantage.example']) {
    assert.throws(() => readConfig({ ...configInput, NODE_ENV: 'production', APP_ORIGIN: value }), /APP_ORIGIN/);
  }
});

test('HTTP rejects unsupported methods, untrusted origins, and invalid JSON', async t => {
  const application = createApplication(readConfig({ ...configInput, DATABASE_URL: absentDatabaseUrl() }));
  application.app.set('env', 'test');
  const listener = application.app.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  t.after(async () => {
    listener.closeAllConnections();
    await new Promise(resolveClose => listener.close(resolveClose));
    await application.apollo.stop();
    await application.prisma.$disconnect();
  });
  const base = `http://127.0.0.1:${listener.address().port}`;
  const request = (path, options) => fetch(base + path, options);

  const get = await request('/graphql');
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  assert.equal(get.headers.get('cache-control'), 'no-store');
  const badOrigin = { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' };
  assert.equal((await request('/graphql', { method: 'POST', headers: badOrigin, body: '{}' })).status, 403);
  assert.equal((await request('/api/auth/sign-out', { method: 'POST', headers: badOrigin, body: '{}' })).status, 403);
  assert.equal((await request('/api/auth/unknown')).status, 404);

  const form = await request('/graphql', { method: 'POST', headers: { Origin: origin }, body: 'plain-text' });
  assert.equal(form.status, 415);
  const headers = { Origin: origin, 'Content-Type': 'application/json' };
  for (const [body, code] of [['{', 400], [JSON.stringify('x'.repeat(25_000)), 413]]) {
    const invalid = await request('/graphql', { method: 'POST', headers, body });
    assert.equal(invalid.status, code);
    assert.deepEqual(await invalid.json(), { error: 'Invalid request body' });
  }
  const unsupportedCharset = await request('/graphql', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json; charset=iso-8859-1' }, body: '{}',
  });
  assert.equal(unsupportedCharset.status, 415);

  const readiness = await request('/ready');
  assert.equal(readiness.status, 503);
  assert.deepEqual(await readiness.json(), { status: 'unavailable' });
  assert.deepEqual(await (await request('/health')).json(), { status: 'ok' });
  const query = await request('/graphql', {
    method: 'POST', headers, body: JSON.stringify({ query: '{ showcaseProject(slug: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa") { title } }' }),
  });
  assert.deepEqual((await query.json()).errors, [{
    message: 'Internal server error',
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  }]);
});

async function reservePort() {
  const listener = createServer();
  // Match the standalone listener's address family for a portable port conflict.
  listener.listen(0);
  await once(listener, 'listening');
  return listener;
}

function runServer(t, databaseUrl, port) {
  // Preserve coverage instrumentation and supply only a test database and test identity configuration.
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    APP_ORIGIN: origin,
    BETTER_AUTH_SECRET: configInput.BETTER_AUTH_SECRET,
    PORT: String(port),
    NODE_ENV: 'test',
  };
  for (const key of ['DIRECT_DATABASE_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'RESEND_API_KEY', 'AUTH_EMAIL_FROM']) {
    delete env[key];
  }
  const child = spawn(process.execPath, [resolve(__dirname, '../dist/start.js')], {
    cwd: tmpdir(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.setEncoding('utf8').on('data', chunk => { output += chunk; });
  child.stderr.setEncoding('utf8').on('data', chunk => { output += chunk; });
  const closed = once(child, 'close');
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await closed;
  });
  return { child, closed, output: () => output };
}

test('standalone server waits for PostgreSQL readiness and shuts down cleanly', { timeout: 15_000 }, async t => {
  const reservation = await reservePort();
  const port = reservation.address().port;
  await new Promise(resolveClose => reservation.close(resolveClose));
  const server = runServer(t, testDatabaseUrl().toString(), port);
  const url = `http://127.0.0.1:${port}/ready`;

  let ready;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    assert.equal(server.child.exitCode, null, server.output());
    ready = await fetch(url, { signal: AbortSignal.timeout(500) }).catch(() => null);
    if (ready?.ok) break;
    await delay(100);
  }
  assert.equal(ready?.status, 200, server.output());
  assert.deepEqual(await ready.json(), { status: 'ready' });
  assert.ok(server.child.kill('SIGTERM'));
  assert.deepEqual(await server.closed, [0, null], server.output());
  assert.match(server.output(), /GraphQL ready on port/);
});

test('standalone server fails before listening when the database is unavailable', { timeout: 15_000 }, async t => {
  const server = runServer(t, absentDatabaseUrl(), 4000);
  assert.deepEqual(await server.closed, [1, null], server.output());
  assert.match(server.output(), /Server is not ready/);
  assert.doesNotMatch(server.output(), /GraphQL ready on port/);
});

test('standalone server reports a port conflict and exits', { timeout: 15_000 }, async t => {
  const reservation = await reservePort();
  t.after(() => new Promise(resolveClose => reservation.close(resolveClose)));
  const server = runServer(t, testDatabaseUrl().toString(), reservation.address().port);
  assert.deepEqual(await server.closed, [1, null], server.output());
  assert.match(server.output(), /HTTP listener failed to start/);
});

function substituteIdentity(t, source) {
  const app = pathToFileURL(resolve(__dirname, '../dist/app.js')).href;
  const replacement = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  // Fail at the dependency boundary without replacing the real HTTP handlers.
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === './identity.mjs' && context.parentURL === app) return { url: replacement, shortCircuit: true };
      return nextResolve(specifier, context);
    },
  });
  t.after(() => hooks.deregister());
}

async function startFaultTestApp(t, stopApollo = true) {
  const application = createApplication(readConfig({ ...configInput, DATABASE_URL: testDatabaseUrl().toString() }));
  const listener = application.app.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  t.after(async () => {
    listener.closeAllConnections();
    await new Promise(resolveClose => listener.close(resolveClose));
    if (stopApollo) await application.apollo.stop();
    await application.prisma.$disconnect();
  });
  return `http://127.0.0.1:${listener.address().port}`;
}

test('identity startup faults make provider discovery and session reads unavailable', async t => {
  substituteIdentity(t, 'export function createIdentity() { throw new Error("Synthetic identity startup failure"); }');
  const log = t.mock.method(console, 'error', () => {});
  const base = await startFaultTestApp(t);
  for (const path of ['/api/auth/providers', '/api/auth/get-session']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Sign-in unavailable' });
  }
  assert.ok(log.mock.calls.some(call => call.arguments[0] === 'Identity initialization failed'));
});

test('a provider error after headers terminates the response without writing a second status', async t => {
  substituteIdentity(t, `
    export function createIdentity() {
      return {
        providers: { google: false, emailOtp: false },
        async handle(_request, response) {
          response.status(202).write('partial response');
          throw new Error('Synthetic stream failure');
        },
      };
    }
  `);
  const base = await startFaultTestApp(t);
  const response = await fetch(base + '/api/auth/get-session');
  assert.equal(response.status, 202);
  assert.equal(await response.text(), 'partial response');
});

test('Apollo startup faults return a safe GraphQL transport error', async t => {
  t.mock.method(ApolloServer.prototype, 'start', async () => { throw new Error('Synthetic GraphQL initialization failure'); });
  const log = t.mock.method(console, 'error', () => {});
  const base = await startFaultTestApp(t, false);
  const response = await fetch(base + '/graphql', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ me { id } }' }),
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'GraphQL unavailable' });
  assert.ok(log.mock.calls.some(call => call.arguments[0] === 'GraphQL initialization failed'));
});
