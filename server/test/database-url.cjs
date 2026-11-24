function testDatabaseUrl() {
  const url = new URL(process.env.TEST_DATABASE_URL || 'file:///missing');
  // The PostgreSQL driver can override the parsed host or database with query parameters.
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
      || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      || !/^\/[a-zA-Z0-9_-]+_test$/.test(url.pathname)
      || url.search || url.hash) {
    throw new Error('Set TEST_DATABASE_URL to a migrated, disposable loopback PostgreSQL database ending in _test, with no query parameters');
  }
  return url;
}

module.exports = { testDatabaseUrl };
