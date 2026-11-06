const { execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { test } = require('node:test');
const { testDatabaseUrl } = require('./database-url.cjs');

test('Vercel entry preserves API routes and serves an uncached SPA for deep links', t => {
  const instrumentedStage = process.env.REPAIRVANTAGE_VERCEL_TEST_DIR;
  const stage = instrumentedStage || mkdtempSync(join(tmpdir(), 'repairvantage-wrapper-'));
  if (instrumentedStage) mkdirSync(stage);
  t.after(() => rmSync(stage, { recursive: true, force: true }));
  mkdirSync(join(stage, 'public'));
  copyFileSync(resolve(__dirname, '../../scripts/vercel/index.js'), join(stage, 'index.js'));
  symlinkSync(resolve(__dirname, '../dist'), join(stage, 'dist'), 'dir');
  symlinkSync(resolve(__dirname, '../node_modules'), join(stage, 'node_modules'), 'dir');
  writeFileSync(join(stage, 'public/index.html'), '<main>RepairVantage test shell</main>');

  // Load the entry in a separate process, as Vercel does, with only disposable credentials.
  execFileSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const { once } = require('node:events');
    const app = require('./index.js');
    const { application } = require('./dist/index.js');
    async function check() {
      const listener = app.listen(0, '127.0.0.1');
      await once(listener, 'listening');
      const base = 'http://127.0.0.1:' + listener.address().port;
      try {
        const ready = await fetch(base + '/ready');
        assert.equal(ready.status, 200);
        assert.deepEqual(await ready.json(), { status: 'ready' });
        const deepLink = await fetch(base + '/projects/fixture');
        assert.equal(deepLink.status, 200);
        assert.equal(deepLink.headers.get('cache-control'), 'no-store');
        assert.match(await deepLink.text(), /RepairVantage test shell/);
      } finally {
        listener.closeAllConnections();
        await new Promise(resolve => listener.close(resolve));
        await application.apollo.stop();
        await application.prisma.$disconnect();
      }
    }
    check().catch(error => { console.error(error); process.exitCode = 1; });
  `], {
    cwd: stage,
    env: {
      NODE_ENV: 'test',
      NODE_V8_COVERAGE: process.env.NODE_V8_COVERAGE,
      DATABASE_URL: testDatabaseUrl().toString(),
      BETTER_AUTH_SECRET: randomBytes(32).toString('base64url'),
    },
    timeout: 15_000,
    stdio: 'inherit',
  });
});
