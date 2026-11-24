const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { ApolloServer } = require('@apollo/server');
const { createPrismaClient } = require('../dist/db');
const { resolvers } = require('../dist/graphql/resolvers');
const { typeDefs } = require('../dist/graphql/schema');
const { testDatabaseUrl } = require('./database-url.cjs');

const query = `{
  dashboardData {
    totalProjects completedProjects projectsByStatus { status count }
    recentProjects { id name updatedAt }
    upcomingDeadlines { id name dueDate project { id name } }
  }
}`;

test('dashboard summarizes unarchived owned projects and current active-project deadlines only', async t => {
  const prisma = createPrismaClient(testDatabaseUrl().toString());
  const apollo = new ApolloServer({ typeDefs, resolvers });
  const userIds = [];
  t.after(async () => {
    try {
      await prisma.project.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    } finally { await Promise.all([apollo.stop(), prisma.$disconnect()]); }
  });
  async function account(name) {
    const user = await prisma.user.create({ data: { name, email: `${randomUUID()}@example.test`, emailVerified: true } });
    userIds.push(user.id);
    return user;
  }
  async function execute(user) {
    const { body } = await apollo.executeOperation({ query }, { contextValue: { prisma, user } });
    assert.equal(body.kind, 'single');
    return body.singleResult;
  }
  async function data(user) {
    const result = await execute(user);
    assert.equal(result.errors, undefined, JSON.stringify(result.errors));
    return result.data.dashboardData;
  }
  const [owner, member, outsider] = await Promise.all([account('Owner'), account('Shared reader'), account('Outsider')]);
  const projects = [];
  const updatedAt = new Date('2025-01-01T00:00:00.000Z');
  for (const status of ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']) {
    projects.push(await prisma.project.create({ data: { name: status, userId: owner.id, status, updatedAt } }));
  }
  const archived = await prisma.project.create({ data: { name: 'Archived', userId: owner.id, archivedAt: new Date(), status: 'COMPLETED' } });
  const foreign = await prisma.project.create({ data: { name: 'Other owner', userId: outsider.id, members: { create: { userId: owner.id } } } });
  await prisma.projectMember.create({ data: { projectId: projects[0].id, userId: member.id } });
  const now = Date.now();
  const dueDate = new Date(now + 86_400_000);
  const first = await prisma.task.create({ data: { id: `a-${randomUUID()}`, name: 'First due', projectId: projects[0].id, dueDate } });
  const second = await prisma.task.create({ data: { id: `b-${randomUUID()}`, name: 'Second due', projectId: projects[1].id, dueDate, status: 'BLOCKED' } });
  for (const [projectId, name, date, status] of [
    [archived.id, 'Archived task', dueDate, 'TODO'],
    [projects[3].id, 'Completed project task', dueDate, 'TODO'],
    [projects[4].id, 'Cancelled project task', dueDate, 'TODO'],
    [projects[0].id, 'Completed task', dueDate, 'COMPLETED'],
    [projects[0].id, 'Overdue task', new Date(now - 86_400_000), 'TODO'],
    [projects[0].id, 'Beyond week', new Date(now + 8 * 86_400_000), 'TODO'],
    [foreign.id, 'Shared but not owned', dueDate, 'TODO'],
  ]) await prisma.task.create({ data: { projectId, name, dueDate: date, status } });

  const dashboard = await data(owner);
  assert.equal(dashboard.totalProjects, 5);
  assert.equal(dashboard.completedProjects, 1);
  assert.deepEqual(Object.fromEntries(dashboard.projectsByStatus.map(row => [row.status, row.count])), {
    PLANNED: 1, IN_PROGRESS: 1, ON_HOLD: 1, COMPLETED: 1, CANCELLED: 1,
  });
  assert.deepEqual(dashboard.upcomingDeadlines.map(task => task.id), [first.id, second.id]);
  assert.equal(dashboard.upcomingDeadlines[0].project.id, projects[0].id);
  assert.deepEqual(dashboard.recentProjects.map(project => project.id), projects.map(project => project.id).sort());
  assert.ok(dashboard.recentProjects.every(project => project.updatedAt === updatedAt.toISOString()));
  const sharedReader = await data(member);
  assert.deepEqual({ ...sharedReader }, { totalProjects: 0, completedProjects: 0, projectsByStatus: [], recentProjects: [], upcomingDeadlines: [] });
  const other = await data(outsider);
  assert.equal(other.totalProjects, 1);
  assert.equal(other.upcomingDeadlines[0].name, 'Shared but not owned');
  const denied = await execute(null);
  assert.equal(denied.errors?.[0]?.extensions.code, 'UNAUTHENTICATED');
  assert.equal(denied.data, null);
});
