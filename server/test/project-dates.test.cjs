const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { ApolloServer } = require('@apollo/server');
const { createPrismaClient } = require('../dist/db');
const { resolvers } = require('../dist/graphql/resolvers');
const { typeDefs } = require('../dist/graphql/schema');
const { testDatabaseUrl } = require('./database-url.cjs');

const fields = 'id name startDate endDate';
const create = `mutation ($input: ProjectInput!) { createProject(input: $input) { ${fields} } }`;
const update = `mutation ($id: ID!, $input: ProjectUpdateInput!) { updateProject(id: $id, input: $input) { ${fields} } }`;
const read = `query ($id: ID!) { project(id: $id) { ${fields} } }`;
const early = '2030-02-03T00:00:00.000Z';
const later = '2030-02-04T00:00:00.000Z';

test('project dates validate effective owner edits while preserving legacy unrelated edits', async t => {
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
  async function account() {
    const user = await prisma.user.create({ data: { name: 'Date tester', email: `${randomUUID()}@example.test`, emailVerified: true } });
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
    assert.equal(result.errors?.[0]?.extensions.code, code, JSON.stringify(result));
  }
  const [owner, member, outsider] = await Promise.all([account(), account(), account()]);
  await rejects(create, { input: { name: 'Reversed', startDate: later, endDate: early } }, owner, 'BAD_USER_INPUT');
  const { createProject: project } = await data(create, { input: { name: 'Repair dates', startDate: early, endDate: later } }, owner);
  const id = project.id;
  await prisma.projectMember.create({ data: { projectId: id, userId: member.id } });
  // A one-field patch must be compared with the other persisted endpoint, not just this request.
  await rejects(update, { id, input: { startDate: '2030-02-05T00:00:00.000Z' } }, owner, 'BAD_USER_INPUT');
  await rejects(update, { id, input: { endDate: '2030-02-02T00:00:00.000Z' } }, owner, 'BAD_USER_INPUT');
  assert.deepEqual((await data(read, { id }, owner)).project, project);
  const equal = (await data(update, { id, input: { endDate: early } }, owner)).updateProject;
  assert.equal(equal.startDate, equal.endDate);
  const cleared = (await data(update, { id, input: { startDate: null, endDate: later } }, owner)).updateProject;
  assert.equal(cleared.startDate, null);
  assert.equal(cleared.endDate, later);
  const startOnly = (await data(update, { id, input: { startDate: later, endDate: null } }, owner)).updateProject;
  assert.equal(startOnly.startDate, later);
  assert.equal(startOnly.endDate, null);
  for (const user of [member, outsider]) await rejects(update, { id, input: { startDate: early } }, user, 'NOT_FOUND');
  await rejects(update, { id, input: { endDate: later } }, null, 'UNAUTHENTICATED');
  await data('mutation ($id: ID!) { archiveProject(id: $id) { id } }', { id }, owner);
  await rejects(update, { id, input: { endDate: later } }, owner, 'PROJECT_ARCHIVED');
  await data('mutation ($id: ID!) { restoreProject(id: $id) { id } }', { id }, owner);
  assert.equal((await data(update, { id, input: { endDate: later } }, owner)).updateProject.endDate, later);

  // Legacy reversed rows remain editable until the owner explicitly changes their date fields.
  const legacy = await prisma.project.create({ data: { userId: owner.id, name: 'Legacy', startDate: new Date(later), endDate: new Date(early) } });
  const renamed = (await data(update, { id: legacy.id, input: { name: 'Legacy renamed' } }, owner)).updateProject;
  assert.equal(renamed.startDate, later);
  assert.equal(renamed.endDate, early);
  await rejects(update, { id: legacy.id, input: { startDate: later } }, owner, 'BAD_USER_INPUT');
  assert.equal((await data(update, { id: legacy.id, input: { endDate: null } }, owner)).updateProject.endDate, null);
  for (const input of [{ startDate: early }, { endDate: later }, { startDate: null, endDate: null }]) {
    assert.ok((await data(create, { input: { name: 'Partial dates', ...input } }, owner)).createProject.id);
  }

  // Both patches fit the original range, but only one may survive once the other endpoint changes.
  const concurrent = (await data(create, { input: {
    name: 'Concurrent schedule', startDate: '2030-11-10T00:00:00.000Z', endDate: '2030-11-20T00:00:00.000Z',
  } }, owner)).createProject;
  const results = await Promise.all([
    execute(update, { id: concurrent.id, input: { startDate: '2030-11-18T00:00:00.000Z' } }, owner),
    execute(update, { id: concurrent.id, input: { endDate: '2030-11-12T00:00:00.000Z' } }, owner),
  ]);
  assert.deepEqual(results.map(result => result.errors?.[0]?.extensions.code ?? 'ACCEPTED').sort(), ['ACCEPTED', 'BAD_USER_INPUT']);
  const persisted = (await data(read, { id: concurrent.id }, owner)).project;
  assert.ok(Date.parse(persisted.startDate) <= Date.parse(persisted.endDate));
  assert.deepEqual(persisted, results.find(result => result.data?.updateProject).data.updateProject);
});
