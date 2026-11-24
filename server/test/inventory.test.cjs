const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { ApolloServer } = require('@apollo/server');
const { createPrismaClient } = require('../dist/db');
const { resolvers } = require('../dist/graphql/resolvers');
const { typeDefs } = require('../dist/graphql/schema');
const { testDatabaseUrl } = require('./database-url.cjs');

const list = '{ inventory { id kind name onHand required shortfall } }';
const create = `mutation ($kind: InventoryKind!, $name: String!, $onHand: Int!) {
  createInventoryItem(kind: $kind, name: $name, onHand: $onHand) { id kind name onHand required shortfall }
}`;
const update = `mutation ($kind: InventoryKind!, $id: ID!, $name: String!, $onHand: Int!) {
  updateInventoryItem(kind: $kind, id: $id, name: $name, onHand: $onHand) { id onHand required shortfall }
}`;
const requireItem = `mutation ($projectId: ID!, $kind: InventoryKind!, $itemId: ID!, $quantity: Int!) {
  setProjectRequirement(projectId: $projectId, kind: $kind, itemId: $itemId, quantity: $quantity) { itemId kind name quantity }
}`;
const remove = `mutation ($projectId: ID!, $kind: InventoryKind!, $itemId: ID!) {
  removeProjectRequirement(projectId: $projectId, kind: $kind, itemId: $itemId)
}`;
const requirements = `query ($projectId: ID!) { projectRequirements(projectId: $projectId) { itemId kind quantity } }`;

