const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { ApolloServer } = require('@apollo/server');
const { createPrismaClient } = require('../dist/db');
const { resolvers } = require('../dist/graphql/resolvers');
const { typeDefs } = require('../dist/graphql/schema');
const { testDatabaseUrl } = require('./database-url.cjs');

const assign = 'mutation ($id: ID!, $userId: ID) { setTaskAssignee(id: $id, userId: $userId) { assignee { id name } } }';
const edit = 'mutation ($id: ID!) { updateTask(id: $id, input: { status: COMPLETED }) { id status completedDate } }';
const task = `query ($id: ID!) { task(id: $id) {
  id assignee { id name } project { id notes budget tasks { id } }
} }`;
const remove = 'mutation ($projectId: ID!, $userId: ID!) { removeProjectMember(projectId: $projectId, userId: $userId) }';

test('PostgreSQL task assignment limits member access and clears it on removal', async t => {
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

  async function account(name, emailVerified = true) {
    const user = await prisma.user.create({ data: { name, emailVerified, email: `${randomUUID()}@example.test` } });
    users.push(user.id);
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

  const [owner, assignee, member, outsider, unverified] = await Promise.all([
    account('Owner'), account('Assignee'), account('Member'), account('Outsider'), account('Unverified', false),
  ]);
  const project = await prisma.project.create({
    data: {
      userId: owner.id, name: 'Repair', notes: 'Owner-only notes', budget: 80,
      members: { create: [assignee, member, unverified].map(({ id: userId }) => ({ userId })) },
    },
  });
  const { createTask: assigned } = await data(`mutation ($projectId: ID!) {
    createTask(input: { projectId: $projectId, name: "Replace hinge" }) { id }
  }`, { projectId: project.id }, owner);
  const legacy = await prisma.task.create({ data: { projectId: project.id, name: 'Legacy task', userId: owner.id } });

  assert.equal((await data(task, { id: assigned.id }, owner)).task.assignee, null);
  assert.equal((await data(task, { id: legacy.id }, owner)).task.assignee, null);
  for (const { id: userId } of [owner, outsider, unverified]) {
    await rejects(assign, { id: assigned.id, userId }, owner, 'BAD_USER_INPUT');
  }
  const assignedResult = (await data(assign, { id: assigned.id, userId: assignee.id }, owner)).setTaskAssignee;
  assert.deepEqual({ ...assignedResult.assignee }, { id: assignee.id, name: assignee.name });

  const memberTask = (await data(task, { id: assigned.id }, assignee)).task;
  assert.equal(memberTask.project.notes, null);
  assert.equal(memberTask.project.budget, null);
  assert.deepEqual(memberTask.project.tasks.map(({ id }) => id), [assigned.id]);
  assert.deepEqual((await data('{ tasks { id } }', {}, assignee)).tasks.map(({ id }) => id), [assigned.id]);
  assert.equal((await data(task, { id: legacy.id }, assignee)).task, null);
  assert.equal((await data(task, { id: assigned.id }, member)).task, null);
  await rejects(edit, { id: legacy.id }, assignee, 'NOT_FOUND');
  await rejects(edit, { id: assigned.id }, member, 'NOT_FOUND');
  await rejects(edit, { id: assigned.id }, outsider, 'NOT_FOUND');
  await rejects(assign, { id: assigned.id, userId: null }, assignee, 'NOT_FOUND');
  await rejects('mutation ($id: ID!) { deleteTask(id: $id) }', { id: assigned.id }, assignee, 'NOT_FOUND');
  await rejects('mutation ($id: ID!) { createTask(input: { projectId: $id, name: "New task" }) { id } }', { id: project.id }, assignee, 'NOT_FOUND');
  assert.equal((await data(edit, { id: assigned.id }, assignee)).updateTask.status, 'COMPLETED');

  await data(assign, { id: assigned.id, userId: member.id }, owner);
  assert.equal((await data(task, { id: assigned.id }, assignee)).task, null);
  assert.equal((await data(task, { id: assigned.id }, member)).task.assignee.id, member.id);
  await rejects(edit, { id: assigned.id }, assignee, 'NOT_FOUND');
  await data(assign, { id: assigned.id, userId: assignee.id }, owner);

  const archive = 'mutation ($id: ID!) { archiveProject(id: $id) { id } }';
  await data(archive, { id: project.id }, owner);
  assert.equal((await data(task, { id: assigned.id }, assignee)).task.id, assigned.id);
  await rejects(edit, { id: assigned.id }, assignee, 'PROJECT_ARCHIVED');
  await rejects(assign, { id: assigned.id, userId: null }, owner, 'PROJECT_ARCHIVED');
  assert.equal((await data(remove, { projectId: project.id, userId: assignee.id }, owner)).removeProjectMember, true);
  assert.equal((await data(task, { id: assigned.id }, owner)).task.assignee, null);
  assert.equal((await data(task, { id: assigned.id }, assignee)).task, null);
  await rejects(edit, { id: assigned.id }, assignee, 'NOT_FOUND');

  await data('mutation ($id: ID!) { restoreProject(id: $id) { id } }', { id: project.id }, owner);
  // Rejoining does not revive the former assignment.
  await prisma.projectMember.create({ data: { projectId: project.id, userId: assignee.id } });
  assert.equal((await data(task, { id: assigned.id }, assignee)).task, null);
  await data(assign, { id: assigned.id, userId: assignee.id }, owner);
  assert.equal((await data(assign, { id: assigned.id, userId: null }, owner)).setTaskAssignee.assignee, null);
  assert.equal((await data(task, { id: assigned.id }, assignee)).task, null);
});
