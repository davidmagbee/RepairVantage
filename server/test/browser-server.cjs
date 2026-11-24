// Test-only mail sink. It runs on loopback and never calls a delivery provider.
const { randomBytes } = require('node:crypto');
const express = require('express');
const { createApplication } = require('../dist/app.js');
const { readConfig } = require('../dist/config.js');
const { testDatabaseUrl } = require('./database-url.cjs');

const codes = new Map();
// A distinct private subnet per harness run isolates durable IP limits without disabling them.
const forwardedIp = `fd00:${randomBytes(6).toString('hex').match(/.{4}/g).join(':')}::1`;
const application = createApplication(readConfig({
  APP_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: testDatabaseUrl().toString(),
  BETTER_AUTH_SECRET: randomBytes(32).toString('base64url'),
  TRUST_PROXY_HOPS: '1',
}), async (email, code) => {
  if (!email.endsWith('@example.test')) throw new Error('Use a synthetic @example.test address');
  codes.set(email, code);
});

const app = express();
app.get('/__test/otp', (req, res) => {
  const code = codes.get(req.query.email);
  res.set('Cache-Control', 'no-store');
  if (code) res.json({ code });
  else res.sendStatus(404);
});
app.use((req, _res, next) => {
  req.headers['x-forwarded-for'] = forwardedIp;
  next();
}, application.app);

application.checkReadiness().then(() => {
  const server = app.listen(4000, '127.0.0.1', () => console.log('Browser test server ready on loopback'));
  process.once('SIGTERM', () => server.close(() => {
    void application.apollo.stop().finally(() => application.prisma.$disconnect());
  }));
}).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
  void application.prisma.$disconnect();
});
