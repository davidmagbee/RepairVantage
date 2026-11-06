const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { setTimeout: delay } = require('node:timers/promises');
const { ApolloServer } = require('@apollo/server');
const { createPrismaClient } = require('../dist/db');
const { resolvers } = require('../dist/graphql/resolvers');
const { typeDefs } = require('../dist/graphql/schema');
const { testDatabaseUrl } = require('./database-url.cjs');

const create = 'mutation { createProject(input: { name: "Window repair", status: IN_PROGRESS }) { id archivedAt } }';
const archive = 'mutation ($id: ID!) { archiveProject(id: $id) { archivedAt status updatedAt } }';
const restore = 'mutation ($id: ID!) { restoreProject(id: $id) { archivedAt status updatedAt } }';
const update = 'mutation ($id: ID!) { updateProject(id: $id, input: { name: "New name" }) { name } }';
const createTask = 'mutation ($id: ID!) { createTask(input: { projectId: $id, name: "Order seals" }) { id } }';

function setup(t) {
  const prisma = createPrismaClient(testDatabaseUrl().toString());
  const apollo = new ApolloServer({ typeDefs, resolvers });
  const accounts = [];
  t.after(async () => {
    try {
      await prisma.project.deleteMany({ where: { userId: { in: accounts } } });
      await prisma.user.deleteMany({ where: { id: { in: accounts } } });
    } finally {
      await Promise.all([apollo.stop(), prisma.$disconnect()]);
    }
  });

  async function account(name) {
    const user = await prisma.user.create({
      data: { name, email: `${randomUUID()}@example.test`, emailVerified: true },
    });
    accounts.push(user.id);
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
    assert.equal(result.errors?.[0]?.extensions?.code, code, JSON.stringify(result));
  }

  return { prisma, account, data, rejects, execute };
}

test('only the owner can archive and restore a project without changing repair status', async t => {
  const { account, data, rejects } = setup(t);
  const [owner, stranger] = await Promise.all([account('Owner'), account('Stranger')]);
  const { createProject } = await data(create, {}, owner);
  const variables = { id: createProject.id };
  assert.equal(createProject.archivedAt, null);
  await rejects(archive, variables, stranger, 'NOT_FOUND');
  const { archiveProject } = await data(archive, variables, owner);
  assert.ok(Number.isFinite(Date.parse(archiveProject.archivedAt)));
  assert.equal(archiveProject.status, 'IN_PROGRESS');
  assert.deepEqual((await data(archive, variables, owner)).archiveProject, archiveProject);
  await rejects(update, variables, owner, 'PROJECT_ARCHIVED');
  await rejects(update, variables, stranger, 'NOT_FOUND');
  await rejects(restore, variables, stranger, 'NOT_FOUND');
  const { restoreProject } = await data(restore, variables, owner);
  assert.equal(restoreProject.archivedAt, null);
  assert.equal(restoreProject.status, 'IN_PROGRESS');
  assert.deepEqual((await data(restore, variables, owner)).restoreProject, restoreProject);
  assert.equal((await data(update, variables, owner)).updateProject.name, 'New name');
});

