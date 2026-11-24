const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { createPrismaClient } = require('../dist/db');
const { testDatabaseUrl } = require('./database-url.cjs');
const { seedDemo, fixtureId, main } = require('../scripts/seed-demo.cjs');

test('demo seeding requires explicit connection and an existing verified account', async t => {
  await assert.rejects(main(['--email', 'demo@example.test'], {}), /Set DEMO_DATABASE_URL/);
  const prisma = createPrismaClient(testDatabaseUrl().toString());
  const email = `${randomUUID()}@example.test`;
  let user;
  t.after(async () => {
    try { if (user) await prisma.user.delete({ where: { id: user.id } }); }
    finally { await prisma.$disconnect(); }
  });
  await assert.rejects(seedDemo(prisma, email, { apply: true }), /already exist/);
  user = await prisma.user.create({ data: { name: 'Unverified', email } });
  await assert.rejects(seedDemo(prisma, email, { apply: true }), /verified email/);
  assert.equal(await prisma.project.count({ where: { userId: user.id } }), 0);
});

test('demo dry run writes nothing; apply is private, repeatable, and preserves edits', async t => {
  const prisma = createPrismaClient(testDatabaseUrl().toString());
  const users = [];
  t.after(async () => {
    try {
      await prisma.project.deleteMany({ where: { userId: { in: users.map(user => user.id) } } });
      await prisma.user.deleteMany({ where: { id: { in: users.map(user => user.id) } } });
    } finally { await prisma.$disconnect(); }
  });
  for (const name of ['Owner', 'Other']) users.push(await prisma.user.create({ data: { name, email: `${randomUUID()}@example.test`, emailVerified: true } }));
  const [owner, other] = users;
  const before = await prisma.user.findUnique({ where: { id: owner.id } });
  // Exercise the CLI entrypoint's connection selection and cleanup with valid arguments.
  const cliEnv = { DEMO_DATABASE_URL: testDatabaseUrl().toString() };
  const preview = await main(['--email', ` ${owner.email.toUpperCase()} `], cliEnv);
  assert.equal(preview.wouldCreate, 5);
  assert.equal(preview.created, 0);
  assert.equal(await prisma.project.count({ where: { userId: owner.id } }), 0);
  const applied = await main(['--email', owner.email, '--apply'], cliEnv);
  assert.equal(applied.created, 5);
  const projects = await prisma.project.findMany({ where: { userId: owner.id }, orderBy: { name: 'asc' } });
  assert.deepEqual(projects.map(({ name, budget }) => [name, budget]), [
    ['Basement Finishing', 22000], ['Bathroom Remodel', 8500], ['Deck Repair', 4200], ['Kitchen Renovation', 15000], ['Roof Replacement', 12800],
  ]);
  assert.equal(projects.find(project => project.name === 'Roof Replacement').status, 'COMPLETED');
  assert.equal(projects.find(project => project.name === 'Kitchen Renovation').endDate.toISOString(), '2023-08-30T00:00:00.000Z');
  const id = fixtureId(owner.id, '1');
  await prisma.project.update({ where: { id }, data: { name: 'Owner edit', budget: 1 } });
  const rerun = await main(['--email', owner.email, '--apply'], cliEnv);
  assert.equal(rerun.created, 0);
  assert.equal(rerun.skipped, 5);
  assert.equal((await prisma.project.findUnique({ where: { id } })).name, 'Owner edit');
  assert.equal(await prisma.project.count({ where: { userId: other.id } }), 0);
  assert.equal(await prisma.projectShowcase.count({ where: { projectId: { in: projects.map(project => project.id) } } }), 0);
  assert.deepEqual(await prisma.user.findUnique({ where: { id: owner.id } }), before);
  // A later ownership conflict must roll back earlier inserts in the same transaction.
  await prisma.project.delete({ where: { id } });
  await prisma.project.update({ where: { id: fixtureId(owner.id, '2') }, data: { userId: other.id } });
  await assert.rejects(seedDemo(prisma, owner.email, { apply: true }), /another account/);
  assert.equal(await prisma.project.count({ where: { id } }), 0);
});
