import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // The CLI never falls back to the application role. Generation can run without credentials.
  datasource: { url: process.env.DIRECT_DATABASE_URL },
});
