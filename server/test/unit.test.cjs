const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const { ApolloServer } = require('@apollo/server');
const { resolvers } = require('../dist/graphql/resolvers');
const { typeDefs } = require('../dist/graphql/schema');

const apollo = new ApolloServer({ typeDefs, resolvers });
after(() => apollo.stop());

async function operation(query, user = null) {
  // Fail if an unauthorized operation invokes persistence.
  const unexpectedQuery = () => assert.fail('Unauthorized operation reached persistence');
  const prisma = { user: { findUniqueOrThrow: unexpectedQuery }, project: { findUnique: unexpectedQuery, create: unexpectedQuery } };
  const { body } = await apollo.executeOperation({ query }, { contextValue: { user, prisma } });
  assert.equal(body.kind, 'single');
  return body.singleResult;
}

test('signed-out sessions cannot reach private reads or writes', async () => {
  const reads = await operation('{ me { id } }');
  const writes = await operation('mutation { createProject(input: {name: "test"}) { id } }');
  assert.equal(reads.errors[0].extensions.code, 'UNAUTHENTICATED');
  assert.equal(writes.errors[0].extensions.code, 'UNAUTHENTICATED');
});

test('unverified sessions cannot claim invitations or access projects', async () => {
  const user = { id: 'unverified', email: 'unverified@example.test', emailVerified: false };
  const reads = await operation('{ project(id: "private") { id } }', user);
  const writes = await operation('mutation { acceptProjectInvite(token: "unused") { id } }', user);
  assert.equal(reads.errors[0].extensions.code, 'FORBIDDEN');
  assert.equal(writes.errors[0].extensions.code, 'FORBIDDEN');
});

test('public lookups reject malformed slugs and have no list operation', async () => {
  const malformed = await operation('{ showcaseProject(slug: "private") { title } }');
  assert.equal(malformed.data.showcaseProject, null);
  const listing = await operation('{ showcaseProjects { title } }');
  assert.equal(listing.errors[0].extensions.code, 'GRAPHQL_VALIDATION_FAILED');
});
