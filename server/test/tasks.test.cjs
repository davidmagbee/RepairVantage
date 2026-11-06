const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { ApolloServer } = require('@apollo/server');
const { createPrismaClient } = require('../dist/db');
const { resolvers } = require('../dist/graphql/resolvers');
const { typeDefs } = require('../dist/graphql/schema');
const { testDatabaseUrl } = require('./database-url.cjs');

const taskFields = 'id name description dueDate status completedDate project { id }';
const createTask = `mutation ($input: TaskInput!) { createTask(input: $input) { id } }`;
const updateTask = `mutation ($id: ID!, $input: TaskUpdateInput!) {
  updateTask(id: $id, input: $input) { ${taskFields} }
}`;
const readTask = `query ($id: ID!) { task(id: $id) { ${taskFields} } }`;
const deleteTask = 'mutation ($id: ID!) { deleteTask(id: $id) }';

test('PostgreSQL task editing uses the project owner boundary', async t => {
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
    const user = await prisma.user.create({
      data: { email: `${randomUUID()}@example.test`, name, emailVerified: true },
    });
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

  const owner = await account('Task owner');
  const { createProject: project } = await data('mutation { createProject(input: { name: "Repair" }) { id } }', {}, owner);
  const { createTask: task } = await data(createTask, {
    input: { projectId: project.id, name: 'Inspect the hinge', description: 'First pass', dueDate: '2030-02-03T12:30:00Z' },
  }, owner);

  await t.test('the owner edits task fields and can clear optional values', async () => {
    const { updateTask: edited } = await data(updateTask, {
      id: task.id,
      input: { name: '  Replace the hinge  ', description: null, dueDate: null },
    }, owner);

    assert.equal(edited.name, 'Replace the hinge');
    assert.equal(edited.description, null);
    assert.equal(edited.dueDate, null);
    assert.equal(edited.status, 'TODO');
    assert.equal(edited.completedDate, null);
    assert.equal(edited.project.id, project.id);
    assert.deepEqual((await data(readTask, { id: task.id }, owner)).task, edited);

    const { updateTask: rescheduled } = await data(updateTask, {
      id: task.id,
      input: { dueDate: '2030-02-04T12:30:00+02:00' },
    }, owner);
    assert.equal(rescheduled.dueDate, '2030-02-04T10:30:00.000Z');
    assert.equal(rescheduled.name, edited.name);
  });

  await t.test('status changes record completion once, clear it on reopening, and preserve legacy unknown dates', async () => {
    const setStatus = async status => (await data(updateTask, { id: task.id, input: { status } }, owner)).updateTask;
    for (const status of ['IN_PROGRESS', 'BLOCKED', 'REVIEW']) {
      const updated = await setStatus(status);
      assert.equal(updated.status, status);
      assert.equal(updated.completedDate, null);
    }

    const beforeCompletion = Date.now();
    const [first, repeated] = await Promise.all([setStatus('COMPLETED'), setStatus('COMPLETED')]);
    const recordedTime = Date.parse(first.completedDate);
    assert.ok(recordedTime >= beforeCompletion && recordedTime <= Date.now());
    assert.equal(repeated.completedDate, first.completedDate);
    const { updateTask: edited } = await data(updateTask, { id: task.id, input: { description: 'Repair verified' } }, owner);
    assert.equal(edited.completedDate, first.completedDate);

    const reopened = await setStatus('TODO');
    assert.equal(reopened.status, 'TODO');
    assert.equal(reopened.completedDate, null);

    const { createTask: completed } = await data(createTask, {
      input: { projectId: project.id, name: 'Already repaired', status: 'COMPLETED' },
    }, owner);
    assert.ok(Number.isFinite(Date.parse((await data(readTask, { id: completed.id }, owner)).task.completedDate)));

    // Model a task written before completion timestamps were recorded by the API.
    const legacy = await prisma.task.create({ data: { projectId: project.id, name: 'Legacy repair', status: 'COMPLETED' } });
    const { updateTask: legacyUnchanged } = await data(updateTask, { id: legacy.id, input: { status: 'COMPLETED' } }, owner);
    assert.equal(legacyUnchanged.completedDate, null);

    const filtered = await data('query ($projectId: ID) { tasks(projectId: $projectId, status: COMPLETED) { id } }', { projectId: project.id }, owner);
    assert.deepEqual(new Set(filtered.tasks.map(({ id }) => id)), new Set([completed.id, legacy.id]));
    const all = await data('{ tasks(projectId: null, status: null) { id } }', {}, owner);
    assert.deepEqual(new Set(all.tasks.map(({ id }) => id)), new Set([task.id, completed.id, legacy.id]));
  });

  await t.test('invalid metadata and null status do not write task state', async () => {
    const before = (await data(readTask, { id: task.id }, owner)).task;
    for (const input of [{ name: null }, { name: '  ' }, { status: null }, { description: 'x'.repeat(2001) }]) {
      await rejects(updateTask, { id: task.id, input }, owner, 'BAD_USER_INPUT');
    }
    const badDate = await execute(updateTask, { id: task.id, input: { dueDate: 'tomorrow' } }, owner);
    assert.match(badDate.errors?.[0].message, /Expected an ISO 8601 date/);
    assert.deepEqual((await data(readTask, { id: task.id }, owner)).task, before);
  });

  await t.test('members and unrelated accounts cannot reach task reads or writes', async () => {
    const [member, outsider] = await Promise.all([account('Project member'), account('Outside account')]);
    const { inviteToProject: { token } } = await data(`mutation ($id: ID!, $email: String!) {
      inviteToProject(projectId: $id, email: $email) { token }
    }`, { id: project.id, email: member.email }, owner);
    await data('mutation ($token: String!) { acceptProjectInvite(token: $token) { id } }', { token }, member);
    const nested = 'query ($id: ID!) { project(id: $id) { tasks { id } } }';
    assert.deepEqual((await data(nested, { id: project.id }, member)).project.tasks, []);
    assert.equal((await data(nested, { id: project.id }, outsider)).project, null);

    for (const viewer of [member, outsider]) {
      assert.equal((await data(readTask, { id: task.id }, viewer)).task, null);
      assert.deepEqual((await data('{ tasks { id } }', {}, viewer)).tasks, []);
      await rejects(createTask, { input: { projectId: project.id, name: 'Unauthorized task' } }, viewer, 'NOT_FOUND');
      await rejects(updateTask, { id: task.id, input: { name: 'Unauthorized edit' } }, viewer, 'NOT_FOUND');
      await rejects(deleteTask, { id: task.id }, viewer, 'NOT_FOUND');
    }
    await rejects(updateTask, { id: task.id, input: { status: 'COMPLETED' } }, null, 'UNAUTHENTICATED');
  });

  await t.test('archived tasks remain readable and restore allows writing and deletion again', async () => {
    const archive = 'mutation ($id: ID!) { archiveProject(id: $id) { archivedAt } }';
    const restore = 'mutation ($id: ID!) { restoreProject(id: $id) { archivedAt } }';
    await data(archive, { id: project.id }, owner);
    assert.equal((await data(readTask, { id: task.id }, owner)).task.id, task.id);
    await rejects(createTask, { input: { projectId: project.id, name: 'Frozen task' } }, owner, 'PROJECT_ARCHIVED');
    await rejects(updateTask, { id: task.id, input: { status: 'BLOCKED' } }, owner, 'PROJECT_ARCHIVED');
    await rejects(deleteTask, { id: task.id }, owner, 'PROJECT_ARCHIVED');

    await data(restore, { id: project.id }, owner);
    assert.equal((await data(updateTask, { id: task.id, input: { status: 'BLOCKED' } }, owner)).updateTask.status, 'BLOCKED');
    const results = await Promise.all([execute(deleteTask, { id: task.id }, owner), execute(deleteTask, { id: task.id }, owner)]);
    assert.equal(results.filter(result => result.data?.deleteTask === true).length, 1);
    assert.equal(results.filter(result => result.errors?.[0].extensions.code === 'NOT_FOUND').length, 1);
    assert.equal((await data(readTask, { id: task.id }, owner)).task, null);
  });
});
