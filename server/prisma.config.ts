import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { publicDatabaseUrl } from './src/db-url';

const directUrl = process.env.DIRECT_DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // The CLI never falls back to the application role. Generation can run without credentials.
  datasource: { url: directUrl === undefined ? undefined : publicDatabaseUrl(directUrl, 'DIRECT_DATABASE_URL') },
});
