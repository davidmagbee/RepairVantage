const assert = require('node:assert/strict');
const { createHash, randomBytes, randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { ApolloServer } = require('@apollo/server');
const { createPrismaClient } = require('../dist/db');
const { resolvers } = require('../dist/graphql/resolvers');
const { typeDefs } = require('../dist/graphql/schema');
const { testDatabaseUrl } = require('./database-url.cjs');

const projectQuery = `query ($id: ID!) {
  project(id: $id) { id name description status priority notes budget canManage tasks { id } comments { body author { name } } }
}`;
const createProject = `mutation ($name: String!) {
  createProject(input: { name: $name, description: "Shared detail", notes: "Owner note", budget: 12 }) { id canManage }
}`;
const updateStatus = `mutation ($id: ID!) {
  updateProject(id: $id, input: { status: IN_PROGRESS }) { status }
}`;
const invite = `mutation ($id: ID!, $email: String!) {
  inviteToProject(projectId: $id, email: $email) { invite { id email } token }
}`;
const accept = `mutation ($token: String!) { acceptProjectInvite(token: $token) { id notes budget tasks { id } } }`;
const removeMember = `mutation ($id: ID!, $userId: ID!) {
  removeProjectMember(projectId: $id, userId: $userId)
}`;
const revokeInvite = `mutation ($id: ID!, $inviteId: ID!) {
  revokeProjectInvite(projectId: $id, id: $inviteId)
}`;
const listInvites = `query ($id: ID!) { projectInvites(projectId: $id) { id email } }`;
const listMembers = `query ($id: ID!) { projectMembers(projectId: $id) { user { id email } } }`;
const publish = `mutation ($id: ID!) {
  publishProject(projectId: $id, title: "Public title", summary: "Public summary") { slug title status }
}`;
const unpublish = `mutation ($id: ID!) { unpublishProject(projectId: $id) }`;
const showcase = `query ($slug: String!) {
  showcaseProject(slug: $slug) { slug title summary status publishedAt }
}`;
const comment = `mutation ($id: ID!) {
  addProjectComment(projectId: $id, body: " Member update ") { id body author { name } }
}`;

test('PostgreSQL owner, member, outsider, and anonymous GraphQL permissions', async t => {
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

  async function execute(query, variables, user = null) {
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

  const [owner, member, stranger] = await Promise.all([
    account('Project owner'), account('Invited reviewer'), account('Other account'),
  ]);
  const { createProject: project } = await data(createProject, { name: 'My repair' }, owner);
  const id = project.id;
  assert.equal(project.canManage, true);
  const { createProject: otherProject } = await data(createProject, { name: 'Other repair' }, stranger);

  await t.test('private reads, writes, task and dashboard ownership', async () => {
    await rejects(projectQuery, { id }, null, 'UNAUTHENTICATED');
    assert.equal((await data(projectQuery, { id }, stranger)).project, null);
    await rejects(updateStatus, { id }, stranger, 'NOT_FOUND');
    await rejects(comment, { id }, stranger, 'NOT_FOUND');
    await rejects(`mutation ($id: ID!) { deleteProject(id: $id) }`, { id }, stranger, 'NOT_FOUND');
    const taskMutation = `mutation ($id: ID!) { createTask(input: { projectId: $id, name: "Private task" }) { id } }`;
    await rejects(taskMutation, { id }, stranger, 'NOT_FOUND');
    const { createTask: task } = await data(taskMutation, { id }, owner);
    const owned = (await data(projectQuery, { id }, owner)).project;
    assert.equal(owned.notes, 'Owner note');
    assert.equal(owned.budget, 12);
    assert.equal(owned.tasks[0].id, task.id);
    assert.deepEqual((await data('{ tasks { id } }', {}, stranger)).tasks, []);
    assert.equal((await data('query ($id: ID!) { task(id: $id) { id } }', { id: task.id }, stranger)).task, null);
    const { projects, dashboardData } = await data(
      '{ projects { id } dashboardData { totalProjects projectsByStatus { status count } } }', {}, owner,
    );
    assert.deepEqual(projects.map(project => project.id), [id]);
    assert.equal(dashboardData.totalProjects, 1);
    assert.equal(dashboardData.projectsByStatus[0].count, 1);
    assert.notEqual(id, otherProject.id);
    await data(`mutation ($id: ID!) {
      updateProject(id: $id, input: { status: COMPLETED }) { status }
    }`, { id: otherProject.id }, stranger);
    const completed = '{ dashboardData { totalProjects completedProjects } }';
    for (const [account, completedProjects] of [[owner, 0], [stranger, 1]]) {
      const result = await data(completed, {}, account);
      assert.equal(result.dashboardData.totalProjects, 1);
      assert.equal(result.dashboardData.completedProjects, completedProjects);
    }
  });

  await t.test('task dates validate and upcoming work is visible only to the owner', async () => {
    const createTask = `mutation ($input: TaskInput!) {
      createTask(input: $input) { id dueDate project { id } }
    }`;
    const dueDate = new Date(Date.now() + 86_400_000).toISOString();
    const input = { projectId: id, name: 'Inspect the new part', dueDate };
    const { createTask: task } = await data(createTask, { input }, owner);
    assert.deepEqual({ dueDate: task.dueDate, projectId: task.project.id }, { dueDate, projectId: id });

    const dashboard = '{ dashboardData { upcomingDeadlines { id dueDate } } }';
    assert.equal((await data(dashboard, {}, owner)).dashboardData.upcomingDeadlines[0].id, task.id);
    assert.deepEqual((await data(dashboard, {}, stranger)).dashboardData.upcomingDeadlines, []);
    const literal = await data(`mutation ($id: ID!) {
      createTask(input: { projectId: $id, name: "Scheduled task", dueDate: ${JSON.stringify(dueDate)} }) { dueDate }
    }`, { id }, owner);
    assert.equal(literal.createTask.dueDate, dueDate);
    const malformed = await execute(createTask, { input: { ...input, dueDate: 'tomorrow' } }, owner);
    assert.match(malformed.errors[0].message, /Expected an ISO 8601 date/);
    const impossible = await execute(createTask, { input: { ...input, dueDate: '2026-19-03T00:00:00Z' } }, owner);
    assert.match(impossible.errors[0].message, /Invalid date and time/);
    const nonStringDate = await execute(`mutation ($id: ID!) {
      createTask(input: { projectId: $id, name: "Invalid", dueDate: 42 }) { id }
    }`, { id }, owner);
    assert.match(nonStringDate.errors[0].message, /Expected an ISO 8601 date/);
    await rejects(createTask, { input: { ...input, description: 'x'.repeat(2001) } }, owner, 'BAD_USER_INPUT');
    await rejects(createTask, { input: { ...input, status: null } }, owner, 'BAD_USER_INPUT');
  });

  await t.test('invalid sharing inputs cannot create an invitation, comment, or Showcase', async () => {
    for (const email of ['not-an-email', 'x'.repeat(250) + '@example.test', owner.email.toUpperCase()]) {
      await rejects(invite, { id, email }, owner, 'BAD_USER_INPUT');
    }
    await rejects(accept, { token: 'truncated-token' }, member, 'INVITE_UNAVAILABLE');
    await rejects(`mutation ($id: ID!) {
      addProjectComment(projectId: $id, body: " ") { id }
    }`, { id }, owner, 'BAD_USER_INPUT');
    await rejects(`mutation ($id: ID!, $title: String!) {
      publishProject(projectId: $id, title: $title, summary: "Summary") { slug }
    }`, { id, title: 'x'.repeat(121) }, owner, 'BAD_USER_INPUT');
    assert.equal((await data(listInvites, { id }, owner)).projectInvites.length, 0);
  });

  await t.test('expired, revoked, replaced, wrong-account and concurrent invitation claims', async () => {
    const issue = async () => (await data(invite, { id, email: member.email.toUpperCase() }, owner)).inviteToProject;
    await rejects(invite, { id, email: member.email }, stranger, 'NOT_FOUND');
    const expired = await issue();
    assert.equal(expired.invite.email, member.email);
    assert.match(expired.token, /^[\w-]{43}$/);
    await prisma.projectInvite.update({ where: { id: expired.invite.id }, data: { expiresAt: new Date(0) } });
    await rejects(accept, { token: expired.token }, member, 'INVITE_UNAVAILABLE');
    assert.equal((await data(listInvites, { id }, owner)).projectInvites.length, 0);

    const revoked = await issue();
    await rejects(revokeInvite, { id, inviteId: revoked.invite.id }, stranger, 'NOT_FOUND');
    assert.equal((await data(revokeInvite, { id, inviteId: revoked.invite.id }, owner)).revokeProjectInvite, true);
    await rejects(accept, { token: revoked.token }, member, 'INVITE_UNAVAILABLE');
    const old = await issue();
    const current = await issue();
    assert.notEqual(current.invite.id, old.invite.id);
    const active = (await data(listInvites, { id }, owner)).projectInvites;
    assert.deepEqual(active.map(({ id, email }) => ({ id, email })), [{ ...current.invite }]);
    assert.equal((await data(revokeInvite, { id, inviteId: old.invite.id }, owner)).revokeProjectInvite, false);
    assert.notEqual((await prisma.projectInvite.findUnique({ where: { id: current.invite.id } })).tokenHash, current.token);
    await rejects(accept, { token: old.token }, member, 'INVITE_UNAVAILABLE');
    await rejects(accept, { token: current.token }, stranger, 'INVITE_UNAVAILABLE');
    await rejects(accept, { token: current.token }, null, 'UNAUTHENTICATED');
    const attempts = await Promise.all([
      execute(accept, { token: current.token }, member),
      execute(accept, { token: current.token }, member),
    ]);
    assert.equal(attempts.filter(result => result.data?.acceptProjectInvite?.id === id).length, 1);
    assert.equal(attempts.filter(result => result.errors?.[0].extensions.code === 'INVITE_UNAVAILABLE').length, 1);
    const acceptedProject = attempts.find(result => result.data?.acceptProjectInvite)?.data.acceptProjectInvite;
    assert.equal(acceptedProject.notes, null);
    assert.equal(acceptedProject.budget, null);
    assert.deepEqual(acceptedProject.tasks, []);
  });

  await t.test('member reads status and comments without owner authority', async () => {
    const project = (await data(projectQuery, { id }, member)).project;
    assert.equal(project.canManage, false);
    assert.equal(project.description, 'Shared detail');
    assert.equal(project.notes, null);
    assert.equal(project.budget, null);
    assert.deepEqual(project.tasks, []);
    const shared = (await data('{ sharedProjects { id notes budget } }', {}, member)).sharedProjects;
    assert.deepEqual(shared.map(({ id, notes, budget }) => ({ id, notes, budget })), [{ id, notes: null, budget: null }]);
    await rejects(updateStatus, { id }, member, 'NOT_FOUND');
    await rejects(publish, { id }, member, 'NOT_FOUND');
    await rejects(listMembers, { id }, member, 'NOT_FOUND');
    await rejects(listInvites, { id }, member, 'NOT_FOUND');
    const members = (await data(listMembers, { id }, owner)).projectMembers;
    assert.deepEqual(members.map(({ user }) => ({ id: user.id, email: user.email })), [{ id: member.id, email: member.email }]);
    const { addProjectComment } = await data(comment, { id }, member);
    assert.equal(addProjectComment.body, 'Member update');
    assert.equal(addProjectComment.author.name, member.name);
    assert.equal((await data(projectQuery, { id }, owner)).project.comments[0].body, 'Member update');
  });

  await t.test('owners can edit and clear project details while members can only read them', async () => {
    const update = `mutation ($id: ID!, $input: ProjectUpdateInput!) {
      updateProject(id: $id, input: $input) { name description status }
    }`;
    const input = { name: '  Updated repair  ', description: 'The revised project scope.' };
    await rejects(update, { id, input }, null, 'UNAUTHENTICATED');
    await rejects(update, { id, input }, member, 'NOT_FOUND');
    await rejects(update, { id, input }, stranger, 'NOT_FOUND');
    const result = await data(update, { id, input }, owner);
    assert.equal(result.updateProject.name, 'Updated repair');
    assert.equal(result.updateProject.description, input.description);
    assert.equal(result.updateProject.status, 'PLANNED');
    assert.equal((await data(projectQuery, { id }, member)).project.description, input.description);

    for (const invalid of [
      { name: ' ' }, { name: null }, { description: 'x'.repeat(2001) }, { notes: 'x'.repeat(5001) },
      { budget: -1 }, { status: null }, { priority: null },
    ]) {
      await rejects(update, { id, input: invalid }, owner, 'BAD_USER_INPUT');
    }
    await data(update, { id, input: { description: null } }, owner);
    const reopened = (await data(projectQuery, { id }, owner)).project;
    assert.equal(reopened.name, 'Updated repair');
    assert.equal(reopened.description, null);
  });

  await t.test('owners can update priority independently of status', async () => {
    const update = `mutation ($id: ID!, $priority: Priority!) {
      updateProject(id: $id, input: { priority: $priority }) { priority status }
    }`;
    const before = (await data(projectQuery, { id }, owner)).project;
    assert.equal(before.priority, 'MEDIUM');

    // The same owner check protects priority even when a member calls GraphQL directly.
    const variables = { id, priority: 'CRITICAL' };
    await rejects(update, variables, null, 'UNAUTHENTICATED');
    await rejects(update, variables, member, 'NOT_FOUND');
    await rejects(update, variables, stranger, 'NOT_FOUND');
    assert.equal((await data(projectQuery, { id }, owner)).project.priority, 'MEDIUM');

    const { updateProject } = await data(update, variables, owner);
    assert.deepEqual({ ...updateProject }, { priority: 'CRITICAL', status: before.status });
    const shared = (await data(projectQuery, { id }, member)).project;
    assert.equal(shared.priority, 'CRITICAL');
    assert.equal(shared.status, before.status);
  });

  await t.test('unlisted Showcase reflects status and stays separate from private data', async () => {
    const { publishProject: publicProject } = await data(publish, { id }, owner);
    assert.match(publicProject.slug, /^[\w-]{32}$/);
    assert.notEqual(publicProject.slug, id);
    const projectWithShowcase = 'query ($id: ID!) { project(id: $id) { showcase { slug } } }';
    assert.equal((await data(projectWithShowcase, { id }, member)).project.showcase, null);
    assert.equal((await data(projectWithShowcase, { id }, owner)).project.showcase.slug, publicProject.slug);
    assert.equal((await data(showcase, { slug: id }, null)).showcaseProject, null);
    assert.equal((await data(updateStatus, { id }, owner)).updateProject.status, 'IN_PROGRESS');
    const { showcaseProject } = await data(showcase, { slug: publicProject.slug }, null);
    assert.equal(showcaseProject.title, 'Public title');
    assert.equal(showcaseProject.summary, 'Public summary');
    assert.equal(showcaseProject.status, 'IN_PROGRESS');
    await rejects(
      'query ($slug: String!) { showcaseProject(slug: $slug) { comments { body } } }',
      { slug: publicProject.slug }, null, 'GRAPHQL_VALIDATION_FAILED',
    );
    assert.equal((await data(unpublish, { id }, owner)).unpublishProject, true);
    assert.equal((await data(showcase, { slug: publicProject.slug }, null)).showcaseProject, null);
    const republished = (await data(publish, { id }, owner)).publishProject;
    assert.notEqual(republished.slug, publicProject.slug);
  });

  await t.test('membership removal ends read and comment access', async () => {
    await rejects(invite, { id, email: member.email }, owner, 'BAD_USER_INPUT');
    await rejects(removeMember, { id, userId: member.id }, stranger, 'NOT_FOUND');
    assert.equal((await data(removeMember, { id, userId: stranger.id }, owner)).removeProjectMember, false);
    // Simulate a stale link left by older behavior, then race redemption against removal.
    const token = randomBytes(32).toString('base64url');
    await prisma.projectInvite.create({
      data: {
        projectId: id,
        email: member.email,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const [removal, redemption] = await Promise.all([
      data(removeMember, { id, userId: member.id }, owner),
      execute(accept, { token }, member),
    ]);
    assert.equal(removal.removeProjectMember, true);
    assert.ok(redemption.data?.acceptProjectInvite?.id === id
      || redemption.errors?.[0].extensions.code === 'INVITE_UNAVAILABLE', JSON.stringify(redemption));
    assert.equal((await data(projectQuery, { id }, member)).project, null);
    await rejects(comment, { id }, member, 'NOT_FOUND');
    await rejects(accept, { token }, member, 'INVITE_UNAVAILABLE');
  });

  await t.test('owner deletion removes both the workspace project and its public link', async () => {
    const { project: published } = await data('query ($id: ID!) { project(id: $id) { showcase { slug } } }', { id }, owner);
    assert.ok(published.showcase?.slug);
    const deleted = await data('mutation ($id: ID!) { deleteProject(id: $id) }', { id }, owner);
    assert.equal(deleted.deleteProject, true);
    assert.equal((await data(projectQuery, { id }, owner)).project, null);
    assert.equal((await data(showcase, { slug: published.showcase.slug }, null)).showcaseProject, null);
  });
});
