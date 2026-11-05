import { application, config } from './index';

application.checkReadiness().then(() => {
  const server = application.app.listen(config.port, () => console.log(`GraphQL ready on port ${config.port}`));
  server.on('error', () => {
    console.error('HTTP listener failed to start');
    process.exitCode = 1;
    void application.prisma.$disconnect();
  });
  // Stop accepting requests and release the connection pool on a normal service shutdown.
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => server.close(() => {
      void application.apollo.stop().finally(() => application.prisma.$disconnect());
    }));
  }
}).catch(() => {
  console.error('Server is not ready. Check database connectivity and apply pending migrations.');
  process.exitCode = 1;
  void application.prisma.$disconnect();
});