test('archival freezes content and new sharing while preserving read access and revocation', async t => {
  const { prisma, account, data, rejects } = setup(t);
  const [owner, member, invited, revoked, expired] = await Promise.all([
    account('Owner'), account('Member'), account('Invited'), account('Revoked'), account('Expired'),
  ]);
  const { createProject: { id } } = await data(create, {}, owner);
  const invite = `mutation ($id: ID!, $email: String!) {
    inviteToProject(projectId: $id, email: $email) { invite { id } token }
  }`;
  const accept = 'mutation ($token: String!) { acceptProjectInvite(token: $token) { id archivedAt } }';
  const comment = 'mutation ($id: ID!) { addProjectComment(projectId: $id, body: "Existing comment") { body } }';
  const publish = `mutation ($id: ID!) {
    publishProject(projectId: $id, title: "Repair Showcase", summary: "Only approved copy") { slug }
  }`;
  const readShowcase = 'query ($slug: String!) { showcaseProject(slug: $slug) { title status } }';
  const readProject = 'query ($id: ID!) { project(id: $id) { archivedAt comments { body } } }';
  const memberInvite = (await data(invite, { id, email: member.email }, owner)).inviteToProject;
  await data(accept, { token: memberInvite.token }, member);
  await data(comment, { id }, member);
  await data(createTask, { id }, owner);
  const pendingInvite = (await data(invite, { id, email: invited.email }, owner)).inviteToProject;
  const revokedInvite = (await data(invite, { id, email: revoked.email }, owner)).inviteToProject;
  const expiredInvite = (await data(invite, { id, email: expired.email }, owner)).inviteToProject;
  // Set up a previously issued invitation whose expiry has passed without waiting seven days.
  await prisma.projectInvite.update({ where: { id: expiredInvite.invite.id }, data: { expiresAt: new Date(0) } });
  const { publishProject: { slug } } = await data(publish, { id }, owner);

  const { archiveProject: { archivedAt } } = await data(archive, { id }, owner);
  await rejects(archive, { id }, member, 'NOT_FOUND');
  await rejects(restore, { id }, member, 'NOT_FOUND');
  await rejects(createTask, { id }, owner, 'PROJECT_ARCHIVED');
  await rejects(comment, { id }, owner, 'PROJECT_ARCHIVED');
  await rejects(comment, { id }, member, 'PROJECT_ARCHIVED');
  await rejects(comment, { id }, revoked, 'NOT_FOUND');
  await rejects(publish, { id }, owner, 'PROJECT_ARCHIVED');
  await rejects(invite, { id, email: revoked.email }, owner, 'PROJECT_ARCHIVED');
  await rejects('mutation ($id: ID!) { deleteProject(id: $id) }', { id }, owner, 'PROJECT_ARCHIVED');

  const { project: shared } = await data(readProject, { id }, member);
  assert.equal(shared.archivedAt, archivedAt);
  assert.equal(shared.comments[0].body, 'Existing comment');
  assert.equal((await data('{ sharedProjects { archivedAt } }', {}, member)).sharedProjects[0].archivedAt, archivedAt);
  const { showcaseProject } = await data(readShowcase, { slug }, null);
  assert.equal(showcaseProject.title, 'Repair Showcase');
  assert.equal(showcaseProject.status, 'IN_PROGRESS');

  assert.equal((await data(accept, { token: pendingInvite.token }, invited)).acceptProjectInvite.archivedAt, archivedAt);
  await rejects(comment, { id }, invited, 'PROJECT_ARCHIVED');
  const revoke = 'mutation ($id: ID!, $inviteId: ID!) { revokeProjectInvite(projectId: $id, id: $inviteId) }';
  assert.equal((await data(revoke, { id, inviteId: revokedInvite.invite.id }, owner)).revokeProjectInvite, true);
  await rejects(accept, { token: revokedInvite.token }, revoked, 'INVITE_UNAVAILABLE');
  await rejects(accept, { token: expiredInvite.token }, expired, 'INVITE_UNAVAILABLE');
  const remove = 'mutation ($id: ID!, $userId: ID!) { removeProjectMember(projectId: $id, userId: $userId) }';
  assert.equal((await data(remove, { id, userId: member.id }, owner)).removeProjectMember, true);
  assert.equal((await data(readProject, { id }, member)).project, null);
  const unpublish = 'mutation ($id: ID!) { unpublishProject(projectId: $id) }';
  assert.equal((await data(unpublish, { id }, owner)).unpublishProject, true);
  assert.equal((await data(readShowcase, { slug }, null)).showcaseProject, null);

  await data(restore, { id }, owner);
  await data(comment, { id }, invited);
  await data(createTask, { id }, owner);
  await data(invite, { id, email: revoked.email }, owner);
  assert.notEqual((await data(publish, { id }, owner)).publishProject.slug, slug);
});

test('archive and task creation honor both parent-lock orderings on PostgreSQL', async t => {
  const { prisma, account, data, execute } = setup(t);
  const owner = await account('Owner');

  async function waitForQueue(pid, expected) {
    // Observe the real lock queue, including indirect waiters, before releasing the test gate.
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const [{ count }] = await prisma.$queryRaw`
        WITH RECURSIVE queue(pid) AS (
          VALUES (${pid}::int)
          UNION
          SELECT session.pid FROM pg_stat_activity session
          JOIN queue blocker ON blocker.pid = ANY(pg_blocking_pids(session.pid))
          WHERE session.datname = current_database()
        )
        SELECT count(*)::int - 1 AS count FROM queue
      `;
      if (count >= expected) return;
      await delay(10);
    }
    assert.fail(`Expected ${expected} GraphQL writes waiting on the project lock`);
  }

  for (const archiveFirst of [true, false]) {
    const { createProject: { id } } = await data(create, {}, owner);
    const writes = [];
    let results;
    try {
      await prisma.$transaction(async gate => {
        const [{ pid }] = await gate.$queryRaw`
          SELECT pg_backend_pid() AS pid FROM "public"."Project" WHERE "id" = ${id} FOR UPDATE
        `;
        const order = archiveFirst ? [archive, createTask] : [createTask, archive];
        for (const [index, query] of order.entries()) {
          writes.push(execute(query, { id }, owner));
          await waitForQueue(pid, index + 1);
        }
      });
    } finally {
      results = await Promise.all(writes);
    }
    const [archiveResult, taskResult] = archiveFirst ? results : results.reverse();
    assert.ok(archiveResult.data?.archiveProject.archivedAt, JSON.stringify(archiveResult));
    if (archiveFirst) assert.equal(taskResult.errors?.[0]?.extensions?.code, 'PROJECT_ARCHIVED', JSON.stringify(taskResult));
    else assert.ok(taskResult.data?.createTask.id, JSON.stringify(taskResult));
    const { project } = await data('query ($id: ID!) { project(id: $id) { tasks { id } } }', { id }, owner);
    assert.equal(project.tasks.length, archiveFirst ? 0 : 1);
  }
});
