const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { ApolloServer } = require('@apollo/server');
const { createPrismaClient } = require('../dist/db');
const { resolvers } = require('../dist/graphql/resolvers');
const { typeDefs } = require('../dist/graphql/schema');
const { testDatabaseUrl } = require('./database-url.cjs');

test('schedule returns only owned dated work, with allowed assignees and project tools', async t => {
  const prisma = createPrismaClient(testDatabaseUrl().toString());
  const apollo = new ApolloServer({ typeDefs, resolvers });
  const users = [];
  t.after(async () => {
    try {
      await prisma.project.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    } finally {
      await Promise.all([apollo.stop(), prisma.$disconnect()]);
    }
  });
  async function account(name) {
    const user = await prisma.user.create({ data: { name, email: `${randomUUID()}@example.test`, emailVerified: true } });
    users.push(user.id);
    return user;
  }
  const [owner, member, outsider] = await Promise.all([account('Owner'), account('Member'), account('Outsider')]);
  const date = day => new Date(`2026-10-${day}T00:00:00.000Z`);
  const project = await prisma.project.create({ data: {
    userId: owner.id, name: 'Porch', startDate: date('01'), endDate: date('08'),
    members: { create: { userId: member.id } },
  } });
  await prisma.project.create({ data: { userId: outsider.id, name: 'Foreign', startDate: date('03') } });
  await prisma.project.create({ data: { userId: owner.id, name: 'Archived', startDate: date('03'), archivedAt: date('04') } });
  const tool = await prisma.tool.create({ data: { userId: owner.id, name: 'Drill' } });
  await prisma.toolProject.create({ data: { toolId: tool.id, projectId: project.id, quantity: 2 } });
  const task = await prisma.task.create({ data: { name: 'Paint', projectId: project.id, dueDate: date('03'), userId: member.id } });
  await prisma.task.createMany({ data: [
    { name: 'Undated', projectId: project.id },
    { name: 'Exclusive end', projectId: project.id, dueDate: date('05') },
  ] });
  const query = `query ($from: DateTime!, $to: DateTime!) {
    schedule(from: $from, to: $to) { id kind startAt endAt assigneeName tools { name quantity } }
  }`;
  async function read(user, from = date('02'), to = date('05')) {
    const { body } = await apollo.executeOperation({ query, variables: { from: from.toISOString(), to: to.toISOString() } }, {
      contextValue: { prisma, user },
    });
    assert.equal(body.kind, 'single');
    return body.singleResult;
  }
  const result = await read(owner);
  assert.equal(result.errors, undefined, JSON.stringify(result.errors));
  const [scheduledProject, scheduledTask] = result.data.schedule;
  assert.equal(result.data.schedule.length, 2);
  assert.equal(scheduledProject.id, project.id);
  assert.equal(scheduledProject.kind, 'PROJECT');
  assert.equal(scheduledTask.id, task.id);
  assert.equal(scheduledTask.startAt, scheduledTask.endAt);
  assert.equal(scheduledTask.assigneeName, 'Member');
  assert.equal(scheduledTask.tools[0].name, 'Drill');
  assert.equal(scheduledTask.tools[0].quantity, 2);
  assert.deepEqual((await read(member)).data.schedule, []);
  assert.equal((await read(null)).errors[0].extensions.code, 'UNAUTHENTICATED');
  assert.equal((await read(owner, date('05'), date('02'))).errors[0].extensions.code, 'BAD_USER_INPUT');
});
