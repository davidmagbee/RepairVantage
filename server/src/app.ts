import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { PrismaClient } from '@prisma/client';
import express, { ErrorRequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { readConfig } from './config';
import { Context, resolvers } from './graphql/resolvers';
import { typeDefs } from './graphql/schema';

type CodeSender = (email: string, code: string) => Promise<void>;

export function createApplication(config: ReturnType<typeof readConfig>, deliverCode?: CodeSender) {
  const prisma = new PrismaClient({ datasourceUrl: config.databaseUrl });
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.proxyHops);

  // Load the ESM identity module while keeping the Express app export synchronous.
  const identity = import('./identity.mjs').then(({ createIdentity }) => createIdentity(prisma, config, deliverCode));
  void identity.catch(() => console.error('Identity initialization failed'));

  const apollo = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    introspection: !config.production,
    persistedQueries: false,
    maxRecursiveSelections: 150,
    includeStacktraceInErrorResponses: false,
    formatError: error => error.extensions?.code === 'INTERNAL_SERVER_ERROR'
      ? { message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } }
      : error,
  });
  const started = apollo.start();
  // Serverless boot can be asynchronous. Routes wait for Apollo and return a 503 if boot fails.
  void started.catch(() => console.error('GraphQL initialization failed'));
  const middleware = started.then(() => expressMiddleware(apollo, {
    context: async ({ req }) => ({ prisma, user: await (await identity).principal(req.headers) }),
  }));
  void middleware.catch(() => { /* The request handler surfaces failed startup. */ });

  async function checkReadiness() {
    await Promise.all([started, identity]);
    // A connectivity probe alone would pass before the migrations have run.
    await Promise.all([
      prisma.user.findFirst({ select: { id: true } }),
      prisma.session.findFirst({ select: { id: true } }),
      prisma.project.findFirst({ select: { id: true } }),
      prisma.account.findFirst({ select: { id: true } }),
      prisma.verification.findFirst({ select: { id: true } }),
      prisma.rateLimit.findFirst({ select: { id: true } }),
      prisma.projectMember.findFirst({ select: { projectId: true } }),
      prisma.projectInvite.findFirst({ select: { id: true } }),
      prisma.projectShowcase.findFirst({ select: { slug: true } }),
      prisma.projectComment.findFirst({ select: { id: true } }),
    ]);
  }

  app.get('/health', (_req, res) => { res.set('Cache-Control', 'no-store').json({ status: 'ok' }); });
  app.get('/ready', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      await checkReadiness();
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  // Better Auth reads its own body. Only the application's auth routes are public.
  app.get('/api/auth/providers', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      res.json((await identity).providers);
    } catch {
      res.status(503).json({ error: 'Sign-in unavailable' });
    }
  });
  const authPaths = new Set([
    'GET /get-session', 'GET /callback/google', 'GET /error', 'POST /sign-in/social',
    'POST /email-otp/send-verification-otp', 'POST /sign-in/email-otp', 'POST /sign-out',
  ]);
  app.all('/api/auth/*', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!authPaths.has(`${req.method} ${req.path.slice('/api/auth'.length)}`)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    if (req.method === 'POST' && req.get('Origin') !== config.origin) {
      res.status(403).json({ error: 'Request origin is not allowed' });
      return;
    }
    // Replace the inbound value with the address resolved by the configured proxy trust boundary.
    req.headers['x-repairvantage-client-ip'] = req.ip;
    try {
      await (await identity).handle(req, res);
    } catch {
      if (!res.headersSent) res.status(503).json({ error: 'Sign-in unavailable' });
      else res.end();
    }
  });

  app.use('/graphql', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.set('Allow', 'POST').status(405).json({ error: 'Use POST for GraphQL' });
      return;
    }
    if (req.get('Origin') !== config.origin) {
      res.status(403).json({ error: 'Request origin is not allowed' });
      return;
    }
    if (!req.is('application/json')) {
      res.status(415).json({ error: 'Use application/json for GraphQL' });
      return;
    }
    next();
  }, rateLimit({
    windowMs: 60_000,
    limit: 90,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests' },
  }), express.json({ limit: '24kb' }), async (req, res, next) => {
    try {
      (await middleware)(req, res, next);
    } catch {
      res.status(503).json({ error: 'GraphQL unavailable' });
    }
  });

  const bodyError: ErrorRequestHandler = (error, _req, res, next) => {
    if (error.type === 'entity.too.large' || error.type === 'entity.parse.failed') {
      res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'Invalid request body' });
      return;
    }
    next(error);
  };
  app.use('/graphql', bodyError);
  return { app, apollo, prisma, checkReadiness, started };
}