function setup(t) {
  const prisma = createPrismaClient(testDatabaseUrl().toString());
  const apollo = new ApolloServer({ typeDefs, resolvers });
  const users = [];
  const legacyParts = [];
  t.after(async () => {
    try {
      await prisma.project.deleteMany({ where: { userId: { in: users } } });
      await prisma.part.deleteMany({ where: { OR: [{ userId: { in: users } }, { id: { in: legacyParts } }] } });
      await prisma.tool.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    } finally {
      await Promise.all([apollo.stop(), prisma.$disconnect()]);
    }
  });

  async function account(name) {
    const user = await prisma.user.create({
      data: { name, email: `${randomUUID()}@example.test`, emailVerified: true },
    });
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

  return { prisma, legacyParts, account, data, rejects };
}

test('catalog records are private to the owner and old unowned stock cannot be claimed', async t => {
  const { prisma, legacyParts, account, data, rejects } = setup(t);
  const [owner, stranger] = await Promise.all([account('Owner'), account('Stranger')]);
  const part = (await data(create, { kind: 'PART', name: ' Seals ', onHand: 4 }, owner)).createInventoryItem;
  const tool = (await data(create, { kind: 'TOOL', name: 'Wrench', onHand: 0 }, owner)).createInventoryItem;
  const legacy = await prisma.part.create({ data: { name: 'Legacy unowned part' } });
  legacyParts.push(legacy.id);
  assert.equal(part.name, 'Seals');
  assert.equal(part.shortfall, 0);
  assert.equal(tool.kind, 'TOOL');
  assert.deepEqual((await data(list, {}, owner)).inventory.map(({ id }) => id), [part.id, tool.id]);
  assert.deepEqual((await data(list, {}, stranger)).inventory, []);
  await rejects(list, {}, null, 'UNAUTHENTICATED');
  await rejects(update, { kind: 'PART', id: part.id, name: 'Stolen', onHand: 3 }, stranger, 'NOT_FOUND');
  await rejects(update, { kind: 'PART', id: legacy.id, name: 'Claimed', onHand: 3 }, owner, 'NOT_FOUND');
  await rejects(create, { kind: 'TOOL', name: 'Invalid stock', onHand: -1 }, owner, 'BAD_USER_INPUT');
  await rejects(update, { kind: 'TOOL', id: tool.id, name: 'Wrench', onHand: -1 }, owner, 'BAD_USER_INPUT');
});

test('stock shortfalls count active owned project requirements without consuming on-hand units', async t => {
  const { prisma, legacyParts, account, data, rejects } = setup(t);
  const [owner, stranger] = await Promise.all([account('Owner'), account('Stranger')]);
  const createProject = `mutation ($status: ProjectStatus!) {
    createProject(input: { name: "Window repair", status: $status }) { id }
  }`;
  const archive = 'mutation ($id: ID!) { archiveProject(id: $id) { id } }';
  const restore = 'mutation ($id: ID!) { restoreProject(id: $id) { id } }';
  const part = (await data(create, { kind: 'PART', name: 'Seals', onHand: 4 }, owner)).createInventoryItem;
  const tool = (await data(create, { kind: 'TOOL', name: 'Wrench', onHand: 1 }, owner)).createInventoryItem;
  const otherTool = (await data(create, { kind: 'TOOL', name: 'Private tool', onHand: 1 }, stranger)).createInventoryItem;
  const planned = (await data(createProject, { status: 'PLANNED' }, owner)).createProject.id;
  const held = (await data(createProject, { status: 'ON_HOLD' }, owner)).createProject.id;
  const otherProject = (await data(createProject, { status: 'PLANNED' }, stranger)).createProject.id;
  const partRequirement = { projectId: planned, kind: 'PART', itemId: part.id, quantity: 3 };
  const toolRequirement = { projectId: planned, kind: 'TOOL', itemId: tool.id, quantity: 2 };

  await rejects(requirements, { projectId: planned }, stranger, 'NOT_FOUND');
  await rejects(requireItem, { ...partRequirement, projectId: otherProject }, owner, 'NOT_FOUND');
  await rejects(requireItem, { ...partRequirement, quantity: 0 }, owner, 'BAD_USER_INPUT');
  await rejects(requireItem, { ...toolRequirement, itemId: otherTool.id }, owner, 'NOT_FOUND');
  await rejects(requireItem, { ...partRequirement, projectId: otherProject }, stranger, 'NOT_FOUND');
  assert.deepEqual((await data(requirements, { projectId: planned }, owner)).projectRequirements, []);

  await data(requireItem, partRequirement, owner);
  await data(requireItem, { ...partRequirement, projectId: held, quantity: 4 }, owner);
  await data(requireItem, toolRequirement, owner);
  for (const status of ['COMPLETED', 'CANCELLED']) {
    const { createProject: { id } } = await data(createProject, { status }, owner);
    await data(requireItem, { ...partRequirement, projectId: id, quantity: 99 }, owner);
  }

  // Legacy links and inconsistent cross-owner links must stay invisible at either side.
  const legacy = await prisma.part.create({ data: { name: 'Legacy', projects: { create: { projectId: planned, quantity: 88 } } } });
  legacyParts.push(legacy.id);
  await prisma.partProject.create({ data: { partId: part.id, projectId: otherProject, quantity: 77 } });
  await rejects(requireItem, { ...partRequirement, itemId: legacy.id }, owner, 'NOT_FOUND');
  assert.deepEqual((await data(requirements, { projectId: otherProject }, stranger)).projectRequirements, []);

  const stock = async () => (await data(list, {}, owner)).inventory.map(({ onHand, required, shortfall }) => [onHand, required, shortfall]);
  assert.deepEqual(await stock(), [[4, 7, 3], [1, 2, 1]]);
  const writes = await Promise.all([6, 8].map(quantity => data(requireItem, { ...partRequirement, quantity }, owner)));
  assert.deepEqual(writes.map(result => result.setProjectRequirement.quantity), [6, 8]);
  const current = (await data(requirements, { projectId: planned }, owner)).projectRequirements;
  assert.equal(current.length, 2);
  assert.ok([6, 8].includes(current.find(item => item.itemId === part.id).quantity));
  assert.equal((await data(requireItem, partRequirement, owner)).setProjectRequirement.quantity, 3);
  assert.deepEqual(await stock(), [[4, 7, 3], [1, 2, 1]]);

  await data(archive, { id: planned }, owner);
  await rejects(requireItem, partRequirement, owner, 'PROJECT_ARCHIVED');
  await rejects(remove, toolRequirement, owner, 'PROJECT_ARCHIVED');
  assert.equal((await data(requirements, { projectId: planned }, owner)).projectRequirements.length, 2);
  assert.deepEqual(await stock(), [[4, 4, 0], [1, 0, 0]]);
  await data(restore, { id: planned }, owner);
  assert.deepEqual(await stock(), [[4, 7, 3], [1, 2, 1]]);
  assert.equal((await data(remove, partRequirement, owner)).removeProjectRequirement, true);
  assert.equal((await data(remove, partRequirement, owner)).removeProjectRequirement, false);
  assert.equal((await data(remove, toolRequirement, owner)).removeProjectRequirement, true);
  const { updateInventoryItem } = await data(update, { kind: 'TOOL', id: tool.id, name: 'Wrench', onHand: 2 }, owner);
  assert.equal(updateInventoryItem.onHand, 2);
  await data(update, { kind: 'PART', id: part.id, name: 'Seal set', onHand: 3 }, owner);
  assert.deepEqual(await stock(), [[3, 4, 1], [2, 0, 0]]);

  // GraphQL Int limits each requirement; the aggregate can exceed that range.
  await data(requireItem, { ...partRequirement, quantity: 2_147_483_647 }, owner);
  assert.deepEqual(await stock(), [[3, 2_147_483_651, 2_147_483_648], [2, 0, 0]]);
});
