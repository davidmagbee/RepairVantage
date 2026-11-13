const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { ApolloServer } = require('@apollo/server');
const { createPrismaClient } = require('../dist/db');
const { resolvers } = require('../dist/graphql/resolvers');
const { typeDefs } = require('../dist/graphql/schema');
const { testDatabaseUrl } = require('./database-url.cjs');

const report = `query ($id: ID!) {
  projectReport(projectId: $id) { estimatedHours actualHours totalExpenseCents expenses { description amountCents } }
}`;
const expense = `mutation ($id: ID!, $description: String!, $cents: Int!) {
  addProjectExpense(projectId: $id, description: $description, amountCents: $cents) { description amountCents }
}`;
const editHours = `mutation ($id: ID!, $input: TaskUpdateInput!) {
  updateTask(id: $id, input: $input) { estimatedHours actualHours }
}`;

test('PostgreSQL reports reconcile owner-only USD expenses and assigned task hours', async t => {
  const prisma = createPrismaClient(testDatabaseUrl().toString());
  const apollo = new ApolloServer({ typeDefs, resolvers });
  const userIds = [];
  t.after(async () => {
    try {
      await prisma.project.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    } finally {
      await Promise.all([apollo.stop(), prisma.$disconnect()]);
    }
  });
  async function account(name) {
    const user = await prisma.user.create({ data: { name, emailVerified: true, email: `${randomUUID()}@example.test` } });
    userIds.push(user.id);
    return user;
  }
  async function execute(query, variables, user) {
    const { body } = await apollo.executeOperation({ query, variables }, { contextValue: { prisma, user } });
    assert.equal(body.kind, 'single');
    return body.singleResult;
  }
  async function data(query, variables, user) {
    const result = await execute(query, variables, user);
    assert.equal(result.errors, undefined, JSON.stringify(result.errors));
    return result.data;
  }
  async function rejects(query, variables, user, code) {
    const result = await execute(query, variables, user);
    assert.equal(result.errors?.[0].extensions.code, code, JSON.stringify(result));
  }
  const [owner, member, outsider] = await Promise.all([account('Owner'), account('Assignee'), account('Outsider')]);
  const { id } = await prisma.project.create({
    data: { userId: owner.id, name: 'Repair', members: { create: { userId: member.id } } },
  });
  const other = await prisma.project.create({ data: { userId: outsider.id, name: 'Other repair' } });
  const assigned = await prisma.task.create({ data: { projectId: id, userId: member.id, name: 'Assigned task' } });
  const first = (await data(report, { id }, owner)).projectReport;
  assert.deepEqual({ ...first }, { estimatedHours: 0, actualHours: 0, totalExpenseCents: 0, expenses: [] });

  for (const user of [member, outsider]) {
    await rejects(report, { id }, user, 'NOT_FOUND');
    await rejects(expense, { id, description: 'Denied expense', cents: 200 }, user, 'NOT_FOUND');
  }
  await rejects(report, { id }, null, 'UNAUTHENTICATED');
  await rejects(expense, { id, description: 'Signed-out expense', cents: 100 }, null, 'UNAUTHENTICATED');
  await rejects(editHours, { id: assigned.id, input: { actualHours: -1 } }, member, 'BAD_USER_INPUT');
  const hours = await data(editHours, { id: assigned.id, input: { estimatedHours: 2.5, actualHours: 3.25 } }, member);
  assert.deepEqual({ ...hours.updateTask }, { estimatedHours: 2.5, actualHours: 3.25 });
  const create = `mutation ($id: ID!) {
    createTask(input: { projectId: $id, name: "Second task", estimatedHours: 1.25, actualHours: 2 }) { id }
  }`;
  const { createTask: extra } = await data(create, { id }, owner);
  await data(editHours, { id: extra.id, input: { actualHours: null } }, owner);
  await rejects(expense, { id, description: ' ', cents: 10 }, owner, 'BAD_USER_INPUT');
  await rejects(expense, { id, description: 'Zero', cents: 0 }, owner, 'BAD_USER_INPUT');
  // GraphQL must reject malformed monetary inputs before a write can reach persistence.
  await rejects(expense, { id, description: 'x'.repeat(121), cents: 100 }, owner, 'BAD_USER_INPUT');
  await rejects(expense, { id, description: 'Fractional cents', cents: 1.5 }, owner, 'BAD_USER_INPUT');
  await rejects(expense, { id, description: 'Outside GraphQL Int', cents: 2147483648 }, owner, 'BAD_USER_INPUT');
  assert.equal(await prisma.projectExpense.count({ where: { projectId: id } }), 0);
  for (const [description, cents] of [['  Part  ', 2147483647], ['Tax', 25]]) {
    const { addProjectExpense } = await data(expense, { id, description, cents }, owner);
    assert.equal(addProjectExpense.description, description.trim());
    assert.equal(addProjectExpense.amountCents, cents);
  }
  await data(expense, { id: other.id, description: 'Other project cost', cents: 99 }, outsider);
  await data('mutation ($id: ID!) { archiveProject(id: $id) { id } }', { id }, owner);
  await rejects(expense, { id, description: 'Archived cost', cents: 1 }, owner, 'PROJECT_ARCHIVED');
  await rejects(editHours, { id: assigned.id, input: { actualHours: 5 } }, member, 'PROJECT_ARCHIVED');
  const archived = (await data(report, { id }, owner)).projectReport;
  assert.equal(archived.estimatedHours, 3.75);
  assert.equal(archived.actualHours, 3.25);
  assert.equal(archived.totalExpenseCents, 2147483672);
  assert.deepEqual(new Set(archived.expenses.map(item => item.description)), new Set(['Part', 'Tax']));
});
