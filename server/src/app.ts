import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import express, { ErrorRequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { readConfig } from './config';
import { createPrismaClient } from './db';
import { createEligibility, ELIGIBILITY_POLICY } from './eligibility';
import { Context, resolvers } from './graphql/resolvers';
import { typeDefs } from './graphql/schema';

type CodeSender = (email: string, code: string) => Promise<void>;

export function createApplication(config: ReturnType<typeof readConfig>, deliverCode?: CodeSender) {
  const prisma = createPrismaClient(config.databaseUrl);
  const eligibility = createEligibility(config);
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
      prisma.user.findFirst({ select: { id: true, eligibilityRestrictedAt: true } }),
      prisma.session.findFirst({ select: { id: true } }),
      prisma.project.findFirst({ select: { archivedAt: true } }),
      prisma.projectExpense.findFirst({ select: { id: true } }),
      prisma.account.findFirst({ select: { id: true } }),
      prisma.verification.findFirst({ select: { id: true } }),
      prisma.rateLimit.findFirst({ select: { id: true } }),
      prisma.otpThrottle.findFirst({ select: { key: true } }),
      prisma.eligibilityAcknowledgment.findFirst({ select: { id: true } }),
      prisma.projectMember.findFirst({ select: { projectId: true } }),
      prisma.projectInvite.findFirst({ select: { id: true } }),
      prisma.projectShowcase.findFirst({ select: { slug: true } }),
      prisma.projectComment.findFirst({ select: { id: true } }),
      prisma.part.findFirst({ select: { userId: true, onHand: true } }),
      prisma.tool.findFirst({ select: { userId: true, onHand: true } }),
    ]);
  }

  app.get('/health', (_req, res) => { res.set('Cache-Control', 'no-store').json({ status: 'ok' }); });
  app.get('/ready', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      await checkReadiness();
      const { google, emailOtp } = (await identity).providers;
      if (config.production && !google && !emailOtp) {
        res.status(503).json({ status: 'auth_setup_required' });
        return;
      }
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

  app.get('/api/eligibility/status', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const screen = eligibility.read(req.get('cookie'));
      const user = await (await identity).principal(req.headers);
      res.json({ ...ELIGIBILITY_POLICY, screened: screen?.eligible === true && !user?.eligibilityRestricted, blocked: screen?.eligible === false || user?.eligibilityRestricted === true, acknowledged: user?.eligibilityAcknowledged === true });
    } catch {
      res.status(503).json({ error: 'Account eligibility unavailable' });
    }
  });

  const eligibilityBody = [
    ((req, res, next) => {
      res.set('Cache-Control', 'no-store');
      if (req.get('Origin') !== config.origin) { res.status(403).json({ error: 'Request origin is not allowed' }); return; }
      if (!req.is('application/json')) { res.status(415).json({ error: 'Use application/json' }); return; }
      next();
    }) as express.RequestHandler,
    rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests' } }),
    express.json({ limit: '1kb' }),
  ];

  app.post('/api/eligibility/screen', ...eligibilityBody, async (req, res) => {
    // A rejected browser cannot immediately change its answer with Back or another API request.
    if (eligibility.read(req.get('cookie'))?.eligible === false) { res.status(403).json({ error: 'Account eligibility was not met' }); return; }
    const age = req.body?.age;
    if (!Number.isInteger(age) || age < 0 || age > 130 || Object.keys(req.body).some(key => key !== 'age')) {
      res.status(400).json({ error: 'Enter a valid age' }); return;
    }
    // Retain the browser rejection even if persistence fails; never issue an adult proof after an unsuccessful hold write.
    if (age < ELIGIBILITY_POLICY.minimumAge) eligibility.set(res, false);
    try {
      const user = await (await identity).principal(req.headers);
      if (user?.eligibilityRestricted) { res.status(403).json({ error: 'Account eligibility requires review' }); return; }
      if (age < ELIGIBILITY_POLICY.minimumAge && user) {
        // Unlike an anonymous browser cookie, an account's own declaration must survive cookie deletion and new sessions.
        await prisma.user.updateMany({ where: { id: user.id, eligibilityRestrictedAt: null }, data: { eligibilityRestrictedAt: new Date() } });
      }
      if (age < ELIGIBILITY_POLICY.minimumAge) { res.status(403).json({ error: 'Account eligibility was not met' }); return; }
      eligibility.set(res, true);
      res.status(204).end();
    } catch {
      res.status(503).json({ error: 'Account eligibility unavailable' });
    }
  });

  app.post('/api/eligibility/acknowledgment', ...eligibilityBody, async (req, res) => {
    try {
      const user = await (await identity).principal(req.headers);
      if (!user) { res.status(401).json({ error: 'Sign in to continue' }); return; }
      if (user.eligibilityRestricted || eligibility.read(req.get('cookie'))?.eligible === false) { res.status(403).json({ error: 'Account eligibility was not met' }); return; }
      if (req.body?.accepted !== true || req.body.policyVersion !== ELIGIBILITY_POLICY.policyVersion
          || Object.keys(req.body).some(key => !['accepted', 'policyVersion'].includes(key))) {
        res.status(400).json({ error: 'Acknowledge the current account eligibility statement' }); return;
      }
      // An empty update preserves the first server timestamp; no request can acknowledge another identity.
      await prisma.eligibilityAcknowledgment.upsert({
        where: { userId_policyVersion: { userId: user.id, policyVersion: ELIGIBILITY_POLICY.policyVersion } },
        create: { userId: user.id, policyVersion: ELIGIBILITY_POLICY.policyVersion, statement: ELIGIBILITY_POLICY.statement, source: 'ACCOUNT_ACKNOWLEDGMENT' },
        update: {},
      });
      res.status(204).end();
    } catch {
      res.status(503).json({ error: 'Account eligibility unavailable' });
    }
  });
  // Gate provider routes independently while retaining session reads and sign-out.
  const authPaths = new Map<string, 'google' | 'emailOtp' | null>([
    ['GET /get-session', null], ['GET /error', null], ['POST /sign-out', null],
    ['GET /callback/google', 'google'], ['POST /sign-in/social', 'google'],
    ['POST /email-otp/send-verification-otp', 'emailOtp'], ['POST /sign-in/email-otp', 'emailOtp'],
  ]);
  app.all('/api/auth/*', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const provider = authPaths.get(`${req.method} ${req.path.slice('/api/auth'.length)}`);
    if (provider === undefined) {
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
      const auth = await identity;
      if (provider && !auth.providers[provider]) {
        res.status(503).json({ error: 'This sign-in method is unavailable' });
        return;
      }
      await auth.handle(req, res);
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
  app.use('/api/eligibility', bodyError);
  return { app, apollo, prisma, checkReadiness, started };
}
